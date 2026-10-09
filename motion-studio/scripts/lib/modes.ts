// Input modes that produce a draft project.json. Each draft validates as written and states the
// assumptions its timing rests on; a human (or Claude in a session) then directs it.
//   idea:   a topic → a five-beat narrative scaffold with placeholder lines to write
//   script: lines of text → timed scenes (timing estimated from reading speed)
//   voice:  a recording (+ optional script) → scenes cut at measured phrase boundaries
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import type {ProjectInput} from '../../src/engine/config/schema';
import {resolveFormat} from '../../src/engine/formats';
import {getTheme} from '../../src/themes';
import {ffmpeg, ffprobe} from './env';
import {PROJECTS} from './project';

const ID = /^[a-z][a-z0-9-]*$/;

export interface DraftOptions {
  id: string;
  title?: string;
  format?: string;
  theme?: string;
  /** End on the brand lockup (brand themes only). */
  brand?: boolean;
}

function checkId(id: string) {
  if (!ID.test(id)) throw new Error(`"${id}" is not a valid project id: lowercase letters, digits and hyphens, starting with a letter.`);
  if (existsSync(path.join(PROJECTS, id, 'project.json'))) throw new Error(`projects/${id} already exists; pick another id or edit it directly.`);
}

export function writeDraft(config: ProjectInput): string {
  const dir = path.join(PROJECTS, config.id);
  mkdirSync(dir, {recursive: true});
  const file = path.join(dir, 'project.json');
  writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
  return file;
}

/** Vertical rhythm for a beat: a display line, then supporting lines below it. */
function beatLayers(sceneId: string, lines: string[], enter: number, exitAt: string, fmt: ReturnType<typeof resolveFormat>) {
  const [head, ...rest] = lines;
  const cy = (fmt.safe.top + fmt.height - fmt.safe.bottom) / 2;
  const base = Math.round(cy - rest.length * 36);
  const layers: ProjectInput['layers'] = [
    {
      id: `${sceneId}-head`,
      preset: 'KineticHeadline',
      from: sceneId,
      to: `${sceneId}.end`,
      params: {text: head, at: `${sceneId}+${enter}`, y: base, maxSize: 260 * (fmt.width / 1080), exit: {at: exitAt, style: 'drop'}},
    },
  ];
  rest.forEach((line, i) =>
    layers.push({
      id: `${sceneId}-line${i + 1}`,
      preset: 'MaskedTextReveal',
      from: sceneId,
      to: `${sceneId}.end`,
      params: {text: line, at: `${sceneId}+${enter + 10 + i * 6}`, y: `@${sceneId}-head.bottom+${56 + i * 64}`, by: 'word', tracking: 'label', exit: {at: exitAt, style: 'drop'}},
    }),
  );
  return layers;
}

function brandScene(start: string, fmtWidth: number): {scene: ProjectInput['scenes'][number]; layers: ProjectInput['layers']} {
  return {
    scene: {id: 'sign', start, end: 'end', title: 'Sign-off', purpose: 'Resolve to the brand and hold.', content: 'Lockup and URL.', composition: 'Lockup centred in the safe area.', transition: 'Final hold.'},
    layers: [
      {id: 'lockup', preset: 'BrandLockup', from: 'sign', params: {width: Math.round(420 * (fmtWidth / 1080)), mark: {at: 'sign+4'}, wordmark: {at: 'sign+12'}}},
      {id: 'url', preset: 'MaskedTextReveal', from: 'sign', params: {text: 'quietbands.com', at: 'sign+20', x: 'center', align: 'center', y: '@lockup.bottom+84', size: 'caption', tracking: 'label', color: 'inkDim'}},
    ],
  };
}

/** Script mode: blank-line-separated blocks become scenes; a block's first line is its display line. */
export function fromScript(text: string, o: DraftOptions): ProjectInput {
  checkId(o.id);
  const theme = getTheme(o.theme ?? 'quiet-bands');
  const fmt = resolveFormat(o.format ?? 'story');
  const fps = 30;
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length);
  if (!blocks.length) throw new Error('The script is empty.');
  const scenes: ProjectInput['scenes'] = [];
  const layers: ProjectInput['layers'] = [];
  let t = 0;
  blocks.forEach((lines, i) => {
    const words = lines.join(' ').split(/\s+/).length;
    // Enter (~0.6s) + reading time + exit (~0.4s), rounded to whole frames.
    const secs = 0.6 + theme.motion.reading.minSeconds + theme.motion.reading.perWord * words + 0.4;
    const len = Math.round(secs * fps);
    const id = `b${i + 1}`;
    scenes.push({id, start: t, end: t + len, title: lines[0], purpose: 'TODO: why this beat exists.', content: lines.join(' / '), composition: 'Display line with supporting lines below.', transition: 'Lines drop through their baselines.'});
    layers.push(...beatLayers(id, lines, 4, `${id}.end-12`, fmt));
    t += len;
  });
  const withBrand = (o.brand ?? true) && Boolean(theme.logo);
  if (withBrand) {
    const b = brandScene(String(t), fmt.width);
    scenes.push(b.scene);
    layers.push(...b.layers);
    t += Math.round(2.5 * fps);
  }
  return {
    id: o.id,
    title: o.title ?? blocks[0][0],
    description: 'Draft from a script (npm run from-script). Direct it: pick presets per beat, add paths and transitions.',
    mode: ['script'],
    theme: theme.id,
    format: fmt.id === 'custom' ? {width: fmt.width, height: fmt.height} : fmt.id,
    fps,
    duration: t,
    scenes,
    layers,
    assumptions: [`Timing is estimated from reading speed (${theme.motion.reading.minSeconds}s + ${theme.motion.reading.perWord}s per word, plus entry and exit), not measured from a recording.`],
  } as ProjectInput;
}

export interface Segment {
  start: number;
  end: number;
}

/** Speech segments between silences (seconds), measured with ffmpeg silencedetect. */
export function speechSegments(file: string, noiseDb = -35, minSilence = 0.25): {segments: Segment[]; duration: number} {
  const duration = Number(execFileSync(ffprobe(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'}).trim());
  const r = spawnSync(ffmpeg(), ['-v', 'info', '-i', file, '-af', `silencedetect=noise=${noiseDb}dB:d=${minSilence}`, '-f', 'null', '-'], {encoding: 'utf8'});
  const silences: Segment[] = [];
  let s: number | null = null;
  for (const line of r.stderr.split('\n')) {
    const a = line.match(/silence_start: (-?[\d.]+)/);
    if (a) s = Math.max(0, Number(a[1]));
    const b = line.match(/silence_end: ([\d.]+)/);
    if (b && s !== null) {
      silences.push({start: s, end: Number(b[1])});
      s = null;
    }
  }
  if (s !== null) silences.push({start: s, end: duration});
  const segments: Segment[] = [];
  let cur = 0;
  for (const sil of silences) {
    if (sil.start - cur > 0.08) segments.push({start: cur, end: sil.start});
    cur = sil.end;
  }
  if (duration - cur > 0.08) segments.push({start: cur, end: duration});
  return {segments, duration};
}

/** Fit n script lines onto measured segments: merge the closest neighbours, or split the longest. */
export function alignLines(segments: Segment[], n: number): {segments: Segment[]; note?: string} {
  let segs = segments.map((x) => ({...x}));
  let note: string | undefined;
  if (segs.length > n) {
    note = `${segments.length} phrases were detected for ${n} lines: neighbouring phrases with the shortest pauses were merged.`;
    while (segs.length > n) {
      let best = 0;
      for (let i = 1; i < segs.length - 1; i++) if (segs[i + 1].start - segs[i].end < segs[best + 1].start - segs[best].end) best = i;
      segs.splice(best, 2, {start: segs[best].start, end: segs[best + 1].end});
    }
  } else if (segs.length < n) {
    note = `${segments.length} phrases were detected for ${n} lines: the longest phrases were split evenly. These boundaries are estimates, not measurements.`;
    while (segs.length < n) {
      let i = 0;
      segs.forEach((x, k) => (x.end - x.start > segs[i].end - segs[i].start ? (i = k) : null));
      const mid = (segs[i].start + segs[i].end) / 2;
      segs.splice(i, 1, {start: segs[i].start, end: mid}, {start: mid, end: segs[i].end});
    }
  }
  return {segments: segs, note};
}

/** Voice mode: scenes cut where the speaker pauses; one display line per phrase. */
export function fromVoice(audio: string, script: string | undefined, o: DraftOptions): {config: ProjectInput; timing: unknown; asset: {from: string; to: string}} {
  checkId(o.id);
  const fps = 30;
  const fmt = resolveFormat(o.format ?? 'story');
  const theme = getTheme(o.theme ?? 'quiet-bands');
  const measured = speechSegments(audio);
  if (!measured.segments.length) throw new Error('No speech detected (everything is below -35 dB or the file is silent).');
  const lines = script ? script.split('\n').map((l) => l.trim()).filter(Boolean) : measured.segments.map((_, i) => `LINE ${i + 1}`);
  const {segments, note} = alignLines(measured.segments, lines.length);
  const ext = path.extname(audio) || '.wav';
  const tail = theme.logo ? 2.5 : 0.8;
  const total = Math.round((measured.duration + tail) * fps);
  const scenes: ProjectInput['scenes'] = [];
  const layers: ProjectInput['layers'] = [];
  segments.forEach((seg, i) => {
    const start = Math.max(0, Math.round(seg.start * fps) - 3);
    const end = i + 1 < segments.length ? Math.max(start + 12, Math.round(segments[i + 1].start * fps) - 3) : Math.round((measured.duration + 0.3) * fps);
    const id = `p${i + 1}`;
    scenes.push({id, start, end, title: lines[i], purpose: 'TODO: why this phrase is on screen.', content: lines[i], composition: 'Display line.', audioCue: `Voice ${seg.start.toFixed(2)}–${seg.end.toFixed(2)}s`});
    layers.push(...beatLayers(id, [lines[i]], 0, `${id}.end-8`, fmt));
  });
  if (theme.logo) {
    const b = brandScene(String(scenes[scenes.length - 1].end), fmt.width);
    scenes.push(b.scene);
    layers.push(...b.layers);
  }
  const config = {
    id: o.id,
    title: o.title ?? lines[0],
    description: 'Draft from a voice recording (npm run voice). Scene cuts follow measured pauses.',
    mode: script ? ['voice', 'script'] : ['voice'],
    theme: theme.id,
    format: fmt.id === 'custom' ? {width: fmt.width, height: fmt.height} : fmt.id,
    fps,
    duration: total,
    scenes,
    layers,
    audio: {tracks: [{id: 'voice', src: `assets/voice${ext}`, fadeOut: 0.2}]},
    assumptions: [
      'Phrase boundaries come from silence detection (−35 dB, ≥0.25 s pauses). There are no word-level timestamps: nothing here is synced to individual words.',
      'Each line enters 3 frames before its phrase starts, so the type leads the voice slightly.',
      ...(note ? [note] : []),
      ...(script ? [] : ['No script was given: lines are placeholders (LINE 1, LINE 2, …) to be replaced with the spoken words.']),
    ],
  } as ProjectInput;
  return {config, timing: {file: path.basename(audio), duration: measured.duration, detected: measured.segments, used: segments, note}, asset: {from: audio, to: `assets/voice${ext}`}};
}

/** Idea mode: a narrative scaffold. It writes structure, not copy: every line is a prompt to fill. */
export function fromIdea(topic: string, o: DraftOptions): ProjectInput {
  const beats = [
    ['HOOK', `What makes someone stop scrolling for "${topic}"? One concrete image or claim.`],
    ['TENSION', 'The problem, made visible: show it piling up or going wrong.'],
    ['TURN', 'The single change in point of view.'],
    ['REVEAL', 'The line you want remembered.'],
  ];
  // The beat lives in the scene's title and purpose; what is on screen is a placeholder to write.
  const script = beats.map(() => 'TODO').join('\n\n');
  const draft = fromScript(script, {...o, title: o.title ?? topic});
  draft.mode = ['idea'];
  draft.description = `Narrative scaffold for "${topic}" (npm run new -- --idea). Replace each TODO line, then run storyboard.`;
  draft.scenes.forEach((s, i) => {
    if (beats[i]) {
      s.title = beats[i][0];
      s.purpose = beats[i][1];
    }
  });
  draft.assumptions = [...(draft.assumptions ?? []), 'Idea mode writes a structure only (hook → tension → turn → reveal → sign-off); the words are yours to write.'];
  return draft;
}

export function readText(file: string) {
  if (!existsSync(file)) throw new Error(`No file at ${file}.`);
  return readFileSync(file, 'utf8');
}
