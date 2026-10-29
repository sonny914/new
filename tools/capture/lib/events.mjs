// Normalise ingested records into session-events.json: one time-ordered list of citable events,
// each with refs back to its source, plus the metrics that on-screen numbers are allowed to use.
import { round } from './util.mjs';
import { classify } from './guard.mjs';

const OBSTACLE_PROMPT = /^(why|how come)\b|\bnot (available|working|showing|live|there|loading)\b|\bbroken\b|\bmissing\b|\bcan'?t (find|see)\b|\bstill (not|no|broken)\b|\bdoesn'?t (work|show|load)\b/i;
const APPROVAL_PROMPT = /^(yes|yep|yeah|ok(ay)?|do it|go( ahead)?|sure|ship it|merge it|approved?)\W*$/i;
const MISTAKE = /\bmistakes? of mine\b|\bmy mistake\b|\bby mistake\b|\baccidentally\b|\bmy fault\b|\bshouldn'?t have\b/i;
const LIMITATION = /\bblocks?\b|\bblocked\b|\bcouldn'?t\b|\bcould not\b|\bunable to\b|\bnothing has been checked\b|\bnot been (checked|verified)\b/i;
const FIX_COMMIT = /^(fix|remove|revert|correct|undo|restore)\b/i;
const MEDIA = /\.(mp4|mov|webm|gif|png|jpe?g|webp)$/i;
const PAGE = /(^|\/)index\.html$|\.html$/i;

export function buildEvents({ session, turns, tools, git: g, pulls, repo, repoSlug }) {
  const src = session.source === 'ccr-export' ? 'ccr' : 'transcript';
  const ev = [];
  const push = (e) => { ev.push({ tags: [], data: {}, ...e }); return ev[ev.length - 1]; };

  turns.forEach((turn, i) => {
    const p = turn.prompt, r = turn.result;
    const ptags = [];
    if (OBSTACLE_PROMPT.test(p.text.trim())) ptags.push('obstacle');
    if (APPROVAL_PROMPT.test(p.text.trim())) ptags.push('approval');
    const turnTools = tools.filter((t) => t.turn === i);
    const kind = classify({ prompt: p.text, tools: turnTools });
    if (kind !== 'work') ptags.push(kind);
    push({ t: p.created_at, kind: 'prompt', actor: 'founder', turn: i, text: p.text, refs: [`${src}:${p.uuid}`], tags: ptags, data: { platform: p.platform ?? null } });
    if (r) {
      const rtags = [];
      if (MISTAKE.test(r.text)) rtags.push('mistake');
      if (LIMITATION.test(r.text)) rtags.push('limitation');
      if (kind !== 'work') rtags.push(kind);
      push({ t: r.created_at, kind: 'reply', actor: 'claude', turn: i, text: r.text, refs: [`${src}:${r.uuid}`], tags: rtags,
        data: { num_turns: r.num_turns ?? null, duration_ms: r.duration_ms ?? null } });
    }
  });

  for (const t of tools) {
    const out = t.output ?? '';
    const tests = out.match(/(?:^|\n)\s*#?\s*pass\s+(\d+)[\s\S]*?#?\s*fail\s+(\d+)/i);
    if (tests || t.is_error) push({ t: t.t, kind: tests ? 'test-run' : 'tool-error', actor: 'claude', turn: t.turn, text: `${t.name}: ${t.input.command ?? t.input.file_path ?? ''}`.slice(0, 300),
      refs: [`${src}:${t.uuid}`], tags: [classify({ tools: [t] })].filter((k) => k !== 'work'), data: tests ? { passed: +tests[1], failed: +tests[2] } : { output: out.slice(0, 400) } });
  }

  const short = (s) => s.slice(0, 7);
  const added = new Map();
  for (const c of g.commits) {
    const capOnly = c.files.length > 0 && c.files.every((f) => f.path.startsWith('docs/sessions/'));
    const selfDev = c.files.some((f) => f.path.startsWith('tools/capture/'));
    const tags = [];
    if (FIX_COMMIT.test(c.subject)) tags.push('fix');
    if (capOnly) tags.push('capture-output');
    if (selfDev) tags.push('self-dev');
    const add = c.files.reduce((n, f) => n + f.added, 0), del = c.files.reduce((n, f) => n + f.deleted, 0);
    push({ t: c.committed_at, kind: 'commit', actor: 'claude', text: `${c.subject}\n\n${c.body}`.trim(), refs: [`git:${short(c.sha)}`], tags,
      data: { sha: c.sha, subject: c.subject, files: c.files, additions: add, deletions: del, repo: repoSlug } });
    const inherit = capOnly ? ['capture-output'] : []; // a recap's own media never becomes material for the next recap
    for (const f of c.files) {
      if (f.status === 'A') added.set(f.path, c);
      if (f.status === 'A' && MEDIA.test(f.path)) push({ t: c.committed_at, kind: 'artifact', actor: 'claude', text: `${f.path} (${fmtBytes(f.bytes)})`, refs: [`file:${f.path}@${short(c.sha)}`, `git:${short(c.sha)}`], tags: [...inherit], data: { path: f.path, sha: c.sha, bytes: f.bytes ?? null } });
      if (f.status === 'A' && PAGE.test(f.path) && !f.path.startsWith('tools/')) push({ t: c.committed_at, kind: 'page', actor: 'claude', text: f.path, refs: [`file:${f.path}@${short(c.sha)}`, `git:${short(c.sha)}`], tags: [...inherit], data: { path: f.path, sha: c.sha } });
      if (f.status === 'D' && added.has(f.path)) {
        const was = added.get(f.path);
        push({ t: c.committed_at, kind: 'file-removed', actor: 'claude', text: `${f.path} (${fmtBytes(f.bytes)}) added in ${short(was.sha)}, removed in ${short(c.sha)}`,
          refs: [`git:${short(c.sha)}`, `git:${short(was.sha)}`], tags: ['self-revert'], data: { path: f.path, bytes: f.bytes ?? null, added_in: was.sha, removed_in: c.sha } });
      }
    }
  }
  for (const m of g.merges) push({ t: m.committed_at, kind: 'merge', actor: 'github', text: m.subject, refs: [`git:${short(m.sha)}`], data: { sha: m.sha, parents: m.parents } });
  for (const pr of pulls) {
    push({ t: pr.created_at, kind: 'pr-open', actor: 'claude', text: `#${pr.number} ${pr.title}`, refs: [`gh:pr/${pr.number}`], data: { number: pr.number, url: pr.url, title: pr.title, head: pr.head, base: pr.base, additions: pr.additions, deletions: pr.deletions, changed_files: pr.changed_files, commit_count: pr.commit_count ?? null } });
    if (pr.merged_at) push({ t: pr.merged_at, kind: 'pr-merge', actor: 'github', text: `#${pr.number} merged into ${pr.base}`, refs: [`gh:pr/${pr.number}`, pr.merge_commit_sha ? `git:${short(pr.merge_commit_sha)}` : null].filter(Boolean),
      data: { number: pr.number, base: pr.base, open_ms: Date.parse(pr.merged_at) - Date.parse(pr.created_at) } });
  }

  ev.sort((a, b) => Date.parse(a.t) - Date.parse(b.t) || order(a) - order(b));
  ev.unshift({ t: session.created_at, kind: 'session', actor: 'system', text: session.title ?? session.id, refs: [session.url ?? `${src}:${session.id}`], tags: [], data: { id: session.id, source: session.source, repo: repoSlug } });
  ev.forEach((e, i) => (e.id = `E${String(i).padStart(2, '0')}`));
  return ev;
}

const ORDER = ['session', 'prompt', 'tool-error', 'test-run', 'commit', 'artifact', 'page', 'file-removed', 'pr-open', 'pr-merge', 'merge', 'reply'];
const order = (e) => ORDER.indexOf(e.kind);
export const fmtBytes = (b) => (b == null ? '?' : b >= 1e6 ? `${round(b / 1e6, 1)} MB` : b >= 1e3 ? `${round(b / 1e3)} KB` : `${b} B`);

// Work events: everything that is not the capture system processing itself.
export const isWork = (e) => !e.tags.some((t) => t === 'capture-run' || t === 'capture-output');

// Metrics: the only numbers a recap may state. Each one cites the events it was computed from.
export function buildMetrics(ev, probes = {}) {
  const m = [];
  const add = (key, value, display, unit, refs, how) => m.push({ key, value, display, unit, refs, how });
  const work = ev.filter(isWork);
  add('events', ev.length, String(ev.length), 'events', ['E00'], 'events in session-events.json');
  const prompts = work.filter((e) => e.kind === 'prompt');
  if (prompts.length) add('prompts', prompts.length, String(prompts.length), 'prompts', prompts.map((e) => e.id), 'founder prompts');
  const prs = work.filter((e) => e.kind === 'pr-open');
  if (prs.length) add('pull_requests', prs.length, String(prs.length), 'PRs', prs.map((e) => e.id), 'pull requests opened');
  const commits = work.filter((e) => e.kind === 'commit');
  if (commits.length) {
    add('commits', commits.length, String(commits.length), 'commits', commits.map((e) => e.id), 'session commits (Claude-Session trailer)');
    const files = new Set(commits.flatMap((e) => e.data.files.map((f) => f.path)));
    add('files_touched', files.size, String(files.size), 'files', commits.map((e) => e.id), 'distinct paths across session commits');
  }
  const goal = goalTurn(ev);
  if (goal?.reply?.data.duration_ms) {
    add('build_minutes', Math.round(goal.reply.data.duration_ms / 60000), String(Math.round(goal.reply.data.duration_ms / 60000)), 'min', [goal.reply.id], 'duration of the turn that did the work');
    if (goal.reply.data.num_turns) add('build_steps', goal.reply.data.num_turns, String(goal.reply.data.num_turns), 'steps', [goal.reply.id], 'agent steps in that turn');
  }
  for (const pr of work.filter((e) => e.kind === 'pr-open')) {
    const n = pr.data.number;
    add(`pr${n}_files`, pr.data.changed_files, String(pr.data.changed_files), 'files', [pr.id], `PR #${n} changed_files`);
    add(`pr${n}_additions`, pr.data.additions, `+${pr.data.additions}`, 'lines', [pr.id], `PR #${n} additions`);
    add(`pr${n}_deletions`, pr.data.deletions, `−${pr.data.deletions}`, 'lines', [pr.id], `PR #${n} deletions`);
    if (pr.data.commit_count) add(`pr${n}_commits`, pr.data.commit_count, String(pr.data.commit_count), 'commits', [pr.id], `PR #${n} commit count`);
  }
  for (const mg of work.filter((e) => e.kind === 'pr-merge')) {
    const days = mg.data.open_ms / 864e5;
    if (days >= 1) add(`pr${mg.data.number}_wait_days`, Math.floor(days), String(Math.floor(days)), 'days', [mg.id], `PR #${mg.data.number} open → merged, whole days`);
  }
  for (const r of work.filter((e) => e.kind === 'reply')) {
    const t = r.text.match(/tests? pass(?:ed)?\s*\((\d+)\s*\/\s*(\d+)\)|(\d+)\s*\/\s*(\d+)\s+tests? pass/i) || r.text.match(/(\d+) passed, (\d+) failed/i);
    if (t && !m.some((x) => x.key === 'tests_passed')) { const a = +(t[1] ?? t[3]); const b = +(t[2] ?? t[4]); add('tests_passed', a, `${a}/${b}`, 'tests', [r.id], 'test count reported in the reply'); }
  }
  for (const t of work.filter((e) => e.kind === 'test-run')) add(`test_run_${t.id}`, t.data.passed, `${t.data.passed}/${t.data.passed + t.data.failed}`, 'tests', [t.id], 'test runner output');
  for (const f of work.filter((e) => e.kind === 'file-removed' && e.data.bytes)) add(`removed_${f.id}_mb`, round(f.data.bytes / 1e6, 1), `${round(f.data.bytes / 1e6, 1)} MB`, 'MB', [f.id], `${f.data.path} blob size`);
  for (const a of work.filter((e) => e.kind === 'artifact')) {
    const p = probes[a.data.path];
    if (p?.duration) add(`artifact_${a.id}_seconds`, Math.round(p.duration), `${Math.round(p.duration)} s`, 's', [a.id], `ffprobe ${a.data.path}`);
    if (p?.width) add(`artifact_${a.id}_size`, p.width, `${p.width}×${p.height}`, 'px', [a.id], `ffprobe ${a.data.path}`);
    if (p?.fps) add(`artifact_${a.id}_fps`, p.fps, `${p.fps} fps`, 'fps', [a.id], `ffprobe ${a.data.path}`);
  }
  return m;
}

// The goal turn is the first founder prompt whose turn led to a commit or PR; else the longest prompt.
export function goalTurn(ev) {
  const prompts = ev.filter((e) => e.kind === 'prompt' && isWork(e) && !e.tags.includes('approval'));
  if (!prompts.length) return null;
  const replyOf = (p) => ev.find((e) => e.kind === 'reply' && e.turn === p.turn);
  const next = (p) => prompts.find((q) => Date.parse(q.t) > Date.parse(p.t));
  for (const p of prompts) {
    const end = next(p) ? Date.parse(next(p).t) : Infinity;
    if (ev.some((e) => (e.kind === 'commit' || e.kind === 'pr-open') && isWork(e) && Date.parse(e.t) >= Date.parse(p.t) && Date.parse(e.t) < end)) return { prompt: p, reply: replyOf(p) };
  }
  const p = prompts.reduce((a, b) => (b.text.length > a.text.length ? b : a));
  return { prompt: p, reply: replyOf(p) };
}

// How much the session gives a recap to work with: none (nothing but capture), thin (talk only), full.
export function evidenceLevel(ev) {
  const work = ev.filter((e) => isWork(e) && e.kind !== 'session');
  if (!work.some((e) => e.kind === 'prompt')) return 'none';
  if (!work.some((e) => ['commit', 'artifact', 'pr-open', 'test-run'].includes(e.kind))) return 'thin';
  return 'full';
}
