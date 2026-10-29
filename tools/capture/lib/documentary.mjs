// Documentary mode: a hand-approved storyboard of real footage (qb-capture/documentary@1), cut around each clip's
// own sound. A scene is a run of beats: a stretch of a clip playing with its audio, or a held frame that the
// narration speaks over. Before anything renders, two rules are checked: narration never lands on a clip's
// dialogue, and every number on screen matches the measurement or record entry it cites.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join, basename, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { sha256File, fmtStamp, fmtZone, TZ } from './util.mjs';
import { framesFor } from './assets.mjs';
import { audioSeconds, trimmedNarration, speechSeconds } from './storyboard.mjs';

export const PAD = 0.45, OVER = 0.8, LEAD = 0.25, TAIL = 0.45, FPS = 30, FRAME_HEIGHT = 1440;
export const FORMATS = { '16x9': [1920, 1080], '9x16': [1080, 1920] };
const SPEECH_LUFS = -18; // footage dialogue is levelled to this before the final mix, so takes sit together

export function loadDoc(file) {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  if (doc.schema !== 'qb-capture/documentary@1') throw new Error(`${file}: not a qb-capture/documentary@1 storyboard`);
  doc.base = dirname(resolve(file));
  for (const c of Object.values(doc.clips)) for (const k of ['file', 'analysis', 'track']) if (c[k]) c[k] = resolve(doc.base, c[k]);
  return doc;
}

// Per-frame series from the clip's measurement file (tools: mouth_sync.py) and track file (track.py). "Silent"
// frames are rebuilt exactly as the measurement made them: mouth moving, outside a 0.2 s guard around voice.
const clipCache = new Map();
export function clipData(c) {
  if (clipCache.has(c.analysis)) return clipCache.get(c.analysis);
  const a = JSON.parse(readFileSync(c.analysis, 'utf8')), s = a.summary, fps = s.fps, n = a.moving.length;
  const voiced = new Array(n).fill(0), near = new Array(n).fill(false), g = Math.trunc(0.2 * fps);
  for (const [st, en] of s.speech_segments) {
    const A = Math.round(st * fps), B = Math.round(en * fps);
    for (let i = A; i < Math.min(n, B); i++) voiced[i] = 1;
    for (let i = Math.max(0, A - g); i < Math.min(n, B + g); i++) near[i] = true;
  }
  const tr = c.track && existsSync(c.track) ? JSON.parse(readFileSync(c.track, 'utf8')) : null;
  const d = { fps, n, seconds: s.seconds, summary: s, segments: s.speech_segments, db: a.audio_db.map((v) => +v.toFixed(1)), floor: s.noise_floor_db, thr: s.speech_threshold_db,
    voiced, silent: a.moving.map((m, i) => (m && !near[i] ? 1 : 0)), mouth: tr?.mouth ?? null, eyes: tr?.eyes ?? null };
  clipCache.set(c.analysis, d);
  return d;
}
// seconds of silent mouth movement from src0 up to src1, counted per source frame (what the on-screen counter shows)
export const silentSeconds = (d, src0, src1) => {
  let k = 0; for (let i = Math.floor(src0 * d.fps); i <= Math.min(d.n - 1, Math.floor(src1 * d.fps)); i++) k += d.silent[i];
  return k / d.fps;
};

// Facts: `<clip>:summary.<key>`, `<clip>:speech.<i>.length`, `<clip>:gap.<i>` (silence after speech segment i) are
// read from the measurements; `record:<id>` and `verified:<evidence file>` are cited but checked by a person.
export function factValue(doc, from) {
  const [src, path] = from.split(/:(.*)/s);
  if (src === 'record' || src === 'verified') return null;
  const c = doc.clips[src]; if (!c) throw new Error(`fact source "${from}": no clip "${src}"`);
  const d = clipData(c), [kind, a, b] = path.split('.');
  if (kind === 'summary') return d.summary[a];
  if (kind === 'speech' && b === 'length') return d.segments[+a][1] - d.segments[+a][0];
  if (kind === 'gap') return d.segments[+a + 1][0] - d.segments[+a][1];
  throw new Error(`fact source "${from}": unknown measurement`);
}
const numbers = (text) => (String(text).match(/\d+(?:\.\d+)?/g) ?? []);

function voiceLine(doc, id, narrationDir) {
  const text = doc.narration?.[id];
  if (text == null) throw new Error(`narration line "${id}" is not in the storyboard's script`);
  const raw = narrationDir && existsSync(join(narrationDir, `${id}.wav`)) ? join(narrationDir, `${id}.wav`) : null;
  const file = raw ? trimmedNarration(raw) : null;
  return { id, text, file, recording: raw, seconds: +(file ? audioSeconds(file) : speechSeconds(text)).toFixed(3), source: file ? 'recorded' : 'estimate' };
}

const gainCache = new Map();
function speechGain(c) {
  if (gainCache.has(c.file)) return gainCache.get(c.file);
  const out = execFileSync('sh', ['-c', `ffmpeg -nostdin -hide_banner -i "$1" -af ebur128 -f null - 2>&1 | tail -n 12`, 'sh', c.file], { encoding: 'utf8' });
  const I = +(out.match(/I:\s+(-?[\d.]+) LUFS/)?.[1] ?? NaN);
  const g = Number.isFinite(I) ? +Math.min(4, Math.max(0.25, 10 ** ((SPEECH_LUFS - I) / 20))).toFixed(3) : 1;
  gainCache.set(c.file, g);
  return g;
}

// Lay out every scene's beats in time, place the narration and the footage sound, and collect problems.
export function timeDoc(doc, { narrationDir = null } = {}) {
  const problems = [], narration = [], clips = [], mute = [], scenes = [];
  let t = 0;
  doc.scenes.forEach((sc, k) => {
    const out = { ...sc, start: +t.toFixed(3) };
    let lt = PAD;
    if (sc.template === 'clip') {
      // Beats lay out one after another. A held frame lasts as long as the narration running over it (or `dur`).
      // A stretch with its sound up never starts under narration: the previous frame is held until the line ends,
      // so a longer recording re-times the cut instead of talking over the footage.
      let clip = sc.clip, zoom = null, prev = null, narrEnd = 0;
      const beats = [], at = [];
      const push = (beat) => { beat.k = beats.length; beats.push(beat); lt = beat.t1; prev = beat; return beat; };
      sc.beats.forEach((b, j) => {
        const c = b.clip ?? clip; if (!doc.clips[c]) throw new Error(`scene ${sc.id} beat ${j}: no clip "${c}"`);
        if (c !== clip) zoom = null;
        clip = c; zoom = b.zoom ?? zoom ?? [0, 0, 1, 1];
        const d = clipData(doc.clips[c]), kind = b.play ? 'play' : 'hold';
        const src0 = kind === 'play' ? b.play[0] : b.hold, src1 = kind === 'play' ? b.play[1] : b.hold;
        if (src0 < 0 || src1 > d.seconds + 1e-6 || src1 < src0) problems.push(`${sc.id} beat ${j}: ${c} has no ${src0}–${src1} s (it runs ${d.seconds} s)`);
        const gain = kind === 'play' && d.summary.has_audio !== false ? (b.audio ?? 1) : 0;
        if (kind === 'play' && gain > 0.2 && prev && narrEnd + TAIL > lt + 1e-6)
          push({ j: null, auto: true, clip: prev.clip, kind: 'hold', src0: prev.src1, src1: prev.src1, t0: +lt.toFixed(3), t1: +(narrEnd + TAIL).toFixed(3), zoom: prev.zoom, gain: 0, narr: null, stage: prev.stage });
        let v = null;
        if (b.narr) { v = voiceLine(doc, b.narr, narrationDir); narrEnd = lt + LEAD + v.seconds; narration.push({ ...v, scene: sc.id, start: +(t + lt + LEAD).toFixed(3) }); }
        const dur = kind === 'play' ? src1 - src0 : b.dur ?? Math.max(b.min ?? 0, narrEnd > lt ? narrEnd - lt + TAIL : 1);
        const beat = push({ j, clip: c, kind, src0, src1, t0: +lt.toFixed(3), t1: +(lt + dur).toFixed(3), zoom, gain, narr: b.narr ?? null, stage: b.stage ?? prev?.stage ?? sc.stage });
        at[j] = beat.k;
        if (b.b) beat.b = { clip: b.b.clip, src: b.b.hold, zoom: b.b.zoom ?? [0, 0, 1, 1] };
        if (kind === 'play' && gain > 0) clips.push({ file: doc.clips[c].file, clip: c, src: src0, dur: +(src1 - src0).toFixed(3), start: +(t + beat.t0).toFixed(3), level: gain, gain: +(gain * speechGain(doc.clips[c])).toFixed(3), scene: sc.id });
      });
      // a scene's last held frame also waits for its narration
      if (narrEnd + TAIL > lt + 1e-6 && prev.kind === 'hold') { prev.t1 = +(narrEnd + TAIL).toFixed(3); lt = prev.t1; }
      else if (narrEnd + TAIL > lt + 1e-6) push({ j: null, auto: true, clip: prev.clip, kind: 'hold', src0: prev.src1, src1: prev.src1, t0: +lt.toFixed(3), t1: +(narrEnd + TAIL).toFixed(3), zoom: prev.zoom, gain: 0, narr: null, stage: prev.stage });
      // narration may play over footage only where that footage has no dialogue
      for (const n of narration.filter((x) => x.scene === sc.id)) for (const bt of beats.filter((x) => x.kind === 'play')) {
        const a0 = Math.max(n.start - t, bt.t0), a1 = Math.min(n.start - t + n.seconds, bt.t1); if (a1 - a0 <= 0.05) continue;
        const d = clipData(doc.clips[bt.clip]), s0 = bt.src0 + (a0 - bt.t0), s1 = bt.src0 + (a1 - bt.t0);
        if (d.voiced.slice(Math.floor(s0 * d.fps), Math.ceil(s1 * d.fps)).some(Boolean)) problems.push(`${sc.id}: narration "${n.id}" would talk over ${bt.clip}'s dialogue (${s0.toFixed(2)}–${s1.toFixed(2)} s)`);
      }
      out.beats = beats;
      out.duration = +(lt + PAD).toFixed(3);
      const span = (o, what) => {
        const b0 = out.beats[at[o.beat ?? 0]]; if (!b0) { problems.push(`${sc.id}: ${what} points at beat ${o.beat}, which doesn't exist`); return null; }
        const end = o.until == null ? out.duration - PAD : o.until === 'end' ? out.duration : out.beats[at[o.until]]?.t1;
        return { ...o, beat: b0.k, t0: +(b0.t0 + (o.delay ?? 0)).toFixed(3), t1: +(end ?? out.duration).toFixed(3) };
      };
      out.props = { ...sc.props };
      for (const key of ['labels', 'lines', 'marks']) out.props[key] = (sc.props?.[key] ?? []).map((o) => span(o, key)).filter(Boolean);
      for (const key of ['ring', 'strip']) if (sc.props?.[key]) out.props[key] = span(sc.props[key], key);
      if (sc.props?.strip?.all != null) out.props.strip.all = at[sc.props.strip.all];
      // a counting label must end on the number its fact cites
      for (const l of out.props.labels.filter((x) => x.count)) {
        const b = out.beats[l.beat], d = clipData(doc.clips[b.clip]);
        const last = out.beats.filter((x) => x.clip === b.clip && x.kind === 'play' && x.k >= b.k && x.t0 < l.t1).pop() ?? b;
        l.countFrom = b.src0; l.final = silentSeconds(d, b.src0, last.src1).toFixed(l.decimals ?? 1);
        l.shown = l.text.replace('{count}', l.final);
      }
    } else {
      const v = sc.narr ? voiceLine(doc, sc.narr, narrationDir) : null, at = PAD + (sc.narrDelay ?? 0.6);
      out.duration = +Math.max(sc.dur ?? 4, v ? at + LEAD + v.seconds + TAIL + (sc.after ?? 0.9) + PAD : 0).toFixed(3);
      if (v) narration.push({ ...v, scene: sc.id, start: +(t + at + LEAD).toFixed(3) });
    }
    if (sc.bed === false) mute.push({ start: out.start, end: +(out.start + out.duration - (k === doc.scenes.length - 1 ? 0 : OVER / 2)).toFixed(3) });
    scenes.push(out);
    t = t + out.duration - (k === doc.scenes.length - 1 ? 0 : OVER);
  });
  const duration = +t.toFixed(3);
  // overlapping narration, and narration over any footage sound that isn't room tone
  const sorted = [...narration].sort((a, b) => a.start - b.start);
  sorted.forEach((n, i) => { const m = sorted[i + 1]; if (m && m.start < n.start + n.seconds) problems.push(`narration "${n.id}" runs into "${m.id}"`); });
  for (const n of narration) for (const c of clips) {
    const a = Math.max(n.start, c.start), b = Math.min(n.start + n.seconds, c.start + c.dur);
    if (b - a > 0.05 && c.level > 0.2) problems.push(`narration "${n.id}" overlaps ${c.clip}'s sound in ${c.scene} (${a.toFixed(2)}–${b.toFixed(2)} s)`);
  }
  // every number on screen must be a cited fact
  const facts = new Map();
  for (const f of doc.facts ?? []) {
    const v = factValue(doc, f.from);
    if (v != null) {
      const dec = (f.text.split('.')[1] ?? '').length, got = (+v).toFixed(dec);
      if (got !== f.text) problems.push(`fact "${f.text}" cites ${f.from}, which measures ${got}`);
    }
    facts.set(f.text, f);
  }
  for (const sc of scenes) {
    const shown = [...(sc.props?.labels ?? []).map((l) => l.shown ?? l.text), ...(sc.props?.lines ?? []).map((l) => l.text), ...(sc.props?.marks ?? []).map((m) => m.text ?? ''),
      ...(sc.props?.strip?.marks ?? []).map((m) => m.text), sc.props?.quote ?? '', ...(sc.template === 'lesson' ? sc.props.lines : [])];
    for (const s of shown) for (const num of numbers(s)) if (!facts.has(num)) problems.push(`${sc.id}: "${s}" shows ${num}, which no fact cites`);
  }
  const cues = narration.map((n) => ({ start: n.start, end: +(n.start + n.seconds).toFixed(3), text: n.text })).sort((a, b) => a.start - b.start);
  return { title: doc.title, fps: doc.fps ?? FPS, duration, frames: Math.round(duration * (doc.fps ?? FPS)), scenes, narration, clips, mute, cues, problems };
}

// What the stage needs for one format: timed scenes, frame sequences for every clip used, and each clip's series.
export async function docPayload(doc, timed, fmt, { cacheDir, preview = false }) {
  const [width, height] = FORMATS[fmt], fps = timed.fps;
  const used = new Set(timed.scenes.flatMap((s) => (s.beats ?? []).flatMap((b) => [b.clip, b.b?.clip].filter(Boolean))));
  const assets = {};
  for (const id of used) {
    const c = doc.clips[id], d = clipData(c);
    const fr = await framesFor({ id, path: basename(c.file), sha256: sha256File(c.file), root: 'archive' }, dirname(c.file), null, { fps, height: FRAME_HEIGHT, cacheDir });
    assets[id] = { kind: 'clip', label: c.label, frames: { base: `/__media/${relative(cacheDir, fr.dir).split('\\').join('/')}/`, count: fr.count, fps },
      srcFps: d.fps, seconds: d.seconds, db: d.db, floor: d.floor, thr: d.thr, voiced: d.voiced, silent: d.silent, mouth: d.mouth, eyes: d.eyes };
  }
  const stages = doc.stages;
  return {
    format: fmt, width, height, fps, duration: timed.duration, frames: timed.frames, tz: TZ, doc: true, corner: doc.corner ?? 'Production recap',
    captions: preview || doc.burnCaptions === true, capTag: preview ? (doc.previewTag ?? 'Narration · not recorded yet') : null,
    stages, cues: timed.cues, assets, brand: { mark: '/assets/brand/mark.svg', wordmark: '/assets/brand/wordmark.svg' },
    scenes: timed.scenes.map((s) => ({ ...s, stageIndex: stages.findIndex((x) => x.id === s.stage) + 1, stageLabel: stages.find((x) => x.id === s.stage)?.label ?? '',
      sources: s.sources ?? '', clockLabel: s.clock ? `${fmtStamp(s.clock)} ${fmtZone(s.clock)}` : '' })),
  };
}
