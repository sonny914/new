#!/usr/bin/env node
// SessionEnd hook. Claude Code passes { session_id, transcript_path, cwd, reason } on stdin.
// It never blocks the session from closing: it checks the recursion guard, then starts the capture
// detached (finalize → evidence → story → storyboard → silent preview) and exits.
// Opt out with QB_CAPTURE_AUTO=off. Logs go to tools/capture/.cache/hook.log.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE, CAPTURE, sha256File } from './lib/util.mjs';
import { ENV_FLAG, shouldCapture } from './lib/guard.mjs';

mkdirSync(CACHE, { recursive: true });
const log = (m) => appendFileSync(join(CACHE, 'hook.log'), `${new Date().toISOString()} ${m}\n`);

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let input = {};
try { input = JSON.parse(raw || '{}'); } catch { log('bad hook payload'); process.exit(0); }

const { session_id: sessionId, transcript_path: transcript, reason } = input;
if (!transcript || !existsSync(transcript)) { log(`${sessionId}: no transcript, skipped`); process.exit(0); }
const verdict = shouldCapture({ sessionId, transcriptSha: sha256File(transcript) });
if (!verdict.ok) { log(`${sessionId}: skipped (${verdict.reason})`); process.exit(0); }

const out = openSync(join(CACHE, `hook-${sessionId}.log`), 'a');
const child = spawn(process.execPath, [join(CAPTURE, 'cli.mjs'), 'run', '--transcript', transcript, ...(process.env.QB_CAPTURE_HOOK_ARGS ?? '').split(' ').filter(Boolean)],
  { detached: true, stdio: ['ignore', out, out], env: { ...process.env, [ENV_FLAG]: '1' } });
child.unref();
log(`${sessionId}: capture started (pid ${child.pid}, session ended: ${reason ?? 'unknown'})`);
