// Render: drive the stage in headless Chromium frame by frame, encode with FFmpeg, mix the score, any narration
// and any footage's own sound, and mux captions as a soft subtitle track. Work is split across parallel pages, then joined.
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir, cpus } from 'node:os';
import { ROOT, run, loadPlaywright, fmtStamp, fmtZone } from './util.mjs';
import { serveDir, framesFor } from './assets.mjs';
import { score } from './score.mjs';
import { srt } from './captions.mjs';

function sourcesOf(refs, byId) {
  const out = [];
  for (const id of refs) {
    const e = byId.get(id); if (!e || e.kind === 'session') continue;
    const r = e.refs[0].replace(/^(ccr|transcript):([0-9a-f]{8})[0-9a-f-]*/, '$1 $2').replace(/^git:/, 'git ').replace(/^gh:pr\//, 'PR #').replace(/^file:([^@]+)@/, (m, p) => `${p.split('/').pop()} @`);
    if (!out.includes(r)) out.push(r);
  }
  return out.slice(0, 3).join(' · ');
}

export async function payload(sb, fmt, { events, assets, archiveDir, repo }) {
  const f = sb.formats[fmt], byId = new Map(events.map((e) => [e.id, e]));
  const stages = sb.stages;
  const map = {};
  const url = (abs) => '/' + relative(ROOT, abs).split('\\').join('/');
  for (const a of assets.assets) {
    if (!f.scenes.some((s) => JSON.stringify(s.props).includes(`"${a.id}"`))) continue;
    if (a.kind === 'video' || a.kind === 'screen') {
      const fr = await framesFor(a, archiveDir, repo, { height: a.kind === 'screen' ? 900 : 1280 });
      map[a.id] = { kind: a.kind, frames: { base: url(fr.dir) + '/', count: fr.count, fps: 30 }, aspect: a.probe?.width / a.probe?.height };
    } else map[a.id] = { kind: a.kind, url: url(join(archiveDir, a.path)) };
  }
  return {
    format: fmt, width: f.width, height: f.height, fps: sb.fps, duration: f.duration, frames: f.frames, tz: sb.tz, captions: sb.captions !== false,
    stages, cues: f.cues, assets: map, brand: { mark: '/assets/brand/mark.svg', wordmark: '/assets/brand/wordmark.svg' },
    scenes: f.scenes.map((s) => ({ ...s, stageIndex: stages.findIndex((x) => x.id === s.stage) + 1, stageLabel: stages.find((x) => x.id === s.stage)?.label ?? '',
      stageIndex2: s.stage2 ? stages.findIndex((x) => x.id === s.stage2) + 1 : null, stageLabel2: s.stage2 ? stages.find((x) => x.id === s.stage2)?.label ?? '' : null,
      sources: sourcesOf(s.refs ?? [], byId), clockLabel: s.clock ? `${fmtStamp(s.clock)} ${fmtZone(s.clock)}` : '' })),
  };
}

async function openStage(browser, port, data) {
  const page = await browser.newPage({ viewport: { width: data.width, height: data.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((d) => { window.__QB__ = d; }, data);
  await page.goto(`http://127.0.0.1:${port}/tools/capture/stage/stage.html`);
  await page.waitForFunction(() => window.stage?.ok || window.stage?.error, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.stage.error);
  if (err) throw new Error(`stage failed: ${err}`);
  return { page, errors };
}

async function integratedLoudness(file) {
  const out = await new Promise((ok) => { let e = ''; const p = spawn('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
    p.stderr.on('data', (d) => { e = (e + d).slice(-4000); }); p.on('close', () => ok(e)); });
  return +(out.match(/Summary:[\s\S]*?I:\s+(-?[\d.]+) LUFS/)?.[1] ?? NaN);
}

const shot = async (page, f) => { await page.evaluate((f) => window.stage.seek(f), f); return page.screenshot({ type: 'png' }); };

// Stills for review: write PNGs of chosen frames (or seconds) without encoding a video.
export async function stills(data, outDir, times, { mounts = {} } = {}) {
  const { chromium } = await loadPlaywright();
  const srv = await serveDir(ROOT, mounts), browser = await chromium.launch();
  try {
    const { page, errors } = await openStage(browser, srv.port, data);
    await mkdir(outDir, { recursive: true });
    const files = [];
    for (const t of times) { const f = Math.min(data.frames - 1, Math.round(t * data.fps)); const p = join(outDir, `${data.format}-${String(f).padStart(5, '0')}.png`); await writeFile(p, await shot(page, f)); files.push(p); }
    if (errors.length) console.warn('stage console errors:', errors.slice(0, 5));
    return files;
  } finally { await browser.close(); await srv.close(); }
}

// `clips` are stretches of footage sound: { file, src, dur, start, gain } plays file from src for dur seconds at
// start. `mute` spans silence the score.
export async function renderVideo(data, out, { narration = [], clips = [], mute = [], mounts = {}, workers = Math.max(1, Math.min(4, cpus().length - 1)), metadata = {}, log = () => {} } = {}) {
  const { chromium } = await loadPlaywright();
  const tmp = join(tmpdir(), `qb-capture-${data.format}-${process.pid}`);
  await rm(tmp, { recursive: true, force: true }); await mkdir(tmp, { recursive: true });
  const srv = await serveDir(ROOT, mounts), browser = await chromium.launch();
  const t0 = Date.now();
  try {
    const per = Math.ceil(data.frames / workers);
    let done = 0;
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const a = w * per, b = Math.min(data.frames, a + per);
      if (a >= b) return;
      const { page, errors } = await openStage(browser, srv.port, data);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(data.fps), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-g', String(data.fps * 2), join(tmp, `seg${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f < b; f++) {
        const buf = await shot(page, f);
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        if (++done % 150 === 0) log(`${data.format}: ${done}/${data.frames} frames (${Math.round((Date.now() - t0) / 1000)} s)`);
      }
      ff.stdin.end();
      await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg segment ${w} exited ${c}`)) : r())));
      if (errors.length) log(`stage console errors (worker ${w}): ${errors.slice(0, 3).join(' | ')}`);
      await page.close();
    }));
  } finally { await browser.close(); await srv.close(); }

  // join segments, then audio: score (ducked under speech) + narration and footage sound at their scene offsets
  const list = join(tmp, 'list.txt');
  const segs = Array.from({ length: workers }, (_, w) => join(tmp, `seg${w}.mp4`)).filter(existsSync);
  await writeFile(list, segs.map((s) => `file '${s}'`).join('\n'));
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', join(tmp, 'video.mp4')]);
  const speech = [...narration.map((n) => ({ start: n.start, end: n.start + n.seconds })), ...clips.map((c) => ({ start: c.start, end: c.start + c.dur }))];
  await writeFile(join(tmp, 'score.wav'), score(data.scenes, data.duration, { speech, mute }));
  const srtFile = join(tmp, 'captions.srt');
  await writeFile(srtFile, srt(data.cues));
  const inputs = ['-i', join(tmp, 'video.mp4'), '-i', join(tmp, 'score.wav'), ...narration.flatMap((n) => ['-i', n.file]), ...clips.flatMap((c) => ['-i', c.file]), '-i', srtFile];
  const subIdx = 2 + narration.length + clips.length;
  const at = (s) => `adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)}`;
  const voices = [
    ...narration.map((n, i) => `[${i + 2}:a]aresample=44100,aformat=channel_layouts=stereo,${at(n.start)}[v${i}]`),
    // each stretch of footage sound is cut sample-accurately from its source, with 20 ms edges so cuts don't click
    ...clips.map((c, i) => `[${i + 2 + narration.length}:a]atrim=start=${c.src}:duration=${c.dur},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo,`
      + `afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, c.dur - 0.02).toFixed(3)}:d=0.02,volume=${c.gain ?? 1},${at(c.start)}[v${i + narration.length}]`),
  ];
  const mix = voices.length
    // voices arrive at speech level; the bed sits well under them (it also ducks under each one)
    ? `${voices.join(';')};[1:a]volume=0.32[bed];[bed]${voices.map((_, i) => `[v${i}]`).join('')}amix=inputs=${voices.length + 1}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`
    : '[1:a]loudnorm=I=-20:TP=-2:LRA=11[a]';
  const meta = Object.entries(metadata).flatMap(([k, v]) => ['-metadata', `${k}=${v}`]);
  const mux = (ins, graph, aMap, sIdx) => run('ffmpeg', ['-y', '-loglevel', 'error', ...ins, ...graph, '-map', '0:v', '-map', aMap, '-map', `${sIdx}:s`,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng', '-t', String(data.duration), ...meta, '-movflags', '+faststart', out]);
  if (clips.length) {
    // Footage sound: single-pass loudnorm rides the gain and would lift a held silence toward speech level.
    // Mix first, measure, then apply one fixed gain and a peak limiter, so quiet stays as quiet as it was shot.
    const wav = join(tmp, 'mix.wav');
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs.slice(0, -2), '-filter_complex', mix.replace(/,loudnorm=[^[]+\[a\]$/, '[a]'), '-map', '[a]', '-t', String(data.duration), '-c:a', 'pcm_f32le', wav]);
    const I = await integratedLoudness(wav), gain = Number.isFinite(I) ? -16 - I : 0;
    await mux(['-i', join(tmp, 'video.mp4'), '-i', wav, '-i', srtFile], ['-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:attack=5:release=60:level=false:latency=true`], '1:a', 2);
  } else await mux(inputs, ['-filter_complex', mix], '[a]', subIdx);
  await rm(tmp, { recursive: true, force: true });
  return { seconds: Math.round((Date.now() - t0) / 1000) };
}
