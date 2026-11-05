// HARLEM '88: Production Notes. Turns a creative review export (a ZIP or folder: creative-review.md, measurement JSON
// in evidence/, footage excerpts in excerpts/) into ranked episode topics, evidence-linked draft storyboards for
// documentary mode, and approval-ready export packages. Nothing here generates footage, records narration, spends
// credits or publishes: drafts are labelled as drafts, and every export carries an approval checklist set to pending.
import { existsSync, readFileSync, readdirSync, statSync, lstatSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, resolve, basename, extname, relative, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { sha256File, writeJSON, writeText, readJSONIf, slugify } from './util.mjs';
import { srt } from './captions.mjs';

// ---- intake ----------------------------------------------------------------------------------------------------
// A ZIP is listed before it is opened: absolute paths and `..` entries are refused, and anything that unpacks as a
// symlink is removed, so an export can only ever write inside its own folder. Nothing in it is executed.
export function extractReview(src, dest) {
  if (statSync(src).isDirectory()) return resolve(src);
  const names = execFileSync('unzip', ['-Z1', src], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n').filter(Boolean);
  const bad = names.filter((n) => n.startsWith('/') || /^[a-zA-Z]:/.test(n) || n.split(/[\\/]/).includes('..'));
  if (bad.length) throw new Error(`${src}: refusing entries that would write outside the folder: ${bad.slice(0, 3).join(', ')}`);
  rmSync(dest, { recursive: true, force: true }); mkdirSync(dest, { recursive: true });
  execFileSync('unzip', ['-q', '-o', src, '-d', dest]);
  for (const f of walk(dest, { links: true })) if (lstatSync(f).isSymbolicLink()) rmSync(f);
  // a single top folder is the export itself
  const top = readdirSync(dest).filter((n) => !n.startsWith('__MACOSX') && !n.startsWith('.'));
  return top.length === 1 && statSync(join(dest, top[0])).isDirectory() ? join(dest, top[0]) : dest;
}
function walk(dir, { links = false } = {}) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n), st = lstatSync(p);
    if (st.isSymbolicLink()) { if (links) out.push(p); continue; }
    if (st.isDirectory()) out.push(...walk(p, { links })); else out.push(p);
  }
  return out;
}

const VIDEO = new Set(['.mp4', '.mov', '.m4v', '.webm']), IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp']);
export function inventory(root) {
  const files = walk(root).map((p) => {
    const rel = relative(root, p), ext = extname(p).toLowerCase(), st = statSync(p);
    const kind = VIDEO.has(ext) ? 'video' : IMAGE.has(ext) ? 'image' : ext === '.json' ? 'json' : ext === '.md' ? 'doc' : ext === '.py' ? 'script' : 'other';
    const f = { path: rel, kind, bytes: st.size, sha256: sha256File(p) };
    if (kind === 'video') f.probe = probeVideo(p);
    if (kind === 'json') { const j = readJSONIf(p); if (j?.summary && Array.isArray(j.moving)) f.measurement = 'mouth_sync'; else if (j?.mouth && j?.width) f.measurement = 'track'; }
    return f;
  });
  return { root, files, review: files.find((f) => /creative-review\.md$/i.test(f.path))?.path ?? null };
}
function probeVideo(p) {
  try {
    const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', p], { encoding: 'utf8' }));
    const v = j.streams.find((s) => s.codec_type === 'video'), [a, b] = (v?.r_frame_rate ?? '0/1').split('/').map(Number);
    return { seconds: +(+j.format.duration).toFixed(3), width: v?.width ?? null, height: v?.height ?? null, fps: b ? +(a / b).toFixed(3) : null, audio: j.streams.some((s) => s.codec_type === 'audio') };
  } catch { return null; }
}

// ---- the review ------------------------------------------------------------------------------------------------
// A finding is a `## n. Title (refs): verdict` section. Its top-level bullets are `**Label:** text` fields (nested
// bullets fold into their field), plus an `**Evidence:**` line naming cards, strips and excerpts.
const LABELS = ['Verified', 'Measured', 'Suspected', 'Subjective', 'Not established'];
export function parseReview(md) {
  const findings = [];
  for (const sec of md.split(/^## /m).slice(1)) {
    const [head, ...body] = sec.split('\n');
    const m = head.match(/^(\d+)\.\s+(.*?)(?:\s+\(([^)]*)\))?(?::\s*(.*))?\s*$/); if (!m) continue;
    const f = { n: +m[1], title: m[2].trim(), refs: m[3] ?? '', verdict: m[4]?.trim() ?? '', fields: [], quotes: [], evidence: [], labels: {} };
    let cur = null;
    for (const line of body) {
      const top = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/), sub = line.match(/^\s{2,}- (.*)$/);
      if (top) { cur = { label: top[1].replace(/:$/, '').trim(), text: top[2].trim(), items: [] }; f.fields.push(cur); }
      else if (sub && cur) cur.items.push(sub[1].trim());
      else if (line.trim() && cur && !line.startsWith('-')) cur.text += ` ${line.trim()}`;
    }
    for (const fl of f.fields) {
      const all = [fl.label, fl.text, ...fl.items].join(' ');
      for (const q of all.matchAll(/\*"([^"]+)"\*/g)) f.quotes.push(q[1]);
      for (const L of LABELS) { const k = (all.match(new RegExp(`\\b${L}\\b`, 'g')) ?? []).length; if (k) f.labels[L] = (f.labels[L] ?? 0) + k; }
      if (/^evidence$/i.test(fl.label)) f.evidence = evidenceNames([fl.text, ...fl.items].join(' '));
    }
    for (const L of LABELS) if (new RegExp(`\\b${L}\\b`).test(f.verdict)) f.labels[L] = (f.labels[L] ?? 0) + 1;
    findings.push(f);
  }
  return findings;
}
// `card-17.png`, `17_ad67b7e9-strip.png`, and the short forms "excerpts 15 and 16" / "strips 15 and 16"
function evidenceNames(text) {
  const names = [...text.matchAll(/`([^`]+)`/g)].map((x) => ({ name: x[1] }));
  for (const x of text.matchAll(/\b(excerpts?|strips?|cards?)\s+((?:\d+(?:,\s*|\s+and\s+)?)+)/gi))
    for (const id of x[2].match(/\d+/g)) names.push({ short: x[1].toLowerCase().replace(/s$/, ''), id: id.padStart(2, '0') });
  return names;
}
const field = (f, re) => f.fields.find((x) => re.test(x.label));
const text = (fl) => (fl ? [fl.text, ...fl.items].join(' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim() : '');

// resolve a finding's evidence against the export's files: footage excerpts, their measurements, cards
export function evidenceFor(f, inv) {
  const files = inv.files, byBase = new Map(files.map((x) => [basename(x.path), x]));
  const found = { videos: [], measurements: [], images: [], missing: [] };
  const add = (x) => { if (!x) return; const k = x.kind === 'video' ? 'videos' : x.kind === 'json' ? 'measurements' : x.kind === 'image' ? 'images' : null; if (k && !found[k].some((y) => y.path === x.path)) found[k].push(x); };
  for (const e of f.evidence) {
    if (e.name) { const x = byBase.get(e.name); if (x) add(x); else found.missing.push(e.name); continue; }
    const pick = files.filter((x) => basename(x.path).startsWith(`${e.id}_`) && (e.short === 'excerpt' ? x.kind === 'video' : e.short === 'strip' ? /-strip\./.test(x.path) : /card/.test(x.path)));
    if (pick.length) pick.forEach(add); else found.missing.push(`${e.short} ${e.id}`);
  }
  // every excerpt brings its measurement when the export has one
  for (const v of found.videos) { const id = basename(v.path, extname(v.path)); add(files.find((x) => x.kind === 'json' && basename(x.path) === `${id}.json` && x.measurement)); }
  return found;
}

// rank: an episode needs real footage of the problem; it is stronger with a measurement, a recorded change, a result
// that was checked, the founder's own words, and a verdict backed by evidence rather than taste
export function rankTopics(findings, inv) {
  return findings.map((f) => {
    const ev = evidenceFor(f, inv), change = field(f, /changed|correction|fix|re-perform|rule/i), result = field(f, /did it work|result|after/i);
    const verified = /verified/i.test(f.verdict) || (f.labels.Verified ?? 0) > 0, subjective = /subjective/i.test(f.verdict);
    const score = (ev.videos.length ? 4 : -10) + (ev.measurements.length ? 2 : 0) + (change ? 2 : 0) + (result ? 2 : 0) + (f.quotes.length ? 1 : 0) + (verified ? 2 : 0) - (subjective ? 2 : 0) + Math.min(ev.videos.length, 2);
    const gaps = [!ev.videos.length && 'no footage excerpt in the export', !ev.measurements.length && 'no measurement JSON (overlays cannot track the mouth or show the voice ruler)', !change && 'no recorded change', !result && 'no checked result', ...ev.missing.map((m) => `evidence named but not in the export: ${m}`)].filter(Boolean);
    return { n: f.n, title: f.title, refs: f.refs, verdict: f.verdict || Object.keys(f.labels).join(', '), score, ready: ev.videos.length > 0, evidence: ev, gaps,
      see: text(field(f, /what you see|you see/i)), hear: text(field(f, /what you hear/i)), surfaced: text(field(f, /surfaced/i)), change: text(change), result: text(result), quotes: f.quotes };
  }).sort((a, b) => b.score - a.score || a.n - b.n);
}

export function topicsReport(topics, inv, srcName) {
  const L = [`# Production Notes: suggested topics`, '', `From \`${srcName}\` (${inv.files.length} files; review: \`${inv.review ?? 'none found'}\`). Ranked by evidence, not by drama: an episode needs footage of the problem, and is stronger with a measurement, a recorded change and a checked result.`, ''];
  topics.forEach((t, i) => {
    L.push(`## ${i + 1}. ${t.title}${t.ready ? '' : ' (not makeable from this export)'}`, '', `- **Finding:** §${t.n}${t.refs ? `, ${t.refs}` : ''}${t.verdict ? ` · ${t.verdict}` : ''} · score ${t.score}`);
    L.push(`- **Footage:** ${t.evidence.videos.map((v) => `\`${v.path}\`${v.probe ? ` (${v.probe.seconds} s, ${v.probe.width}×${v.probe.height})` : ''}`).join(', ') || 'none'}`);
    L.push(`- **Measurements:** ${t.evidence.measurements.map((v) => `\`${v.path}\``).join(', ') || 'none'}`);
    if (t.see) L.push(`- **What you see:** ${t.see}`);
    if (t.change) L.push(`- **What changed:** ${t.change}`);
    if (t.result) L.push(`- **Did it work:** ${t.result}`);
    if (t.quotes.length) L.push(`- **The founder's words:** ${t.quotes.map((q) => `"${q}"`).join(' / ')}`);
    if (t.gaps.length) L.push(`- **Gaps:** ${t.gaps.join('; ')}`);
    L.push('');
  });
  return L.join('\n');
}

export function intake(src, out) {
  const root = extractReview(resolve(src), join(out, 'review'));
  const inv = inventory(root);
  if (!inv.review) throw new Error(`${src}: no creative-review.md in the export`);
  const findings = parseReview(readFileSync(join(root, inv.review), 'utf8')), topics = rankTopics(findings, inv);
  writeJSON(join(out, 'inventory.json'), inv); writeJSON(join(out, 'findings.json'), findings); writeJSON(join(out, 'topics.json'), topics);
  writeText(join(out, 'topics.md'), topicsReport(topics, inv, basename(src)));
  return { root, inv, findings, topics };
}

// ---- draft -----------------------------------------------------------------------------------------------------
// A draft storyboard for one topic, in the shape of Episode 01: a cold open on the problem, then the review's own
// four parts as chapters. Narration lines are first drafts quoted from the review, marked `draft`; numbers on screen
// are pre-filled only where a measurement file supplies them. Beats come from the measurement (voice and silent
// movement); a person, or Claude following the skill, rewrites the script and refines the beats before any render
// is shown, and the founder approves the script before a voice is recorded.
// the first clause of a field, as a speakable draft line: a stop must end a sentence (not a decimal), record tags
// in brackets are dropped, and a line that runs long is cut at a word with an ellipsis for the editor to finish
export function sentence(s, max = 16) {
  const clean = String(s).replace(/\([^)]*\)/g, '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').replace(/^[\s:;,–-]+/, '').trim();
  const first = (clean.match(/^.*?[.!?;](?=\s|$)/) ?? [clean])[0].replace(/;$/, '.').trim();
  const w = first.split(' '), line = w.length > max ? `${w.slice(0, max).join(' ').replace(/[,;:]$/, '')}…` : first;
  return line.charAt(0).toUpperCase() + line.slice(1);
}
function spans(series, fps) { const r = []; let s = null; series.forEach((v, i) => { if (v && s == null) s = i; if (!v && s != null) { r.push([s / fps, i / fps]); s = null; } }); if (s != null) r.push([s / fps, series.length / fps]); return r; }

export function draftEpisode(work, topicN, { episode = 1, slug } = {}) {
  const topics = readJSONIf(join(work, 'topics.json')), inv = readJSONIf(join(work, 'inventory.json'));
  if (!topics || !inv) throw new Error(`${work}: run \`notes intake\` first`);
  const t = topics.find((x) => x.n === +topicN) ?? topics[+topicN - 1];
  if (!t) throw new Error(`no topic ${topicN}; see ${join(work, 'topics.md')}`);
  if (!t.ready) throw new Error(`topic "${t.title}" has no footage excerpt in the export; report what is missing instead of substituting footage`);
  const dir = join(work, `ep${String(episode).padStart(2, '0')}`); mkdirSync(dir, { recursive: true });
  const rel = (p) => relative(dir, join(inv.root, p));
  const clips = {}, facts = [], notes = [];
  t.evidence.videos.forEach((v, i) => {
    const id = `c${i + 1}`, m = t.evidence.measurements.find((x) => basename(x.path, '.json') === basename(v.path, extname(v.path)));
    const tr = inv.files.find((x) => x.measurement === 'track' && basename(x.path, '.json') === basename(v.path, extname(v.path)));
    clips[id] = { file: rel(v.path), label: i === 0 ? 'As generated' : i === t.evidence.videos.length - 1 ? 'After the change' : `Excerpt ${i + 1}`, ...(m ? { analysis: rel(m.path) } : {}), ...(tr ? { track: rel(tr.path) } : {}) };
    if (!m) notes.push(`${v.path} has no measurement: run tools/capture/analysis/mouth_sync.py on it before overlays can use its voice and mouth.`);
    if (!tr) notes.push(`${v.path} has no landmark track: run tools/capture/analysis/track.py on it (then set "track" on clip ${id}) so the mouth brackets and arrows can follow the face.`);
    else { const a = readJSONIf(join(inv.root, m.path)); const sm = a?.summary?.silent_mouth_movement_seconds; if (sm != null) facts.push({ text: (+sm).toFixed(sm < 1 ? 2 : 1), from: `${id}:summary.silent_mouth_movement_seconds` }); }
  });
  notes.push('Clip order is the order the review lists its evidence: the first excerpt is treated as the problem, the last as the result. Check that this is true.');
  const first = Object.keys(clips)[0], last = Object.keys(clips).pop();
  const meas = (id) => clips[id].analysis ? readJSONIf(join(dir, clips[id].analysis)) : null;
  const m0 = meas(first), mLast = meas(last);
  // beats from the measurement: open on the longest stretch of mouth movement with no voice, if there is one
  const fps = m0?.summary?.fps ?? 24, dur0 = m0?.summary?.seconds ?? t.evidence.videos[0].probe?.seconds ?? 4;
  const voice0 = m0?.summary?.speech_segments?.[0];
  // the hook: from the first mouth movement with no voice to the last one before the line (at most 2.4 s)
  const silentRuns = m0 ? spans(m0.moving.map((mv, i) => (mv && !m0.speech?.[i] ? 1 : 0)), fps).filter((r) => r[1] - r[0] >= 0.15 && (!voice0 || r[1] <= voice0[0])) : [];
  const hook = silentRuns.length ? [Math.max(0, silentRuns[0][0] - 0.1), Math.min(silentRuns[silentRuns.length - 1][1], silentRuns[0][0] + 2.4)] : [0, Math.min(2, dur0)];
  const cut = (s) => +s.toFixed(2);
  const narration = {
    n1: sentence(t.see || t.title), n2: sentence(t.hear || t.see), n3: sentence(t.surfaced || t.see), n4: sentence(t.change), n5: sentence(t.result || t.change), n6: "I'm building HARLEM ’88, and I'm showing the work.",
  };
  const scenes = [
    { id: 'open', template: 'clip', stage: 'see', clip: first, bed: false, beats: [{ play: [cut(hook[0]), cut(hook[1])] }, { hold: cut(hook[1]), narr: 'n1' }],
      props: { overlays: [{ type: 'headline', beat: 0, delay: 0.15, until: 1, text: t.title.split(/\s+/).slice(0, 4).join(' '), size: 'lg' }, ...(m0 ? [{ type: 'track', beat: 0, delay: 0.3, until: 1, target: 'mouth', hot: true }] : []), { type: 'freeze', beat: 1, until: 1 }] } },
    { id: 'see', template: 'clip', stage: 'see', clip: first, beats: [{ play: [0, cut(voice0 ? Math.max(0.5, voice0[0] - 0.05) : Math.min(3, dur0))], audio: 0, narr: 'n2' }, ...(voice0 ? [{ play: [cut(voice0[0] - 0.05), cut(Math.min(dur0, voice0[1] + 0.1))] }] : [])],
      props: { overlays: [{ type: 'chapter', beat: 0, for: 1.9, n: '01', title: 'What you see' }, ...(m0 ? [{ type: 'timeline', beat: 0, delay: 0.6, until: voice0 ? 1 : 0, clip: first, label: 'Lip movement against voice', band: 'top' }] : [])] } },
    { id: 'why', template: 'clip', stage: 'why', clip: first, beats: [{ hold: cut(hook[1]), narr: 'n3' }], props: { overlays: [{ type: 'chapter', beat: 0, for: 1.9, n: '02', title: 'How it surfaced' }] } },
    { id: 'fix', template: 'clip', stage: 'fix', clip: first, beats: [{ hold: cut(hook[1]), narr: 'n4', ...(last !== first ? { b: { clip: last, hold: cut((mLast?.summary?.speech_segments?.[0]?.[0] ?? 0.5)) } } : {}) }],
      props: { ...(last !== first ? { pair: 'side' } : {}), overlays: [{ type: 'chapter', beat: 0, for: 1.7, n: '03', title: 'The fix' }, ...(last !== first ? [{ type: 'compare', beat: 0, delay: 1.75, a: 'As generated', b: 'After the change', bDelay: 0.5 }] : [])] } },
    { id: 'result', template: 'clip', stage: 'result', clip: last, beats: [{ play: [0, cut(mLast?.summary?.seconds ?? 3)] }, { hold: cut(mLast?.summary?.seconds ?? 3), narr: 'n5' }],
      props: { overlays: [{ type: 'chapter', beat: 0, for: 1.8, n: '04', title: 'Did it work' }, ...(mLast ? [{ type: 'track', beat: 0, delay: 0.2, until: 0, target: 'mouth', hot: true }, { type: 'timeline', beat: 1, until: 1, clip: last, label: 'Lip movement against voice' }] : [])] } },
    { id: 'end', template: 'endcard', stage: 'result', narr: 'n6', narrDelay: 0.3, after: 0.8, props: { subs: false, lines: [{ text: "I'm building" }, { text: 'HARLEM ’88,' }, { text: "and I'm showing" }, { text: 'the work.' }], series: `Production Notes, episode ${episode}: ${t.title}` } },
  ];
  facts.push({ text: '88', from: 'record:series name HARLEM ’88' }, { text: String(episode), from: `record:Production Notes episode ${episode}` });
  // a number a draft line quotes from the review is cited to the review; any other number still fails the check
  const said = [t.see, t.hear, t.surfaced, t.change, t.result, t.title].join(' ');
  for (const line of Object.values(narration)) for (const num of line.match(/\d+(?:\.\d+)?/g) ?? [])
    if (!facts.some((f) => f.text === num) && new RegExp(`(^|[^\\d.])${num.replace('.', '\\.')}(?![\\d])`).test(said)) facts.push({ text: num, from: `record:creative review §${t.n}` });
  const sb = { schema: 'qb-capture/documentary@1', status: 'draft', title: `HARLEM ’88: Production Notes, Episode ${episode}: ${t.title}`, corner: 'Production Notes', fps: 30, theme: 'notes', subs: 'words', timecode: true, transition: 'wipe',
    previewTag: 'Draft, not approved', watermark: { file: 'brand/harlem88-logo.svg', label: 'HARLEM ’88 logo · approved file needed' },
    stages: [{ id: 'see', label: 'What you see' }, { id: 'why', label: 'How it surfaced' }, { id: 'fix', label: 'The fix' }, { id: 'result', label: 'Did it work' }],
    source: { topic: t.n, title: t.title, refs: t.refs, review: inv.review }, clips, narration, facts, scenes };
  const file = join(dir, `${slug ?? slugify(t.title)}.json`);
  writeJSON(file, sb);
  writeText(join(dir, 'script.md'), scriptSheet(t, sb, notes));
  return { file, dir, topic: t, notes };
}

// the script with its evidence beside every line, for the founder to edit and approve before a voice is recorded
export function scriptSheet(t, sb, notes = []) {
  const src = { n1: ['What you see', t.see], n2: ['What you hear', t.hear || t.see], n3: ['How it surfaced', t.surfaced || t.see], n4: ['What was changed', t.change], n5: ['Did it work', t.result || t.change], n6: ['Series sign-off', 'fixed line'] };
  const L = [`# ${sb.title}: draft script`, '', `Status: **draft**. Lines are first drafts quoted from the creative review (§${t.n}). Rewrite them in the founder's voice, keep every claim to what the source says, and mark subtitle emphasis with *asterisks*. Numbers in a line need an entry in the storyboard's \`facts\`.`, '',
    '| Line | Draft | Source in the review |', '|---|---|---|'];
  for (const [id, line] of Object.entries(sb.narration)) L.push(`| ${id} | ${line.replace(/\|/g, '\\|')} | ${src[id]?.[0] ?? ''}: ${(src[id]?.[1] ?? '').replace(/\|/g, '\\|').slice(0, 220)} |`);
  if (t.quotes.length) L.push('', `**The founder's words** (usable verbatim): ${t.quotes.map((q) => `"${q}"`).join(' / ')}`);
  if (t.gaps.length || notes.length) L.push('', '**Check before rendering:**', ...[...t.gaps, ...notes].map((g) => `- ${g}`));
  return L.join('\n');
}

// ---- package ---------------------------------------------------------------------------------------------------
// Everything a reviewer needs to approve or reject an episode, in one folder: the render, captions, post copy, the
// evidence behind every claim, and the checklist. Status stays "awaiting approval" until the founder says otherwise.
export function socialCopy(sb, timed) {
  const lines = timed.narration.map((n) => n.text), title = sb.title.replace(/^HARLEM ’88: /, '');
  const hook = lines[0] ?? title, body = lines.slice(1, -1).join(' ');
  return [`# Post copy: ${title}`, '', 'Drafts for the founder to edit. Nothing is posted automatically.', '',
    '## Instagram Reels / TikTok caption', '', `${hook}`, '', body, '', `Production Notes from HARLEM ’88: the real fixes behind an AI-made series, shown on the actual footage.`, '', '#buildinpublic #aifilmmaking #harlem88',
    '', '## YouTube Shorts title', '', `${title} | HARLEM ’88 Production Notes`.slice(0, 100),
    '', '## Alt text', '', `A vertical video. ${timed.scenes.filter((s) => s.template === 'clip').map((s) => sb.clips[s.clip]?.label).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', then ')}, with on-screen notes marking where the mouth moves without a voice, and a closing card.`].join('\n');
}

export function packageEpisode(sbFile, { renderDir, out } = {}) {
  const sb = JSON.parse(readFileSync(sbFile, 'utf8')), base = dirname(resolve(sbFile));
  renderDir = resolve(renderDir ?? join(base, 'documentary'));
  const timed = readJSONIf(join(renderDir, 'documentary-timing.json'));
  if (!timed) throw new Error(`${renderDir}: no documentary-timing.json; run \`doc ${sbFile} --check\` (or a render) first`);
  if (timed.problems?.length) throw new Error(`the storyboard check has problems; fix them before packaging:\n- ${timed.problems.join('\n- ')}`);
  out = resolve(out ?? join(base, 'exports', slugify(basename(sbFile, '.json'))));
  mkdirSync(out, { recursive: true });
  const videos = readdirSync(renderDir).filter((n) => n.endsWith('.mp4'));
  for (const v of videos) copyFileSync(join(renderDir, v), join(out, v));
  if (existsSync(join(renderDir, 'stills'))) { mkdirSync(join(out, 'stills'), { recursive: true }); for (const s of readdirSync(join(renderDir, 'stills')).filter((n) => n.endsWith('.png'))) copyFileSync(join(renderDir, 'stills', s), join(out, 'stills', s)); }
  writeText(join(out, 'captions.srt'), srt(timed.cues));
  writeText(join(out, 'social.md'), socialCopy(sb, timed));
  const recorded = timed.narration.every((n) => n.source === 'recorded');
  const clipRows = Object.entries(sb.clips).map(([id, c]) => { const p = resolve(base, c.file); return `| ${id} | ${c.label} | \`${basename(c.file)}\` | ${existsSync(p) ? sha256File(p).slice(0, 16) : 'missing'} |`; });
  const notes = [`# Production notes: ${sb.title}`, '',
    `- **Status:** ${['final', 'publish'].every((k) => sb.approvals?.[k]) ? 'approved' : 'awaiting the founder\'s approval'}. Nothing has been published.`,
    `- **Length:** ${timed.duration.toFixed(1)} s, ${timed.scenes.length} scenes, 9:16${videos.some((v) => v.includes('16x9')) ? ' and 16:9' : ''}.`,
    `- **Narration:** ${recorded ? 'recorded' : 'not recorded: timings are estimates and the preview is silent'}. Credits spent on this episode: ${(sb.spend ?? []).reduce((a, x) => a + (x.credits ?? 0), 0).toFixed(1)}.`,
    `- **Warnings:** ${(timed.warnings ?? []).join('; ') || 'none'}`, '',
    '## Footage', '', '| Clip | Label | File | sha256 (first 16) |', '|---|---|---|---|', ...clipRows, '',
    '## Every number on screen, and its source', '', '| Shown | Source |', '|---|---|', ...(sb.facts ?? []).map((f) => `| ${f.text} | ${f.from} |`), '',
    '## Script', '', ...timed.narration.map((n) => `- **${n.id}** (${n.start.toFixed(1)} s, ${n.seconds.toFixed(1)} s, ${n.source}): ${n.text}`), '',
    '## Graphics per scene', '', ...timed.scenes.map((s) => `- **${s.id}**: ${[...new Set((s.props?.overlays ?? []).map((o) => o.type))].join(', ') || s.template}`)];
  writeText(join(out, 'production-notes.md'), notes.join('\n'));
  const spent = +(sb.spend ?? []).reduce((a, x) => a + (x.credits ?? 0), 0).toFixed(2); // charges as logged from the provider's transactions
  const approval = { episode: sb.title, status: 'awaiting approval', generated: new Date().toISOString(), credits_spent: spent,
    items: [
      { id: 'script', what: 'Approve the narration script (script.md / the storyboard narration)', status: sb.approvals?.script ? 'approved' : 'pending', ...(sb.approvals?.script ? { by: sb.approvals.script } : {}) },
      { id: 'voice', what: 'Approve the quoted cost, then record the narration in the flighty voice', status: recorded ? 'recorded' : sb.approvals?.voice ? 'approved' : 'pending', ...(sb.approvals?.voice ? { by: sb.approvals.voice } : {}) },
      { id: 'logo', what: 'Supply the approved HARLEM ’88 logo file for the watermark', status: (timed.warnings ?? []).some((w) => /watermark/.test(w)) ? 'missing' : 'ok' },
      { id: 'final', what: 'Approve the final render', status: 'pending' },
      { id: 'publish', what: 'Approve posting (manual; nothing posts automatically)', status: 'pending' }] };
  writeJSON(join(out, 'approval.json'), approval);
  return { out, videos, approval };
}
