#!/usr/bin/env node
// QB Capture: turn a finished Claude Code session into a cinematic, evidence-backed recap.
//
//   node tools/capture/cli.mjs run      --transcript <session.jsonl> | --ccr <export.json> | --events <list_events dump> [--meta <session.json>]
//                                       [--key <name>] [--repo <dir>] [--editorial <file>] [--footage <file>] [--no-capture] [--offline] [--formats 16x9,9x16] [--plan-only]
//   node tools/capture/cli.mjs stills   --key <name> [--at 1,5.5,12] [--formats 16x9]
//   node tools/capture/cli.mjs script   --key <name>        lines to voice, voice id and the file each must be saved to
//   node tools/capture/cli.mjs approve  --key <name> --by <who> (--voice <higgsfield voice id> | --silent)   record the founder's approval
//   node tools/capture/cli.mjs fetch-narration --key <name> download the recorded lines listed in narration/jobs.json
//   node tools/capture/cli.mjs final    --key <name>        re-time to the recorded narration and render the final cut
//
// run = steps 1–7 of the end-of-session flow (finalize, collect, narrate, select scenes, storyboard, silent preview, present).
// Nothing here spends credits, publishes or deploys. Paid narration happens outside this CLI, only after `approve`.
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, relative, basename } from 'node:path';
import { ROOT, ARCHIVE, readJSON, readJSONIf, writeJSON, writeText, slugify, sha256File, fmtDate, parts } from './lib/util.mjs';
import { fromTranscript, fromCcrExport, fromCcrEvents, sessionCommits, sessionAliases, githubPulls, repoSlug } from './lib/ingest.mjs';
import { buildEvents, buildMetrics } from './lib/events.mjs';
import { buildStory } from './lib/story.mjs';
import { planStoryboard, timeStoryboard, narrationFile } from './lib/storyboard.mjs';
import { validateStoryboard } from './lib/validate.mjs';
import { collectAssets, probe } from './lib/assets.mjs';
import { payload, renderVideo, stills } from './lib/render.mjs';
import { srt } from './lib/captions.mjs';
import { sessionReport, logEntry, appendLog } from './lib/report.mjs';
import { ENV_FLAG, lock, recordIndex } from './lib/guard.mjs';

process.env[ENV_FLAG] = '1'; // anything this process starts knows it is inside a capture
export const VERSION = '0.2.1'; // bump with CHANGELOG.md
const LOG_HEADER = '# Production log\n\nHow this recap was made: every run, what it decided, what it validated, and what it cost. Newest last.';

const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (name, dflt = null) => { const i = argv.indexOf(`--${name}`); return i < 0 ? dflt : argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true; };
const say = (...a) => console.log('[capture]', ...a);

const files = (dir) => ({
  dir, events: join(dir, 'session-events.json'), storyboard: join(dir, 'session-storyboard.json'), assets: join(dir, 'session-assets.json'),
  report: join(dir, 'session-report.md'), captions: join(dir, 'session-captions.srt'), log: join(dir, 'production-log.md'),
  video: (fmt) => join(dir, `session-recap-${fmt}.mp4`), editorial: join(dir, 'editorial.json'), narration: join(dir, 'narration'), github: join(dir, 'evidence/github.json'), review: join(dir, 'review'),
});

async function cmdRun() {
  const repo = resolve(opt('repo', ROOT));
  const meta = opt('meta') ? readJSON(resolve(opt('meta'))) : {};
  const src = opt('transcript') ? fromTranscript(resolve(opt('transcript'))) : opt('ccr') ? fromCcrExport(resolve(opt('ccr'))) : opt('events') ? fromCcrEvents(resolve(opt('events')), meta) : null;
  if (!src) throw new Error('give --transcript <session.jsonl>, --ccr <export.json> or --events <list_events dump> [--meta <session.json>]');
  if (opt('meta')) Object.assign(src.session, meta);
  const { session } = src;
  const d = parts(session.created_at);
  const key = opt('key') || `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}-${slugify(session.title ?? session.id)}`;
  const F = files(join(ARCHIVE, key));
  mkdirSync(F.dir, { recursive: true });
  lock();
  const log = [`**Command** \`${['cli.mjs', ...argv].join(' ')}\` · QB Capture ${VERSION}`, ''];
  const t0 = Date.now();

  // 1–2. finalize the record and collect evidence
  if (opt('remote-id')) session.remote_id = opt('remote-id');
  const g = sessionCommits(repo, sessionAliases(session));
  const slug = repoSlug(repo);
  const pulls = githubPulls(slug, g.commits.map((c) => c.sha), F.github, { offline: !!opt('offline') });
  const events = buildEvents({ ...src, git: g, pulls, repo, repoSlug: slug });
  // A raw event dump is never archived: keep a redacted record (prompts, replies, and only the tool output that became evidence).
  if (session.source === 'ccr-events') {
    const used = new Set(events.flatMap((e) => e.refs).filter((r) => r.startsWith('ccr:')).map((r) => r.slice(4)));
    writeJSON(join(F.dir, 'evidence/ccr-session.json'), { format: 'qb-capture/ccr-export@2', source: 'claude-code-remote list_events, redacted: home folders as ~, injected system text dropped, tool output kept only where it is evidence',
      exported_at: new Date().toISOString(), session: { ...session, export: undefined, source: undefined }, turns: src.turns,
      tools: src.tools.map(({ output, ...t }) => {
        if (!used.has(t.uuid)) return t;
        // a probe's evidence is its key=value readout; nothing else from that output is kept
        const isProbe = events.some((e) => e.kind === 'probe' && e.refs.includes(`ccr:${t.uuid}`));
        return { ...t, output: isProbe ? (output ?? '').split(/\r?\n/).filter((l) => /^[a-z_]+=/.test(l)).join('\n') : output };
      }) });
  }
  say(`${events.length} events from ${session.source} (${src.turns.length} turns), ${g.commits.length} commits, ${pulls.length} PRs`);
  log.push(`1. **Finalize**: ${src.turns.length} turns from ${session.source}, ${g.commits.length} commits carrying the session id, ${g.merges.length} merges, ${pulls.length} pull requests → ${events.length} events.`);

  let assets = readJSONIf(F.assets);
  if (!assets || !opt('no-capture', false)) {
    const list = await collectAssets({ events, repo, archiveDir: F.dir, capture: !opt('no-capture', false), log: (m) => say(m) });
    assets = { schema: 'qb-capture/assets@1', session_id: session.id, assets: list };
  }
  // Footage the founder provides (e.g. a file Claude made on their own computer) is accepted only if it is byte-for-byte
  // the size the session itself recorded for that file.
  if (opt('footage')) {
    const file = resolve(opt('footage')), name = basename(file), bytes = statSync(file).size;
    const recorded = events.find((e) => e.kind === 'probe' && e.data.file === name && e.data.fields.size);
    const artifact = events.find((e) => e.kind === 'artifact' && e.data.path.split(/[\\/]/).pop() === name) ?? recorded;
    if (!artifact) throw new Error(`${name} is not a file this session produced`);
    if (recorded && recorded.data.fields.size !== bytes) throw new Error(`${name} is ${bytes} bytes; the session recorded ${recorded.data.fields.size}. Not the same file.`);
    mkdirSync(join(F.dir, 'assets'), { recursive: true });
    copyFileSync(file, join(F.dir, 'assets', name));
    const id = slugify(name.replace(/\.\w+$/, ''));
    assets.assets = assets.assets.filter((a) => a.id !== id).concat({ id, kind: 'video', path: `assets/${name}`, root: 'archive',
      provenance: { source: `provided by the founder; ${recorded ? `size matches the session's ffprobe record (${bytes} bytes)` : 'name matches a file the session delivered'}`, event: artifact.id, matched: recorded?.id ?? null },
      sha256: sha256File(file), probe: await probe(file) });
  }
  const probes = Object.fromEntries(assets.assets.filter((a) => a.probe).map((a) => [a.path, a.probe]));
  for (const e of events.filter((e) => e.kind === 'artifact' && /\.(mp4|mov|webm)$/i.test(e.data.path) && !probes[e.data.path] && existsSync(join(repo, e.data.path)))) probes[e.data.path] = await probe(join(repo, e.data.path));
  const metrics = buildMetrics(events, probes);
  log.push(`2. **Collect**: ${assets.assets.length} assets (${assets.assets.map((a) => `${a.id} [${a.kind}]`).join(', ') || 'none'}); ${metrics.length} metrics.`);

  // 3. narrative
  const story = buildStory(events, metrics);
  writeJSON(F.events, { schema: 'qb-capture/events@1', session: { ...session, key }, generated_at: new Date().toISOString(), level: story.level, events, metrics });
  if (story.level === 'none') {
    log.push('3. **Narrative**: nothing but capture activity in this session. No recap made, so a recap can never trigger another recap.');
    writeText(F.log, appendLog(F.log, LOG_HEADER, logEntry(log)));
    recordIndex({ key, session_id: session.id, status: 'skipped: capture-only session', transcript_sha: src.session.transcript ? sha256File(src.session.transcript) : null });
    say('capture-only session: no recap'); return;
  }
  log.push(`3. **Narrative**: level ${story.level}; stages ${story.stages.map((s) => s.stage).join(' → ')}${story.omitted.length ? `; left out: ${story.omitted.map((o) => `${o.stage} (${o.reason})`).join('; ')}` : ''}.`);

  // 4–5. scenes and storyboard (with the editorial pass, if one exists)
  const editorialPath = opt('editorial') ? resolve(opt('editorial')) : F.editorial;
  const editorial = readJSONIf(editorialPath, {});
  const sb = timeStoryboard(planStoryboard({ session, story, events, metrics, assets: assets.assets, repo, editorial }), { narrationDir: F.narration });
  const wanted = String(opt('formats', '16x9,9x16')).split(',');
  for (const k of Object.keys(sb.formats)) if (!wanted.includes(k)) delete sb.formats[k];
  sb.story = story; sb.status = 'preview';
  const validation = validateStoryboard(sb, events, metrics, assets);
  sb.validation = validation;
  writeJSON(F.storyboard, sb);
  writeJSON(F.assets, assets);
  log.push(`4. **Scenes**: ${Object.entries(sb.formats).map(([k, f]) => `${k}: ${f.scenes.map((s) => s.id).join(', ')} (${f.duration.toFixed(1)} s)`).join(' · ')}. Vertical cut ${sb.vertical}.`);
  log.push(`5. **Storyboard**: editorial pass ${existsSync(editorialPath) ? `applied from \`${relative(F.dir, editorialPath)}\`` : 'none (automatic script)'}; validation ${validation.ok ? 'passed' : 'FAILED'}.`);
  if (!validation.ok) {
    for (const e of validation.errors) log.push(`   - ${e}`);
    writeText(F.log, appendLog(F.log, LOG_HEADER, logEntry(log)));
    console.error(validation.errors.join('\n'));
    throw new Error(`storyboard failed validation (${validation.errors.length} problems); nothing rendered`);
  }
  writeText(F.report, sessionReport({ session, key, events, metrics, story, sb, assets, validation }));
  if (sb.formats['16x9']) writeText(F.captions, srt(sb.formats['16x9'].cues));
  if (opt('plan-only')) { log.push('6. **Preview**: skipped (--plan-only).'); writeText(F.log, appendLog(F.log, LOG_HEADER, logEntry(log))); say('planned', F.storyboard); return; }

  // 6. silent preview (score only; captions carry the script)
  const rendered = [];
  for (const fmt of Object.keys(sb.formats)) {
    const data = await payload(sb, fmt, { events, assets, archiveDir: F.dir, repo });
    const narration = narrationClips(sb, fmt, F);
    const r = await renderVideo(data, F.video(fmt), { narration, log: (m) => say(m), metadata: { title: `${sb.title} — session recap (${narration.length ? 'narrated' : 'preview, no voice'})`, comment: `QB Capture ${VERSION} · ${session.id} · ${key}` } });
    rendered.push(`${fmt} ${data.duration.toFixed(1)} s in ${r.seconds} s`);
    say(`wrote ${relative(ROOT, F.video(fmt))}`);
  }
  log.push(`6. **Preview render**: ${rendered.join(', ')}. Narration: ${Object.keys(sb.formats).some((f) => narrationClips(sb, f, F).length) ? 'recorded files from narration/' : 'none; silent preview with the synthesised score and burned-in captions'}. Credits spent: 0.`);
  log.push('7. **Review**: preview presented to the founder. Paid narration, final render, publishing and deploys each wait for an explicit yes.');
  log.push('', `Total ${Math.round((Date.now() - t0) / 1000)} s.`);
  writeText(F.log, appendLog(F.log, LOG_HEADER, logEntry(log)));
  recordIndex({ key, session_id: session.id, title: sb.title, status: 'awaiting review', level: story.level, formats: Object.keys(sb.formats), transcript_sha: src.session.transcript ? sha256File(src.session.transcript) : null, source: session.source });
}

function narrationClips(sb, fmt, F) {
  return sb.formats[fmt].scenes.filter((s) => s.voice?.source === 'recorded').map((s) => ({ file: s.voice.file, start: s.speech.start, seconds: s.voice.seconds }));
}

async function loadKey() {
  const key = opt('key'); if (!key) throw new Error('--key is required');
  const F = files(join(ARCHIVE, key));
  const ev = readJSON(F.events), sb = readJSON(F.storyboard), assets = readJSON(F.assets);
  return { key, F, ev, sb, assets };
}

async function cmdStills() {
  const { F, ev, sb, assets } = await loadKey();
  const at = String(opt('at', '')).split(',').filter(Boolean).map(Number);
  for (const fmt of String(opt('formats', Object.keys(sb.formats).join(','))).split(',')) {
    const data = await payload(sb, fmt, { events: ev.events, assets, archiveDir: F.dir, repo: ROOT });
    const times = at.length ? at : data.scenes.map((s) => s.start + Math.min(s.duration - 0.9, Math.max(2.2, s.duration * 0.62)));
    const out = await stills(data, F.review, times);
    say(out.map((p) => relative(ROOT, p)).join('\n'));
  }
}

async function cmdScript() {
  const { F, sb } = await loadKey();
  const approval = sb.approval ?? null;
  console.log(`# Narration script: ${sb.title}\n`);
  console.log(approval?.voice ? `Voice: Higgsfield ${approval.voice} (approved by ${approval.by} at ${approval.at})` : 'Voice: not approved yet. Ask the founder before generating anything that costs credits.');
  for (const [fmt, f] of Object.entries(sb.formats)) {
    console.log(`\n## ${fmt}`);
    for (const s of f.scenes.filter((s) => s.narration)) console.log(`- ${s.id} → ${relative(ROOT, join(F.narration, fmt, `${s.id}.mp3`))}\n  "${s.narration}"`);
  }
}

async function cmdApprove() {
  const { F, sb } = await loadKey();
  const by = opt('by'); if (!by || by === true) throw new Error('--by <who approved> is required: record who said yes');
  const voice = opt('voice'), silent = !!opt('silent');
  if (!voice && !silent) throw new Error('give --voice <higgsfield voice id> or --silent');
  sb.approval = { by, at: new Date().toISOString(), voice: voice || null, silent };
  writeJSON(F.storyboard, sb);
  writeText(F.log, appendLog(F.log, LOG_HEADER, logEntry([`**Approval** recorded for ${by}: ${voice ? `paid narration with Higgsfield voice \`${voice}\`` : 'final render without a voice'}.`])));
  say('approval recorded');
}

// Recorded lines are listed (job id, url, spoken text) in narration/jobs.json when they are generated; this puts them in place.
async function cmdFetchNarration() {
  const { F } = await loadKey();
  const jobs = readJSON(join(F.narration, 'jobs.json'));
  const failed = [];
  for (const l of jobs.lines) {
    const out = join(F.narration, l.format, `${l.scene}.${(l.url.match(/\.(wav|mp3|m4a)(\?|$)/) ?? [, 'wav'])[1]}`);
    mkdirSync(join(F.narration, l.format), { recursive: true });
    try { execFileSync('curl', ['-sS', '--fail', '--max-time', '60', '-o', out, l.url], { stdio: ['ignore', 'ignore', 'pipe'] }); say(`${l.format}/${l.scene} ✓`); }
    catch (e) { failed.push(`${l.format}/${l.scene}: ${String(e.stderr ?? e.message).trim().split('\n')[0]}`); }
  }
  if (failed.length) throw new Error(`could not download ${failed.length} of ${jobs.lines.length} lines (is ${new URL(jobs.lines[0].url).host} allowed by the environment's network access?)\n${failed.join('\n')}`);
}

async function cmdFinal() {
  const { key, F, ev, sb: prev, assets } = await loadKey();
  if (!prev.approval) throw new Error('no approval recorded: run `approve` only after the founder says yes');
  const editorial = readJSONIf(F.editorial, {});
  const sb = timeStoryboard(planStoryboard({ session: ev.session, story: prev.story, events: ev.events, metrics: ev.metrics, assets: assets.assets, repo: ROOT, editorial }), { narrationDir: prev.approval.silent ? null : F.narration });
  for (const k of Object.keys(sb.formats)) if (!prev.formats[k]) delete sb.formats[k];
  Object.assign(sb, { story: prev.story, approval: prev.approval, status: 'final' });
  if (!prev.approval.silent) {
    const missing = Object.entries(sb.formats).flatMap(([fmt, f]) => f.scenes.filter((s) => s.narration && !narrationFile(F.narration, fmt, s.id)).map((s) => `${fmt}/${s.id}`));
    if (missing.length) throw new Error(`narration files missing: ${missing.join(', ')} (see \`script\`)`);
  }
  sb.validation = validateStoryboard(sb, ev.events, ev.metrics, assets);
  if (!sb.validation.ok) throw new Error(sb.validation.errors.join('\n'));
  writeJSON(F.storyboard, sb);
  if (sb.formats['16x9']) writeText(F.captions, srt(sb.formats['16x9'].cues));
  const out = [];
  for (const fmt of Object.keys(sb.formats)) {
    const data = await payload(sb, fmt, { events: ev.events, assets, archiveDir: F.dir, repo: ROOT });
    const narration = narrationClips(sb, fmt, F);
    await renderVideo(data, F.video(fmt), { narration, log: (m) => say(m), metadata: { title: `${sb.title} — session recap`, comment: `QB Capture ${VERSION} · ${ev.session.id} · ${key}` } });
    out.push(`${fmt} ${data.duration.toFixed(1)} s, ${narration.length} narration clips`);
  }
  writeText(F.report, sessionReport({ session: ev.session, key, events: ev.events, metrics: ev.metrics, story: prev.story, sb, assets, validation: sb.validation }));
  writeText(F.log, appendLog(F.log, LOG_HEADER, logEntry([`9. **Final render**: ${out.join(', ')}.`, '10. **Archive**: report, events, storyboard, assets, captions and media written to this folder.'])));
  recordIndex({ key, session_id: ev.session.id, status: 'final' });
}

const commands = { run: cmdRun, stills: cmdStills, script: cmdScript, approve: cmdApprove, 'fetch-narration': cmdFetchNarration, final: cmdFinal };
if (!commands[cmd]) { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 15).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(cmd ? 1 : 0); }
commands[cmd]().catch((e) => { console.error('[capture] error:', e.message); process.exit(1); });
