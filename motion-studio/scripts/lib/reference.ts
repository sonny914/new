// Reference intelligence. Decodes a reference video locally and reports what can be measured
// (metadata, cuts, shot lengths, motion energy, holds, audio level and silences), with contact
// sheets for the parts only a person can judge. The report keeps three lists apart: directly
// observed, reasonably inferred, unknown. Nothing about typefaces, easing curves or intent is
// claimed from numbers alone.
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {contactSheet} from './contact';
import {ffmpeg, ffprobe} from './env';
import {loudness, runs} from './verify';

export interface ReferenceReport {
  file: string;
  meta: {width: number; height: number; fps: number; duration: number; frames: number; vcodec: string; acodec?: string};
  cuts: number[];
  shots: {start: number; end: number; seconds: number}[];
  energy: number[];
  holds: {from: number; to: number}[];
  stillBelow: number;
  bursts: {from: number; to: number}[];
  audio?: {integrated: number; truePeak: number; silences: {start: number; end: number}[]};
}

function meta(file: string) {
  const j = JSON.parse(execFileSync(ffprobe(), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8'}));
  const v = j.streams.find((s: {codec_type: string}) => s.codec_type === 'video');
  if (!v) throw new Error(`${file} has no video stream: cannot analyse it as a motion reference.`);
  const a = j.streams.find((s: {codec_type: string}) => s.codec_type === 'audio');
  const [n, d] = String(v.avg_frame_rate || v.r_frame_rate).split('/').map(Number);
  const fps = n / (d || 1);
  const duration = Number(v.duration ?? j.format.duration);
  return {width: v.width, height: v.height, fps, duration, frames: Math.round(duration * fps), vcodec: v.codec_name, acodec: a?.codec_name};
}

/** Per-frame mean absolute luma change (0–255) and scene-change scores, in one decode. */
function perFrame(file: string) {
  const r = spawnSync(ffmpeg(), ['-v', 'error', '-i', file, '-vf', 'signalstats,scdet=threshold=100,metadata=print:file=-', '-an', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 512 << 20});
  const energy: number[] = [];
  const score: number[] = [];
  let f = -1;
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/^frame:(\d+)/);
    if (m) f = Number(m[1]);
    const y = line.match(/lavfi\.signalstats\.YDIF=([-\d.eE+]+)/);
    if (y) energy[f] = Number(y[1]);
    const s = line.match(/lavfi\.scd\.score=([-\d.eE+]+)/);
    if (s) score[f] = Number(s[1]);
  }
  return {energy: energy.map((e) => e ?? 0), score: score.map((s) => s ?? 0)};
}

export function analyse(file: string, outDir: string, o: {cutThreshold?: number} = {}): ReferenceReport {
  mkdirSync(outDir, {recursive: true});
  const m = meta(file);
  const {energy, score} = perFrame(file);
  const threshold = o.cutThreshold ?? 12;
  // A cut is a frame whose scene score spikes well above its neighbours.
  const cuts: number[] = [];
  score.forEach((s, i) => {
    if (s >= threshold && s >= (score[i - 1] ?? 0) && s >= (score[i + 1] ?? 0) && (!cuts.length || i - cuts[cuts.length - 1] > 3)) cuts.push(i);
  });
  const bounds = [0, ...cuts, energy.length];
  const shots = bounds.slice(1).map((end, i) => ({start: bounds[i], end, seconds: Math.round(((end - bounds[i]) / m.fps) * 100) / 100}));
  // Holds: ≥0.5 s of near-zero change. Bursts: ≥0.2 s well above the median.
  const sorted = [...energy].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  // "Still" adapts to the source: exact holds in motion graphics sit near 0; grainy footage never does.
  const stillBelow = Math.max(0.002, median * 0.02);
  const still = energy.map((e, i) => (e < stillBelow ? i : -1)).filter((i) => i >= 0);
  const holds = runs(still).filter(([a, b]) => b - a + 1 >= m.fps * 0.5).map(([from, to]) => ({from, to}));
  const hot = energy.map((e, i) => (e > Math.max(1, median * 4) ? i : -1)).filter((i) => i >= 0);
  const bursts = runs(hot).filter(([a, b]) => b - a + 1 >= m.fps * 0.2).map(([from, to]) => ({from, to}));

  let audio: ReferenceReport['audio'];
  if (m.acodec) {
    const l = loudness(file);
    const r = spawnSync(ffmpeg(), ['-v', 'info', '-i', file, '-af', 'silencedetect=noise=-40dB:d=0.3', '-vn', '-f', 'null', '-'], {encoding: 'utf8'});
    const silences: {start: number; end: number}[] = [];
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
    if (s !== null) silences.push({start: s, end: m.duration});
    audio = l ? {integrated: l.integrated, truePeak: l.truePeak, silences} : undefined;
  }

  // Contact sheets: one frame from the middle of each shot, and an even sample of the whole.
  const tile = Math.round(Math.min(320, m.width * 0.3));
  const mids = shots.map((s) => Math.round((s.start + s.end) / 2)).slice(0, 48);
  contactSheet(file, path.join(outDir, 'shots.png'), m.fps, {frames: mids, cols: Math.min(6, mids.length), tile});
  const every = Math.max(1, Math.round(m.frames / 30));
  contactSheet(file, path.join(outDir, 'timeline.png'), m.fps, {frames: Array.from({length: Math.ceil(m.frames / every)}, (_, i) => i * every).filter((f) => f < m.frames), cols: 6, tile});
  writeFileSync(path.join(outDir, 'energy.svg'), energySvg(energy, cuts, m.fps));

  const rep: ReferenceReport = {file, meta: m, cuts, shots, energy, holds, stillBelow, bursts, audio};
  writeFileSync(path.join(outDir, 'reference.json'), JSON.stringify({...rep, energy: undefined}, null, 2));
  writeFileSync(path.join(outDir, 'reference.md'), markdown(rep));
  return rep;
}

function energySvg(energy: number[], cuts: number[], fps: number): string {
  const W = 1200;
  const H = 240;
  const max = Math.max(1, ...energy);
  const x = (i: number) => (i / Math.max(1, energy.length - 1)) * W;
  const pts = energy.map((e, i) => `${x(i).toFixed(1)},${(H - 20 - (e / max) * (H - 40)).toFixed(1)}`).join(' ');
  const secs = Math.floor(energy.length / fps);
  const ticks = Array.from({length: secs + 1}, (_, s) => `<line x1="${x(s * fps)}" y1="${H - 20}" x2="${x(s * fps)}" y2="${H - 14}" stroke="#888"/><text x="${x(s * fps) + 2}" y="${H - 4}" font-size="10" fill="#888" font-family="monospace">${s}s</text>`).join('');
  const cutLines = cuts.map((c) => `<line x1="${x(c)}" y1="0" x2="${x(c)}" y2="${H - 20}" stroke="#FF5A00" stroke-width="1"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#000"/>${cutLines}<polyline points="${pts}" fill="none" stroke="#F2EEE5" stroke-width="1.2"/>${ticks}<text x="6" y="14" font-size="11" fill="#F2EEE5" font-family="monospace">motion energy (mean |ΔY| per frame); orange = detected cuts</text></svg>`;
}

const s2 = (n: number) => n.toFixed(2);

function markdown(r: ReferenceReport): string {
  const m = r.meta;
  const t = (f: number) => s2(f / m.fps);
  const avgShot = r.shots.reduce((a, b) => a + b.seconds, 0) / Math.max(1, r.shots.length);
  const firstHalf = r.cuts.filter((c) => c < m.frames / 2).length;
  const secondHalf = r.cuts.length - firstHalf;
  const energyThirds = [0, 1, 2].map((k) => {
    const part = r.energy.slice(Math.floor((k * r.energy.length) / 3), Math.floor(((k + 1) * r.energy.length) / 3));
    return part.reduce((a, b) => a + b, 0) / Math.max(1, part.length);
  });
  const lines = [
    `# Reference analysis — ${path.basename(r.file)}`,
    '',
    'Generated by `npm run reference`. Measurements come from decoding the file with FFmpeg; the contact sheets (`shots.png`, `timeline.png`) and `energy.svg` are for the parts a person must judge.',
    '',
    '## Directly observed',
    '',
    `- ${m.width}×${m.height}, ${s2(m.fps)} fps, ${s2(m.duration)} s (${m.frames} frames), ${m.vcodec}${m.acodec ? ` + ${m.acodec}` : ', no audio stream'}.`,
    `- ${r.cuts.length} hard cut(s) detected${r.cuts.length ? ` at ${r.cuts.map((c) => `${t(c)}s`).join(', ')}` : ''}; ${r.shots.length} shot(s), mean ${s2(avgShot)} s, longest ${s2(Math.max(...r.shots.map((s) => s.seconds)))} s.`,
    `- Still stretches ≥0.5 s (mean |ΔY| < ${r.stillBelow.toFixed(3)}): ${r.holds.length ? r.holds.map((h) => `${t(h.from)}–${t(h.to + 1)}s`).join(', ') : 'none'}.`,
    `- Bursts of high motion ≥0.2 s: ${r.bursts.length ? r.bursts.map((h) => `${t(h.from)}–${t(h.to + 1)}s`).join(', ') : 'none'}.`,
    `- Mean motion energy by third: ${energyThirds.map((e) => s2(e)).join(' → ')} (mean |ΔY| per frame, 0–255).`,
    r.audio
      ? `- Audio: ${s2(r.audio.integrated)} LUFS integrated, ${s2(r.audio.truePeak)} dBFS true peak; silences ≥0.3 s: ${r.audio.silences.length ? r.audio.silences.map((s) => `${s2(s.start)}–${s2(s.end)}s`).join(', ') : 'none'}.`
      : '- Audio: none.',
    '',
    '## Reasonably inferred',
    '',
    `- Editing rhythm: ${r.cuts.length === 0 ? 'one continuous take or continuous transitions (no hard cuts); transitions are made inside the frame.' : avgShot < 1 ? 'fast cutting (shots under a second on average).' : avgShot < 2.5 ? 'moderate cutting.' : 'slow cutting.'}`,
    `- ${secondHalf > firstHalf + 1 ? 'Cuts get more frequent later: an accelerating structure.' : firstHalf > secondHalf + 1 ? 'Cuts thin out later: it settles toward the end.' : 'Cut density is roughly even across the piece.'}`,
    `- Energy shape: ${energyThirds[1] > energyThirds[0] * 1.5 && energyThirds[1] > energyThirds[2] * 1.5 ? 'builds to the middle, then settles: a tension-and-release arc.' : energyThirds[2] > energyThirds[0] * 1.5 ? 'keeps building to the end.' : energyThirds[0] > energyThirds[2] * 1.5 ? 'front-loaded: busiest at the start.' : 'roughly level throughout.'}`,
    `- ${r.holds.length ? `There ${r.holds.length === 1 ? 'is a deliberate hold' : `are ${r.holds.length} deliberate holds`}; the last at ${t(r.holds[r.holds.length - 1].from)}s${r.holds[r.holds.length - 1].to >= m.frames - 2 ? ' runs to the end (an end-card hold)' : ''}.` : 'No holds: motion never fully stops.'}`,
    ...(r.audio && r.audio.silences.some((s) => s.start > 0.5 && s.end < m.duration - 0.5) ? ['- Audio drops out mid-piece: likely a deliberate silence beat; check it against the holds above.'] : []),
    '',
    '## Unknown or unverified',
    '',
    '- Typefaces, weights and tracking: not measurable from pixels here. Identify by eye from the contact sheets, and do not name a font unless it is confirmed.',
    '- Easing curves and overshoot: frame differences show when things move, not the shape of the curve. Step through the file frame by frame before claiming a curve.',
    '- Layout grid, colour values and intent: judge from the sheets; sample colours from a decoded frame if exact values matter.',
    '- Anything outside the file (who made it, why, with what tools).',
    '',
    '## Reviewer notes (fill in after watching)',
    '',
    '| Area | Observation | Recipe it suggests |',
    '|---|---|---|',
    '| Composition (alignment, grid, hierarchy, negative space) | | |',
    '| Typography (scale, weight, tracking, line breaks, masks) | | |',
    '| Animation (easing, velocity, staggering, transforms) | | |',
    '| Transitions (match cuts, wipes, morphs, masking) | | |',
    '| Narrative (hook, sequencing, payoff, ending) | | |',
    '',
    'Translate confirmed techniques into presets or project recipes (see docs/PRESET_CATALOG.md); do not copy a reference shot for shot.',
    '',
  ];
  return lines.join('\n');
}
