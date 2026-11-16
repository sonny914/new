// Recursion guard. A recap must never cause another recap. Three layers:
//  1. Environment: every capture process runs with QB_CAPTURE_ACTIVE=1; the SessionEnd hook exits at once if it sees it.
//  2. Content: turns that only run the capture system (its CLI, its archive, its narration calls) are classified
//     'capture-run' and excluded from the story; a session with nothing else has evidence level 'none' and gets no recap.
//  3. Ledger: docs/sessions/index.json records each captured session and the transcript hash it was built from,
//     so the hook never re-captures the same session, and a lock stops two captures running at once.
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ARCHIVE, CACHE, readJSONIf, writeJSON } from './util.mjs';

export const ENV_FLAG = 'QB_CAPTURE_ACTIVE';
const CAPTURE_PROMPT = /^\s*\/(qb-capture|recap)\b/i;
const CAPTURE_CMD = /tools\/capture\/(cli|hook)\.mjs|npm run capture\b/;
const ARCHIVE_PATH = /(^|\/)docs\/sessions\//;
const NEUTRAL_TOOLS = /^(Read|Glob|Grep|ToolSearch|SendUserFile|TaskCreate|TaskUpdate|TaskList|TaskGet|Skill|AskUserQuestion|mcp__Higgsfield__.*)$/;
const NEUTRAL_BASH = /^\s*(ls|cat|head|tail|wc|file|ffprobe|du|git (status|log|diff|show|branch))\b/;

export const isCaptureTool = (t) => CAPTURE_CMD.test(t.input?.command ?? '') || ARCHIVE_PATH.test(t.input?.file_path ?? '')
  || (t.name === 'Bash' && ARCHIVE_PATH.test(t.input?.command ?? '') && /\bgit (add|commit)\b/.test(t.input?.command ?? ''));
const isNeutralTool = (t) => NEUTRAL_TOOLS.test(t.name) || (t.name === 'Bash' && NEUTRAL_BASH.test(t.input?.command ?? ''));

// 'capture-run' when a turn (or a lone tool event) is the capture system processing a session; otherwise 'work'.
export function classify({ prompt = '', tools = [] }) {
  if (CAPTURE_PROMPT.test(prompt)) return 'capture-run';
  const cap = tools.filter(isCaptureTool);
  if (cap.length && tools.every((t) => isCaptureTool(t) || isNeutralTool(t))) return 'capture-run';
  return 'work';
}

export const INDEX = join(ARCHIVE, 'index.json');
export const readIndex = () => readJSONIf(INDEX, { schema: 'qb-capture/index@1', sessions: {} });

export function shouldCapture({ env = process.env, sessionId, transcriptSha, index = readIndex() }) {
  if (env[ENV_FLAG] === '1') return { ok: false, reason: 'already inside a capture run' };
  if (env.QB_CAPTURE_AUTO === 'off') return { ok: false, reason: 'QB_CAPTURE_AUTO=off' };
  if (!sessionId) return { ok: false, reason: 'no session id' };
  const prior = Object.values(index.sessions).find((s) => s.session_id === sessionId);
  if (prior && transcriptSha && prior.transcript_sha === transcriptSha) return { ok: false, reason: `already captured as ${prior.key}` };
  if (isLocked()) return { ok: false, reason: 'another capture is running' };
  return { ok: true };
}

const LOCK = join(CACHE, 'capture.lock');
export function isLocked() {
  if (!existsSync(LOCK)) return false;
  const pid = +readFileSync(LOCK, 'utf8');
  try { process.kill(pid, 0); return pid !== process.pid; } catch { rmSync(LOCK, { force: true }); return false; }
}
export function lock() { mkdirSync(dirname(LOCK), { recursive: true }); writeFileSync(LOCK, String(process.pid)); process.on('exit', unlock); }
export function unlock() { try { if (existsSync(LOCK) && +readFileSync(LOCK, 'utf8') === process.pid) rmSync(LOCK); } catch {} }

export function recordIndex(entry) {
  const idx = readIndex();
  idx.sessions[entry.key] = { ...(idx.sessions[entry.key] ?? {}), ...entry, updated_at: new Date().toISOString() };
  writeJSON(INDEX, idx);
  return idx;
}
