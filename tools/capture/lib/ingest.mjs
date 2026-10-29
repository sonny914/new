// Ingest: turn a finished Claude Code session into raw, citable records.
// Sources: the native transcript (.jsonl, what a SessionEnd hook receives), a claude-code-remote export
// (for cloud sessions whose container is gone), git commits that carry the session's Claude-Session
// trailer, and the GitHub pull requests those commits belong to (public API, cached for offline re-runs).
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { git, readJSON, readJSONIf, writeJSON } from './util.mjs';

const SYSTEM_TEXT = /^\s*<(system-reminder|local-command|command-(name|message|args)|bash-(input|stdout|stderr)|task-notification|user-prompt-submit-hook)/;

// Text a person typed: injected system blocks dropped, pasted-content wrappers unwrapped.
const textOf = (content) => (typeof content === 'string' ? (SYSTEM_TEXT.test(content) ? '' : content)
  : Array.isArray(content) ? content.filter((b) => b?.type === 'text' && !SYSTEM_TEXT.test(b.text)).map((b) => b.text).join('\n') : '')
  .replace(/<\/?pasted_content[^>]*>/g, '').trim();

// Privacy: home folders become ~, and only the tool output that becomes evidence is kept (see buildEvents).
export const redact = (s) => String(s ?? '').replace(/[A-Za-z]:\\Users\\[^\\\s"']+/g, '~').replace(/\/c\/Users\/[^/\s"']+/g, '~').replace(/\/(home|Users)\/[^/\s"']+/g, '~')
  .replace(/^([-dlcbps][rwxsStT-]{9}\S*\s+\d+\s+)\S+(\s+)\S+/gm, '$1user$2group'); // `ls -l` owner and group

// ---- native transcript -------------------------------------------------------------------------
export function fromTranscript(path) {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  return parseLines(lines, { source: 'transcript', transcript: path });
}

// ---- claude-code-remote raw events (list_events output saved to a file) --------------------------
// Works for any session the account can read, including Remote Control sessions on the founder's own computer.
export function fromCcrEvents(path, meta = {}) {
  const raw = readFileSync(path, 'utf8');
  const body = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const data = (body.ccr ?? body).data ?? [];
  const results = new Map();
  const lines = [];
  for (const e of data) {
    const kind = Object.keys(e).find((k) => k !== 'created_at'), v = e[kind] ?? {};
    const inner = v.internal_anthropic_catchall ?? {};
    if (kind === 'result' && inner.user_message_uuid) results.set(inner.user_message_uuid, inner.num_turns ?? null);
    const message = inner.message ?? v.message;
    if ((kind === 'user' || kind === 'assistant') && message) lines.push({ type: kind, uuid: v.uuid, timestamp: e.created_at, message, sessionId: meta.id, clientPlatform: inner.client_platform });
  }
  const out = parseLines(lines, { ...meta, source: 'ccr-events', export: path });
  for (const t of out.turns) if (t.result && results.get(t.prompt.uuid) != null) t.result.num_turns = results.get(t.prompt.uuid);
  return out;
}

function parseLines(lines, meta) {
  const session = { id: null, title: null, created_at: null, updated_at: null, ...meta };
  const turns = [], tools = [], byToolId = new Map();
  let cur = null;
  for (const e of lines) {
    session.id ??= e.sessionId;
    if (e.type === 'ai-title' && e.aiTitle) session.title = e.aiTitle;
    if (!e.timestamp || e.isSidechain === true || e.isMeta === true) continue;
    session.created_at ??= e.timestamp;
    session.updated_at = e.timestamp;
    const content = e.message?.content;
    if (e.type === 'user') {
      if (Array.isArray(content) && content.some((b) => b?.type === 'tool_result')) {
        for (const b of content.filter((b) => b?.type === 'tool_result')) {
          const tool = byToolId.get(b.tool_use_id);
          if (!tool) continue;
          const out = typeof b.content === 'string' ? b.content : textOf(b.content);
          tool.is_error = !!b.is_error;
          tool.output = redact(out.length > 1600 ? out.slice(0, 800) + '\n…\n' + out.slice(-800) : out);
        }
        continue;
      }
      const text = redact(textOf(content));
      if (!text) continue;
      cur = { prompt: { uuid: e.uuid, created_at: e.timestamp, platform: e.clientPlatform ?? null, text }, result: null, steps: 0 };
      turns.push(cur);
    } else if (e.type === 'assistant' && cur && Array.isArray(content)) {
      for (const b of content) {
        if (b.type === 'text' && b.text.trim()) cur.result = { uuid: e.uuid, created_at: e.timestamp, text: redact(b.text) };
        if (b.type === 'tool_use') {
          cur.steps++;
          const tool = { id: b.id, uuid: e.uuid, t: e.timestamp, turn: turns.length - 1, name: b.name, input: summarizeInput(b.name, b.input) };
          tools.push(tool); byToolId.set(b.id, tool);
        }
      }
    }
  }
  for (const t of turns) {
    if (t.result) { t.result.num_turns = t.steps; t.result.duration_ms = Date.parse(t.result.created_at) - Date.parse(t.prompt.created_at); }
    delete t.steps;
  }
  session.id ??= meta.id;
  return { session, turns, tools };
}

function summarizeInput(name, input = {}) {
  if (name === 'Bash') return { command: redact(String(input.command ?? '').slice(0, 900)), description: input.description ?? null };
  if (Array.isArray(input.files)) return { files: input.files.map(redact), caption: input.caption ?? null };
  if (input.ask || input.question) return { ask: redact(input.ask ?? input.question), recap: input.recap ? redact(input.recap) : null };
  if (input.file_path) return { file_path: redact(input.file_path) };
  if (input.path || input.pattern) return { path: input.path ? redact(input.path) : null, pattern: input.pattern ?? null };
  return { keys: Object.keys(input).slice(0, 8) };
}

// ---- claude-code-remote export ----------------------------------------------------------------
export function fromCcrExport(path) {
  const x = readJSON(path);
  if (!/^qb-capture\/ccr-export@[12]$/.test(x.format)) throw new Error(`${path}: not a qb-capture/ccr-export file`);
  return { session: { ...x.session, source: 'ccr-export', export: path }, turns: x.turns, tools: x.tools ?? [] };
}

// ---- git ---------------------------------------------------------------------------------------
export function repoSlug(repo) {
  try {
    const url = git(repo, 'remote', 'get-url', 'origin');
    const m = url.replace(/\.git$/, '').match(/([^/:]+)\/([^/]+)$/);
    return m ? `${m[1]}/${m[2]}` : null;
  } catch { return null; }
}

// The ids one session goes by. A cloud session's local transcript id differs from the remote id that
// commit trailers carry (claude.ai/code/session_<id>); the remote one is in CLAUDE_CODE_REMOTE_SDK_URL (…/cse_<id>).
export function sessionAliases(session, env = process.env) {
  const ids = new Set([String(session.id).replace(/^session_/, '')]);
  if (session.remote_id) ids.add(String(session.remote_id).replace(/^(session|cse)_/, ''));
  const m = String(env.CLAUDE_CODE_REMOTE_SDK_URL ?? '').match(/\/cse_([A-Za-z0-9]+)$/);
  if (m && session.source === 'transcript' && env.CLAUDE_CODE_SESSION_ID === session.id) ids.add(m[1]);
  return [...ids];
}

// Commits made in this session: only the Claude-Session trailer counts. A message that merely mentions the id
// (a recap commit naming the session it documents, say) is not that session's work.
export function sessionCommits(repo, sessionId) {
  const needles = (Array.isArray(sessionId) ? sessionId : [sessionId]).map((s) => String(s).replace(/^session_/, ''));
  const raw = git(repo, 'log', '--all', '--reverse', '-E', ...needles.map((n) => `--grep=^Claude-Session: .*${n}\\s*$`), '--format=%H%x1f%P%x1f%aI%x1f%cI%x1f%s%x1f%b%x1e');
  const commits = raw.split('\x1e').map((r) => r.trim()).filter(Boolean).map((r) => {
    const [sha, parents, authored, committed, subject, body] = r.split('\x1f');
    return { sha, parents: parents.split(' ').filter(Boolean), authored_at: authored, committed_at: committed, subject, body: body.trim(), files: fileChanges(repo, sha) };
  });
  const shas = new Set(commits.map((c) => c.sha));
  // merges that brought a session commit into another line (second parent is a session commit)
  const merges = git(repo, 'log', '--all', '--merges', '--format=%H%x1f%P%x1f%cI%x1f%s%x1e').split('\x1e').map((r) => r.trim()).filter(Boolean)
    .map((r) => { const [sha, parents, committed, subject] = r.split('\x1f'); return { sha, parents: parents.split(' '), committed_at: committed, subject }; })
    .filter((m) => shas.has(m.parents[1]))
    .sort((a, b) => Date.parse(a.committed_at) - Date.parse(b.committed_at));
  return { commits, merges };
}

function fileChanges(repo, sha) {
  const numstat = git(repo, 'show', '--numstat', '--format=', '--no-renames', sha).split('\n').filter(Boolean);
  const status = new Map(git(repo, 'show', '--name-status', '--format=', '--no-renames', sha).split('\n').filter(Boolean).map((l) => { const [s, p] = l.split('\t'); return [p, s]; }));
  return numstat.map((l) => {
    const [a, d, path] = l.split('\t');
    const binary = a === '-';
    const st = status.get(path) ?? 'M';
    const f = { path, status: st, binary, added: binary ? 0 : +a, deleted: binary ? 0 : +d };
    if (binary) {
      try { f.bytes = +git(repo, 'cat-file', '-s', `${st === 'D' ? sha + '^' : sha}:${path}`); } catch {}
    }
    return f;
  });
}

// ---- GitHub (public REST API through curl, so the environment's proxy settings apply) ----------
function ghGet(path) {
  const out = execFileSync('curl', ['-sS', '--fail', '--max-time', '20', '-H', 'Accept: application/vnd.github+json', `https://api.github.com${path}`], { encoding: 'utf8', maxBuffer: 32 << 20 });
  return JSON.parse(out);
}

export function githubPulls(slug, shas, cacheFile, { offline = false } = {}) {
  const cache = readJSONIf(cacheFile, { fetched_at: null, pulls: {} });
  const missing = shas.filter((s) => !Object.values(cache.pulls).some((p) => p.commits?.includes(s)));
  if (missing.length && !offline && slug) {
    for (const sha of missing) {
      let list = [];
      try { list = ghGet(`/repos/${slug}/commits/${sha}/pulls`); } catch (e) { cache.error = String(e.message).slice(0, 300); continue; }
      for (const pr of list) {
        const full = cache.pulls[pr.number] ?? (() => { const p = ghGet(`/repos/${slug}/pulls/${pr.number}`); return {
          number: p.number, url: p.html_url, title: p.title, body: p.body ?? '', state: p.state, draft: p.draft, created_at: p.created_at,
          merged_at: p.merged_at, closed_at: p.closed_at, merge_commit_sha: p.merge_commit_sha, head: p.head?.ref, base: p.base?.ref,
          additions: p.additions, deletions: p.deletions, changed_files: p.changed_files, commit_count: p.commits, commits: [] }; })();
        if (!full.commits.includes(sha)) full.commits.push(sha);
        cache.pulls[pr.number] = full;
      }
    }
    cache.fetched_at = new Date().toISOString();
    cache.repo = slug;
    writeJSON(cacheFile, cache);
  }
  return Object.values(cache.pulls).sort((a, b) => a.number - b.number);
}

export const hasFile = (p) => !!p && existsSync(p);
