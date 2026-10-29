// Storyboard: choose motion-graphics scenes for each story stage, per format, then time them.
// Timing follows the narration: a scene lasts as long as its line takes to say (estimated for previews,
// measured from the audio file once real narration exists), never less than its template needs.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fmtStamp, fmtZone, fmtDay, fmtDate, fmtTime, parts, words, TZ } from './util.mjs';
import { sentenceWith, spoken } from './story.mjs';
import { isWork } from './events.mjs';

export const FPS = 30;
export const FORMATS = { '16x9': { width: 1920, height: 1080 }, '9x16': { width: 1080, height: 1920 } };
const MIN = { intro: 4.4, hook: 4.2, quote: 6, stats: 6.5, device: 7, browser: 6.5, timeline: 9, merge: 8.5, beforeafter: 6.5, checklist: 7.5, lesson: 5.5, outro: 4.6, summary: 6 };
const LEAD = 0.75, TAIL = 0.7, OVERLAP = 0.8, WPS = 2.55;
const LABEL = { goal: 'Goal', process: 'Process', obstacle: 'Obstacle', correction: 'Correction', result: 'Result', lesson: 'Lesson' };

const sentences = (s) => String(s).split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
const shortest = (s) => { const ss = sentences(s).filter((x) => words(x).length >= 2); return ss.length >= 3 ? ss.reduce((a, b) => (b.length < a.length ? b : a)) : null; };
const stamp = (e) => `${fmtStamp(e.t)} ${fmtZone(e.t)}`;
const refsOf = (...xs) => [...new Set(xs.flat().filter(Boolean))];

export function planStoryboard({ session, story, events, metrics, assets, repo, editorial = {} }) {
  const metric = (k) => metrics.find((m) => m.key === k);
  const byId = new Map(events.map((e) => [e.id, e]));
  const work = events.filter((e) => isWork(e) && e.kind !== 'session');
  const stage = (s) => story.stages.find((x) => x.stage === s);
  const present = story.stages.map((s) => s.stage);
  const first = work[0], last = work[work.length - 1];
  const title = editorial.title ?? session.title ?? 'Session recap';
  const sameDay = fmtDate(first.t) === fmtDate(last.t);
  const range = sameDay ? fmtDate(first.t) : `${fmtDay(first.t)} → ${fmtDate(last.t)}`;
  const prompts = metric('prompts'), prs = metric('pull_requests');
  const sid = String(session.id).replace(/^session_/, '');
  const scenes = {};

  scenes.intro = { template: 'intro', brand: true, refs: refsOf('E00', first.id, last.id, prompts?.refs, prs?.refs),
    props: { eyebrow: 'Session recap', title, meta: [range, events[0].data.repo, prompts && `${prompts.display} prompts`, prs && `${prs.display} pull requests`].filter(Boolean) },
    narration: `Session recap. ${title}.` };

  const goal = stage('goal');
  if (goal) {
    const e = byId.get(goal.claims[0].refs[0]);
    scenes.goal = { template: 'quote', stage: 'goal', refs: goal.claims[0].refs, clock: e.t,
      props: { quote: goal.claims[0].text, accent: shortest(goal.claims[0].text), who: 'Founder', when: stamp(e), via: e.data.platform ? `from ${e.data.platform === 'ios' ? 'iPhone' : e.data.platform}` : null },
      narration: goal.narration };
  }

  const proc = stage('process');
  if (proc) {
    const commit = work.find((e) => e.kind === 'commit' && proc.claims.some((c) => c.refs.includes(e.id)));
    const pr = work.find((e) => e.kind === 'pr-open' && proc.claims.some((c) => c.refs.includes(e.id)));
    const items = [metric('build_minutes') && { value: metric('build_minutes').value, unit: 'min', label: 'to build' },
      metric('build_steps') && { value: metric('build_steps').value, unit: 'steps', label: 'agent steps' },
      pr && metric(`pr${pr.data.number}_files`) && { value: metric(`pr${pr.data.number}_files`).value, unit: 'files', label: 'changed' },
      pr && metric(`pr${pr.data.number}_additions`) && { value: metric(`pr${pr.data.number}_additions`).value, prefix: '+', unit: 'lines', label: `−${metric(`pr${pr.data.number}_deletions`).value} removed` }].filter(Boolean);
    const files = (commit?.data.files ?? []).slice().sort((a, b) => (b.added + b.deleted + (b.bytes ?? 0) / 2e4) - (a.added + a.deleted + (a.bytes ?? 0) / 2e4))
      .slice(0, 8).map((f) => ({ path: f.path, added: f.added, deleted: f.deleted, binary: f.binary, size: f.binary ? fmtSize(f.bytes) : null, status: f.status }));
    scenes.stats = { template: 'stats', stage: 'process', refs: refsOf(proc.claims.flatMap((c) => c.refs), metric('build_minutes')?.refs, metric('build_steps')?.refs), clock: commit?.t ?? (goal ? byId.get(goal.claims[0].refs[0]).t : null),
      props: { headline: commit ? commit.data.subject : 'The work', sha: commit?.data.sha.slice(0, 7), items, files, total: commit?.data.files.length ?? files.length },
      narration: proc.narration };

    const video = assets.find((a) => a.kind === 'video' && a.probe?.duration);
    if (video) {
      const art = byId.get(video.provenance.event);
      const reply = work.find((e) => e.kind === 'reply' && e.turn === byId.get(goal?.claims[0].refs[0])?.turn);
      const note = reply && (sentenceWith(reply.text, /\b(every frame|frame by frame|drawn by)\b/i) ?? sentenceWith(reply.text, /\bframes?\b/i));
      const m = (k) => metric(`artifact_${art.id}_${k}`);
      scenes.device = { template: 'device', stage: 'process', refs: refsOf(art.id, reply?.id, m('seconds')?.refs), clock: art.t,
        props: { asset: video.id, kicker: 'The reel', headline: video.path.split('/').pop(), notes: [[m('seconds')?.display, m('size')?.display, m('fps')?.display].filter(Boolean).join(' · '), note, video.path].filter(Boolean),
          aspect: video.probe.width && video.probe.height ? video.probe.width / video.probe.height : 9 / 16 },
        narration: note ? spoken(note) : `The reel: ${video.path}.` };
    }
    const screen = assets.find((a) => a.kind === 'screen');
    if (screen) {
      const pg = byId.get(screen.provenance.event);
      const heads = pageHeadings(repo, screen.provenance.commit, pg.data.path);
      scenes.browser = { template: 'browser', stage: 'process', refs: refsOf(pg.id), clock: pg.t,
        props: { asset: screen.id, url: `quietbands.com${screen.page}`, kicker: 'The page', headline: screen.page, notes: heads.slice(0, 4) },
        narration: `It got its own page${heads.length ? `: ${heads.slice(0, 3).join(', ')}` : ''}.` };
    }
  }

  const obs = stage('obstacle');
  if (obs) {
    const quote = obs.claims.find((c) => c.kind === 'quote');
    const qe = quote && byId.get(quote.refs[0]);
    if (obs.types.includes('unmerged')) {
      const points = work.filter((e) => ['prompt', 'pr-open', 'pr-merge'].includes(e.kind))
        .map((e) => ({ t: e.t, day: fmtDay(e.t), time: fmtTime(e.t), kind: e.kind, label: e.kind === 'prompt' ? `“${e.text.trim()}”` : e.kind === 'pr-open' ? `PR #${e.data.number} opened` : `PR #${e.data.number} merged`, ref: e.id }));
      const wait = obs.claims.find((c) => c.kind === 'wait');
      const open = byId.get(wait.refs[1]), merged = byId.get(wait.refs[0]);
      scenes.timeline = { template: 'timeline', stage: 'obstacle', refs: refsOf(points.map((p) => p.ref), wait.refs), clock: qe?.t,
        props: { headline: 'Then it sat.', zone: fmtZone(first.t), start: first.t, end: last.t, points,
          gap: { from: open.t, to: merged.t, label: `${metric(`pr${merged.data.number}_wait_days`).display} days unmerged`, sub: `PR #${merged.data.number} open ${fmtDay(open.t)} → merged ${fmtDay(merged.t)}` },
          quote: quote ? { text: quote.text, when: stamp(qe), at: qe.t } : null },
        narration: obs.narration };
    } else if (quote) {
      scenes.obstacle = { template: 'quote', stage: 'obstacle', refs: quote.refs, clock: qe.t, props: { quote: quote.text, who: 'Founder', when: stamp(qe) }, narration: obs.narration };
    }
  }

  const cor = stage('correction');
  if (cor) {
    const mergesE = cor.claims.filter((c) => c.kind === 'pr-merge').map((c) => byId.get(c.refs[0]));
    const removed = work.find((e) => e.kind === 'file-removed');
    const admission = obs?.claims.find((c) => c.kind === 'admission');
    const fixCommit = work.find((e) => e.kind === 'commit' && e.tags.includes('fix'));
    const branch = work.find((e) => e.kind === 'pr-open')?.data.head;
    const commitsE = work.filter((e) => e.kind === 'commit');
    scenes.merge = { template: 'merge', stage: 'correction', refs: refsOf(cor.claims.flatMap((c) => c.refs), admission?.refs, commitsE.map((e) => e.id)), clock: mergesE[0]?.t,
      props: { headline: 'Merged.', branch, base: mergesE[0]?.data.base ?? 'main',
        commits: commitsE.map((e) => ({ sha: e.data.sha.slice(0, 7), label: e.data.subject, when: `${fmtDay(e.t)} ${fmtTime(e.t)}`, at: e.t })),
        merges: mergesE.map((e) => ({ pr: e.data.number, when: `${fmtDay(e.t)} ${fmtTime(e.t)}`, at: e.t })),
        removed: removed ? { path: removed.data.path, size: fmtSize(removed.data.bytes), sha: removed.data.removed_in.slice(0, 7), note: fixCommit ? firstSentence(fixCommit.data && fixCommit.text.split('\n\n').slice(1).join(' ')) : null } : null },
      narration: cor.narration };
  }

  const res = stage('result');
  if (res) {
    const before = assets.find((a) => a.id.endsWith('-before')), after = before && assets.find((a) => a.id === before.id.replace(/-before$/, '-after'));
    if (before && after) {
      scenes.beforeafter = { template: 'beforeafter', stage: 'result', refs: refsOf(work.filter((e) => e.kind === 'commit').map((e) => e.id)), clock: last.t,
        props: { headline: `${before.page}${before.anchor ? '#' + before.anchor : ''}`, before: { asset: before.id, label: 'Before', sub: before.provenance.commit.slice(0, 7) }, after: { asset: after.id, label: 'After', sub: after.provenance.commit.slice(0, 7) } },
        narration: `Before and after: ${before.page}.` };
    }
    scenes.checklist = { template: 'checklist', stage: 'result', refs: refsOf(res.claims.flatMap((c) => c.refs)), clock: last.t,
      props: { headline: 'Where it stands', items: res.claims.map((c) => ({ text: c.text, status: c.status, source: c.refs.join(' ') })) },
      narration: res.narration };
  }

  const les = stage('lesson');
  if (les) scenes.lesson = { template: 'lesson', stage: 'lesson', refs: refsOf(les.claims.flatMap((c) => c.refs)), clock: last.t,
    props: { lines: les.claims.map((c) => c.text) }, narration: les.narration };

  scenes.outro = { template: 'outro', brand: true, refs: ['E00'], props: { line: `Built from ${events.length} session events`, sub: `Session ${sid.slice(0, 8)}` }, narration: '' };

  // Landscape: the whole arc. Vertical: a short cut, only when there is real footage and an arc to tell.
  const order16 = ['intro', 'goal', 'stats', 'device', 'browser', 'timeline', 'obstacle', 'merge', 'beforeafter', 'checklist', 'lesson', 'outro'];
  const formats = { '16x9': order16.filter((k) => scenes[k]).map((k) => ({ id: k, ...structuredClone(scenes[k]) })) };
  const footage = assets.some((a) => a.kind === 'video' || a.kind === 'screen');
  const arc = !!(obs || res);
  const vertical = story.level === 'full' && footage && arc;
  if (vertical) {
    const mins = metric('build_minutes'), wait = metrics.find((m) => /_wait_days$/.test(m.key));
    const hook = { id: 'hook', template: 'hook', brand: false, stage: present[0], refs: refsOf(mins?.refs, wait?.refs, 'E00'),
      props: { lines: mins && wait ? [`Built in ${mins.display} minutes.`, `Merged ${wait.display} days later.`] : [title], accent: 1 },
      narration: mins && wait ? `Built in ${mins.display} minutes. Merged ${wait.display} days later.` : title };
    formats['9x16'] = [hook, ...['device', 'browser', 'timeline', 'obstacle', 'merge', 'lesson', 'outro'].filter((k) => scenes[k]).map((k) => ({ id: k, ...structuredClone(scenes[k]) }))];
    if (formats['9x16'].some((s) => s.id === 'device')) formats['9x16'] = formats['9x16'].filter((s) => s.id !== 'browser');
  }

  // Editorial pass (Claude in-session, or the founder): rewrite narration or props, drop scenes. Validated like everything else.
  for (const [fmt, list] of Object.entries(formats)) {
    const ed = editorial.formats?.[fmt] ?? {};
    formats[fmt] = list.filter((s) => !ed[s.id]?.drop).map((s) => (ed[s.id] ? { ...s, ...(ed[s.id].narration != null ? { narration: ed[s.id].narration } : {}), props: merge(s.props, ed[s.id].props ?? {}), refs: refsOf(s.refs, ed[s.id].refs ?? []) } : s));
  }
  return {
    schema: 'qb-capture/storyboard@1', session_id: session.id, title, tz: TZ, fps: FPS, level: story.level,
    stages: present.map((s) => ({ id: s, label: LABEL[s] })), omitted: story.omitted, derived: editorial.derived ?? [],
    vertical: vertical ? 'included' : `skipped: ${story.level !== 'full' ? 'thin evidence' : !footage ? 'no real footage to cut' : 'no obstacle or result to tell'}`,
    formats: Object.fromEntries(Object.entries(formats).map(([k, scenes]) => [k, { ...FORMATS[k], scenes }])),
  };
}

const merge = (a, b) => { if (Array.isArray(b) || typeof b !== 'object' || b === null) return b; const o = { ...a }; for (const k of Object.keys(b)) o[k] = k in o && typeof o[k] === 'object' && !Array.isArray(o[k]) ? merge(o[k], b[k]) : b[k]; return o; };
const firstSentence = (s) => (s ? String(s).replace(/\s+/g, ' ').split(/(?<=\.)\s/)[0] : null);
export const fmtSize = (b) => (b == null ? null : b >= 1e6 ? `${Math.round(b / 1e5) / 10} MB` : `${Math.round(b / 1e3)} KB`);

function pageHeadings(repo, sha, path) {
  try {
    const html = execFileSync('git', ['-C', repo, 'show', `${sha}:${path}`], { encoding: 'utf8', maxBuffer: 32 << 20 });
    return [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&middot;|·/g, '·').replace(/\s+/g, ' ').trim()).filter(Boolean);
  } catch { return []; }
}

// ---- timing -------------------------------------------------------------------------------------
const speechSeconds = (text) => { const w = words(text).length; return w ? w / WPS + 0.28 * Math.max(0, sentences(text).length - 1) : 0; };
export function audioSeconds(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return +(+out).toFixed(3);
}
export function narrationFile(dir, fmt, id) {
  for (const ext of ['wav', 'mp3', 'm4a']) { const f = join(dir, fmt, `${id}.${ext}`); if (existsSync(f)) return f; }
  return null;
}

export function timeStoryboard(sb, { narrationDir } = {}) {
  for (const [fmt, f] of Object.entries(sb.formats)) {
    let t = 0;
    for (const s of f.scenes) {
      const file = narrationDir && s.narration ? narrationFile(narrationDir, fmt, s.id) : null;
      const say = file ? audioSeconds(file) : speechSeconds(s.narration ?? '');
      s.voice = file ? { file, seconds: say, source: 'recorded' } : s.narration ? { seconds: +say.toFixed(2), source: 'estimate' } : null;
      s.duration = +Math.max(MIN[s.template] ?? 5, LEAD + say + TAIL).toFixed(3);
      s.start = +t.toFixed(3);
      s.speech = s.narration ? { start: +(s.start + LEAD).toFixed(3), end: +(s.start + LEAD + say).toFixed(3) } : null;
      t = s.start + s.duration - OVERLAP;
    }
    f.duration = +(t + OVERLAP).toFixed(3);
    f.frames = Math.round(f.duration * sb.fps);
    f.cues = cues(f.scenes);
  }
  return sb;
}

// Caption cues: phrases of at most ~7 words, broken at punctuation where possible, timed by character share.
export function cues(scenes) {
  const out = [];
  for (const s of scenes) {
    if (!s.speech) continue;
    const phrases = [];
    for (const sent of sentences(s.narration)) {
      const w = words(sent);
      let cur = [];
      for (const word of w) {
        cur.push(word);
        if (cur.length >= 7 || (cur.length >= 4 && /[,;:—]$/.test(word))) { phrases.push(cur.join(' ')); cur = []; }
      }
      if (cur.length) { if (cur.length <= 2 && phrases.length && words(phrases[phrases.length - 1]).length <= 6) phrases[phrases.length - 1] += ' ' + cur.join(' '); else phrases.push(cur.join(' ')); }
    }
    const total = phrases.reduce((n, p) => n + p.length, 0);
    let t = s.speech.start;
    const span = s.speech.end - s.speech.start;
    for (const p of phrases) { const d = (p.length / total) * span; out.push({ scene: s.id, start: +t.toFixed(3), end: +(t + d).toFixed(3), text: p }); t += d; }
  }
  return out;
}
