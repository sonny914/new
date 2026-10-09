// The production pipeline: validate → storyboard → sound → preview render → QA → (final master →
// delivery encode → verification → package). A final render refuses to start until a preview of
// the exact same project file has passed QA.
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {resolveTime} from '../../src/engine/time';
import type {Prepared} from '../../src/engine/types';
import {contactSheet, sceneFrames, transitionFrames} from './contact';
import {encodeDelivery, plan} from './encode';
import {machine} from './env';
import {engineHash, STUDIO, validate, report, type LoadedProject} from './project';
import {makeBundle, video, type QaLog} from './render';
import {writeSounds} from './sound';
import {writeStoryboard} from './storyboard';
import {blankFrames, boxes, decodeErrors, freezes, hexRgb, loudness, pixel, probe, rgbDistance, runs, type Check} from './verify';

const log = (s: string) => console.log(s);
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const rel = (f: string) => path.relative(process.cwd(), f);

function prepare(p: LoadedProject): Prepared {
  const v = validate(p);
  report(v, rel(p.file));
  if (!v.ok || !v.prepared) throw new Error('Validation failed: fix the project file first.');
  return v.prepared;
}

function qaFrames(prep: Prepared): number[] {
  const f = new Set<number>(sceneFrames(prep.scenes));
  prep.scenes.forEach((s) => f.add(s.to - 1));
  return [...f].filter((x) => x >= 0 && x < prep.duration).sort((a, b) => a - b);
}

/** Layout QA from the browser probe: type and brand marks at rest must sit inside the safe area. */
function layoutChecks(prep: Prepared, qa: QaLog[]): Check[] {
  const checks: Check[] = [];
  const {width: W, height: H, safe} = prep.format;
  const presetOf = new Map(prep.layers.map((l) => [l.id, l.preset]));
  const exempt = prep.project.qa.allowUnsafe.map((e) => ({...e, a: resolveTime(e.from, prep.time), b: resolveTime(e.to, prep.time)}));
  const intended = new Map<string, number>();
  const seen = new Set<string>();
  for (const entry of qa)
    for (const it of entry.items) {
      const preset = presetOf.get(it.layer) ?? '';
      if (preset === 'Accent') continue; // the accent may travel anywhere, including off-canvas
      const key = `${it.layer}@${entry.frame}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = {l: it.x, t: it.y, r: it.x + it.w, b: it.y + it.h};
      const tol = 1;
      if (r.l < -tol || r.t < -tol || r.r > W + tol || r.b > H + tol)
        checks.push({name: 'text overflow', ok: false, level: 'error', detail: `${it.layer} (${preset}) leaves the canvas at frame ${entry.frame}: ${fmtBox(r)}`});
      else if (r.l < safe.left - tol || r.t < safe.top - tol || r.r > W - safe.right + tol || r.b > H - safe.bottom + tol) {
        const ok = exempt.find((e) => e.layer === it.layer && entry.frame >= e.a && entry.frame < e.b);
        if (ok) intended.set(`${it.layer}: ${ok.reason}`, (intended.get(`${it.layer}: ${ok.reason}`) ?? 0) + 1);
        else checks.push({name: 'safe margins', ok: false, level: 'warning', detail: `${it.layer} (${preset}) crosses the safe area at frame ${entry.frame}: ${fmtBox(r)}`});
      }
    }
  for (const [why, n] of intended) checks.push({name: 'safe margins (intended)', ok: true, level: 'info', detail: `${why} — ${n} frame(s), declared in qa.allowUnsafe`});
  const items = qa.reduce((n, e) => n + e.items.length, 0);
  if (!checks.some((c) => !c.ok)) checks.push({name: 'safe margins', ok: true, level: 'info', detail: `${items} element bounds checked at rest across ${qa.length} frames; all inside the safe area.`});
  if (!qa.length) checks.push({name: 'layout probe', ok: false, level: 'error', detail: 'The QA probe reported nothing: layout was not checked.'});
  return checks;
}
const fmtBox = (r: {l: number; t: number; r: number; b: number}) => `[${Math.round(r.l)},${Math.round(r.t)} → ${Math.round(r.r)},${Math.round(r.b)}]`;

function mediaChecks(prep: Prepared, file: string, o: {scale: number; delivery: boolean; targetBytes?: number; qa?: QaLog[]}): {checks: Check[]; probe: ReturnType<typeof probe>} {
  const pr = probe(file);
  const c: Check[] = [];
  const add = (name: string, ok: boolean, detail: string, level: Check['level'] = 'error') => c.push({name, ok, level: ok ? 'info' : level, detail});
  // 4:2:0 video needs even dimensions; scaled previews round down to the nearest even size.
  const even = (v: number) => (o.scale === 1 ? v : Math.floor((v * o.scale) / 2) * 2);
  const W = even(prep.format.width);
  const H = even(prep.format.height);
  add('dimensions', pr.width === W && pr.height === H, `${pr.width}×${pr.height} (expected ${W}×${H})`);
  add('frame rate', Math.abs(pr.fps - prep.fps) < 0.01, `${pr.fps} fps (expected ${prep.fps})`);
  add('frame count', pr.frames === prep.duration, `${pr.frames} frames (expected ${prep.duration})`);
  add('duration', Math.abs(pr.durationSec - prep.duration / prep.fps) <= 1 / prep.fps + 1e-3, `${pr.durationSec.toFixed(3)}s (expected ${(prep.duration / prep.fps).toFixed(3)}s)`);
  add('video codec', pr.vcodec === 'h264', `${pr.vcodec} ${pr.profile}`);
  const wantsAudio = prep.project.audio.tracks.length > 0;
  add('audio present', wantsAudio ? pr.acodec === 'aac' : true, wantsAudio ? `${pr.acodec ?? 'none'} ${pr.sampleRate ?? ''}Hz ${pr.channels ?? ''}ch` : 'project has no audio tracks');
  if (wantsAudio && pr.audioDurationSec !== undefined)
    add('audio length', Math.abs(pr.audioDurationSec - pr.durationSec) < 0.1, `audio ${pr.audioDurationSec.toFixed(3)}s vs video ${pr.durationSec.toFixed(3)}s`, 'warning');
  const errs = decodeErrors(file);
  add('decodes cleanly', !errs, errs ? errs.split('\n').slice(0, 3).join(' | ') : 'full decode, no errors');
  // Blank frames outside the ranges the project allows.
  const allowed = prep.project.qa.allowBlank.map((r) => [resolveTime(r.from, prep.time), resolveTime(r.to, prep.time)] as const);
  const blank = blankFrames(file).filter((f) => !allowed.some(([a, b]) => f >= a && f < b));
  const long = runs(blank).filter(([a, b]) => b - a + 1 > prep.project.qa.maxBlankRun);
  add('blank frames', long.length === 0, long.length ? `unexpected blank runs: ${long.map(([a, b]) => `${a}–${b}`).join(', ')}` : `${blank.length} isolated blank frame(s) outside allowed ranges; none longer than ${prep.project.qa.maxBlankRun}`);
  const fr = freezes(file);
  c.push({name: 'holds', ok: true, level: 'info', detail: fr.length ? fr.map((f) => `${f.start.toFixed(2)}–${f.end.toFixed(2)}s`).join(', ') + ' (still frames ≥0.5s; confirm each is intended)' : 'no still stretch ≥0.5s'});
  if (o.delivery) {
    add('pixel format', pr.pixFmt === 'yuv420p', pr.pixFmt);
    add('colour space', pr.colorSpace === 'bt709', pr.colorSpace);
    const b = boxes(file);
    add('fast start', b.indexOf('moov') > -1 && b.indexOf('moov') < b.indexOf('mdat'), b.join(' → '));
    if (o.targetBytes) add('file size', pr.bytes <= o.targetBytes, `${(pr.bytes / 1e6).toFixed(2)} MB (target ≤ ${(o.targetBytes / 1e6).toFixed(0)} MB), ${pr.bitrateKbps} kb/s`);
    if (wantsAudio) {
      const l = loudness(file);
      if (l) {
        add('true peak', l.truePeak <= -0.5, `${l.truePeak.toFixed(1)} dBFS true peak`, 'warning');
        c.push({name: 'loudness', ok: true, level: 'info', detail: `${l.integrated.toFixed(1)} LUFS integrated`});
      }
    }
    if (o.qa) c.push(...colourChecks(prep, file, o.qa));
  }
  return {checks: c, probe: pr};
}

/** Brand colour fidelity in the decoded file: accent at rest, ink inside the mark's stem, ground. */
function colourChecks(prep: Prepared, file: string, qa: QaLog[]): Check[] {
  const out: Check[] = [];
  const t = prep.theme;
  const at = (layerPreset: string) => {
    for (let i = qa.length - 1; i >= 0; i--) {
      const it = qa[i].items.find((x) => prep.layers.find((l) => l.id === x.layer)?.preset === layerPreset);
      if (it) return {frame: qa[i].frame, it};
    }
    return undefined;
  };
  const sample = (name: string, hex: string, frame: number, x: number, y: number, tol: number) => {
    const got = pixel(file, frame, x, y);
    const want = hexRgb(hex);
    const d = rgbDistance(got, want);
    out.push({name: `colour: ${name}`, ok: d <= tol, level: d <= tol ? 'info' : 'warning', detail: `rgb(${got.join(',')}) vs ${hex} at (${Math.round(x)},${Math.round(y)}) f${frame}: Δ${d.toFixed(1)}`});
  };
  const accent = at('Accent');
  if (accent) sample('accent', t.color.accent, accent.frame, accent.it.x + accent.it.w / 2, accent.it.y + accent.it.h / 2, 16);
  const lock = at('BrandLockup');
  if (lock && t.logo) {
    const k = lock.it.w / 845;
    // Centre of the mark's stem in lockup.svg units (stem x 351–472, mark scaled 0.7874 and moved 98.1).
    sample('ink (mark stem)', t.color.ink, lock.frame, lock.it.x + (98.1 + 411.5 * 0.7874) * k, lock.it.y + 329 * 0.7874 * k, 10);
    sample('ground', t.color.ground, lock.frame, 24, 24, 10);
  }
  if (!out.length) out.push({name: 'colour', ok: true, level: 'info', detail: 'No accent or lockup at rest to sample.'});
  return out;
}

function writeReport(dir: string, title: string, sections: Record<string, Check[]>, extra: string[]) {
  const lines = [`# ${title}`, '', ...extra, ''];
  let errors = 0;
  let warnings = 0;
  for (const [name, checks] of Object.entries(sections)) {
    lines.push(`## ${name}`, '', '| | Check | Detail |', '|---|---|---|');
    for (const c of checks) {
      if (!c.ok && c.level === 'error') errors++;
      if (!c.ok && c.level === 'warning') warnings++;
      lines.push(`| ${c.ok ? '✓' : c.level === 'error' ? '✗' : '!'} | ${c.name} | ${c.detail.replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
  }
  lines.push(
    '## Visual review',
    '',
    'Automated checks cannot judge aesthetics. Open the contact sheets in this folder (overview, scenes, transitions) and watch the file before shipping.',
    '',
  );
  writeFileSync(path.join(dir, 'report.md'), lines.join('\n'));
  return {errors, warnings};
}

export async function runPreview(p: LoadedProject) {
  const t0 = Date.now();
  const prep = prepare(p);
  mkdirSync(p.outDir, {recursive: true});
  const sb = writeStoryboard(prep, p.dir);
  log(`storyboard: ${rel(path.join(p.dir, 'storyboard.md'))}`);
  for (const s of writeSounds(p, prep)) log(`sound: ${rel(s.file)} (${s.cues} cues)`);
  const b = await makeBundle(p);
  log(`bundle: ${(b.ms / 1000).toFixed(1)}s`);
  const scale = prep.project.export.previewScale;
  const file = path.join(p.outDir, 'preview.mp4');
  const r = await video(p, b, {file, scale, crf: 26, quality: 'preview', qaFrames: qaFrames(prep), onProgress: (pct) => log(`preview: ${pct}%`)});
  log(`preview: ${rel(file)} — ${r.frames} frames in ${(r.ms / 1000).toFixed(1)}s (${r.fps.toFixed(1)} fps)`);
  const layout = layoutChecks(prep, r.qa);
  if (r.browserErrors.length) layout.push({name: 'browser errors', ok: false, level: 'error', detail: r.browserErrors.slice(0, 3).join(' | ')});
  const media = mediaChecks(prep, file, {scale, delivery: false});
  const reading = sb.reading.map((x) => ({name: 'reading time', ok: x.ok, level: x.ok ? ('info' as const) : ('warning' as const), detail: `"${x.text}" rests ${x.seconds}s (needs ${x.needed}s)`}));
  const tile = Math.round(prep.format.width * scale * 0.5);
  const sheets = [
    contactSheet(file, path.join(p.outDir, 'preview-overview.png'), prep.fps, {frames: Array.from({length: Math.ceil(prep.duration / 15)}, (_, i) => i * 15), cols: 6, tile}),
    contactSheet(file, path.join(p.outDir, 'preview-scenes.png'), prep.fps, {frames: sceneFrames(prep.scenes), cols: 3, tile}),
    contactSheet(file, path.join(p.outDir, 'preview-transitions.png'), prep.fps, {frames: transitionFrames(prep.scenes, prep.duration), cols: 5, tile}),
  ];
  const {errors, warnings} = writeReport(p.outDir, `Preview QA — ${prep.project.title}`, {Layout: layout, Media: media.checks, Reading: reading}, [
    `Project hash \`${p.hash}\` · engine \`${engineHash()}\` · preview at ${scale}× · rendered ${new Date().toISOString()}`,
    '',
    ...sheets.map((s) => `- ${path.basename(s.file)}`),
  ]);
  const state = {hash: p.hash, engine: engineHash(), ok: errors === 0, errors, warnings, qa: r.qa, renderMs: r.ms, fps: r.fps, totalMs: Date.now() - t0};
  writeFileSync(path.join(p.outDir, 'preview.json'), JSON.stringify(state, null, 2));
  log(`preview QA: ${errors} error(s), ${warnings} warning(s) → ${rel(path.join(p.outDir, 'report.md'))}`);
  for (const ch of [...layout, ...media.checks, ...reading].filter((x) => !x.ok)) log(`  ${ch.level === 'error' ? '✗' : '!'} ${ch.name}: ${ch.detail}`);
  return state;
}

export async function runRender(p: LoadedProject, opts: {force?: boolean} = {}) {
  const t0 = Date.now();
  const stateFile = path.join(p.outDir, 'preview.json');
  let state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : null;
  if (!state || state.hash !== p.hash || state.engine !== engineHash()) {
    log(!state ? 'No preview yet: previewing first.' : state.hash !== p.hash ? 'The project changed since its last preview: previewing first.' : 'The engine changed since the last preview: previewing first.');
    state = await runPreview(p);
  }
  if (!state.ok && !opts.force) throw new Error(`The preview failed QA (${state.errors} error(s)); see ${rel(path.join(p.outDir, 'report.md'))}. Fix it, or pass --force to render anyway.`);
  const prep = prepare(p);
  writeSounds(p, prep);
  const b = await makeBundle(p);
  const master = path.join(p.outDir, 'master.mp4');
  const m = await video(p, b, {file: master, scale: 1, crf: prep.project.export.masterCrf, quality: 'master', onProgress: (pct) => log(`master: ${pct}%`)});
  log(`master: ${rel(master)} — ${m.frames} frames in ${(m.ms / 1000).toFixed(1)}s (${m.fps.toFixed(2)} fps), peak ~${m.peakMemMB} MB`);
  const hasAudio = prep.project.audio.tracks.length > 0;
  const ex = prep.project.export;
  const pl = plan({durationSec: prep.duration / prep.fps, width: prep.format.width, height: prep.format.height, fps: prep.fps, targetMB: ex.targetMB, audioKbps: ex.audioKbps, bitsPerPixel: ex.bitsPerPixel, hasAudio});
  const t1 = Date.now();
  const delivery = path.join(p.outDir, `${prep.project.id}.mp4`);
  const enc = encodeDelivery(master, delivery, pl, prep.fps, hasAudio);
  const encodeMs = Date.now() - t1;
  log(`delivery: ${rel(delivery)} — ${(enc.bytes / 1e6).toFixed(2)} MB, ${enc.passes} pass(es), planned ${pl.videoKbps} kb/s video (quality ceiling ${pl.qualityKbps}, size ceiling ${pl.ceilingKbps})`);
  const media = mediaChecks(prep, delivery, {scale: 1, delivery: true, targetBytes: pl.targetBytes, qa: state.qa});
  const tile = Math.round(prep.format.width * 0.22);
  const sheets = [
    contactSheet(delivery, path.join(p.outDir, 'overview.png'), prep.fps, {frames: Array.from({length: Math.ceil(prep.duration / 15)}, (_, i) => i * 15), cols: 6, tile}),
    contactSheet(delivery, path.join(p.outDir, 'scenes.png'), prep.fps, {frames: sceneFrames(prep.scenes), cols: 3, tile}),
    contactSheet(delivery, path.join(p.outDir, 'transitions.png'), prep.fps, {frames: transitionFrames(prep.scenes, prep.duration), cols: 5, tile}),
  ];
  copyFileSync(p.file, path.join(p.outDir, 'project.json'));
  copyFileSync(path.join(p.dir, 'storyboard.md'), path.join(p.outDir, 'storyboard.md'));
  const env = machine();
  const {errors, warnings} = writeReport(p.outDir, `Render report — ${prep.project.title}`, {Delivery: media.checks}, [
    `Project hash \`${p.hash}\` · preview QA: ${state.errors} error(s), ${state.warnings} warning(s) · ${new Date().toISOString()}`,
    '',
    `- Delivery: \`${path.basename(delivery)}\` (${(enc.bytes / 1e6).toFixed(2)} MB, ${media.probe.bitrateKbps} kb/s, ${enc.passes} pass)`,
    `- Master: \`master.mp4\` (H.264 4:4:4, CRF ${ex.masterCrf}) — keep for re-encodes; not for upload`,
    `- Bitrate plan: video ${pl.videoKbps} kb/s = min(quality ${pl.qualityKbps}, size ${pl.ceilingKbps}); audio ${pl.audioKbps} kb/s`,
    `- Render: ${m.frames} frames in ${(m.ms / 1000).toFixed(1)}s (${m.fps.toFixed(2)} fps) on ${env.cpus}× ${env.cpuModel}, CPU only; encode ${(encodeMs / 1000).toFixed(1)}s`,
    ...sheets.map((s) => `- ${path.basename(s.file)}`),
  ]);
  const manifest = {
    id: prep.project.id,
    title: prep.project.title,
    hash: p.hash,
    rendered: new Date().toISOString(),
    files: {
      delivery: {file: path.basename(delivery), bytes: enc.bytes, sha256: sha(delivery)},
      master: {file: 'master.mp4', bytes: statSync(master).size, sha256: sha(master)},
    },
    probe: media.probe,
    plan: pl,
    checks: media.checks,
    timings: {masterMs: m.ms, encodeMs, totalMs: Date.now() - t0, previewMs: state.renderMs},
    machine: env,
  };
  writeFileSync(path.join(p.outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  recordBenchmark({
    project: prep.project.id,
    date: manifest.rendered,
    frames: m.frames,
    width: prep.format.width,
    height: prep.format.height,
    layers: prep.layers.length,
    previewFps: Math.round(state.fps * 100) / 100,
    masterFps: Math.round(m.fps * 100) / 100,
    masterSeconds: Math.round(m.ms / 100) / 10,
    encodeSeconds: Math.round(encodeMs / 100) / 10,
    peakMemMB: m.peakMemMB,
    deliveryMB: Math.round(enc.bytes / 1e4) / 100,
    cpus: env.cpus,
    gpu: false,
  });
  log(`render QA: ${errors} error(s), ${warnings} warning(s) → ${rel(path.join(p.outDir, 'report.md'))}`);
  for (const ch of media.checks.filter((x) => !x.ok)) log(`  ${ch.level === 'error' ? '✗' : '!'} ${ch.name}: ${ch.detail}`);
  if (errors) throw new Error('The delivery file failed verification.');
  return {delivery, manifest};
}

/** Re-run delivery verification on an existing render (no rendering). */
export function runVerify(p: LoadedProject) {
  const prep = prepare(p);
  const delivery = path.join(p.outDir, `${prep.project.id}.mp4`);
  if (!existsSync(delivery)) throw new Error(`No delivery file at ${rel(delivery)}: run render first.`);
  const state = JSON.parse(readFileSync(path.join(p.outDir, 'preview.json'), 'utf8'));
  const ex = prep.project.export;
  const pl = plan({durationSec: prep.duration / prep.fps, width: prep.format.width, height: prep.format.height, fps: prep.fps, targetMB: ex.targetMB, audioKbps: ex.audioKbps, bitsPerPixel: ex.bitsPerPixel, hasAudio: prep.project.audio.tracks.length > 0});
  const media = mediaChecks(prep, delivery, {scale: 1, delivery: true, targetBytes: pl.targetBytes, qa: state.qa});
  for (const c of media.checks) log(`${c.ok ? '✓' : c.level === 'error' ? '✗' : '!'} ${c.name}: ${c.detail}`);
  if (media.checks.some((c) => !c.ok && c.level === 'error')) throw new Error('Verification failed.');
}

function recordBenchmark(row: Record<string, unknown>) {
  const file = path.join(STUDIO, 'docs', 'benchmarks.json');
  const rows = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  rows.push(row);
  writeFileSync(file, JSON.stringify(rows, null, 2) + '\n');
}
