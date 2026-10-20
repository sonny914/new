// Render a reel from its config. Every frame is drawn by the same deterministic engine; preview only draws it smaller.
//   node tools/reel/render.mjs preview            540×960 MP4 with sound → tools/reel/out/preview.mp4   (fast)
//   node tools/reel/render.mjs export             1080×1920 MP4 with sound + poster → <config.output>/      (final)
//   node tools/reel/render.mjs stills --at=1,5.5  full-size PNGs at those seconds → tools/reel/out/
// Options: --config=tools/reel/my.config.js (default tools/reel/reel.config.js) · --preset=pulse (override, to compare)
//          --jobs=4 (parallel browser pages; frames are independent, so output is identical at any count)
// Needs ffmpeg and Playwright (`npm i --no-save playwright`; CHROMIUM=/path/to/chrome if it has no browser of its own).
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { extname, join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { resolveConfig } from './engine/presets.js';
import { score } from './engine/score.mjs';
import { plan } from './engine/timeline.js';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const args = process.argv.slice(2);
const opt = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const mode = args.find((a) => !a.startsWith('--')) ?? 'preview';
if (!['preview', 'export', 'stills'].includes(mode)) throw new Error(`unknown mode "${mode}" (preview | export | stills)`);
const configPath = resolve(ROOT, opt('config', 'tools/reel/reel.config.js'));
const preset = opt('preset');
const raw = (await import(pathToFileURL(configPath).href)).default;
const cfg = resolveConfig({ ...raw, ...(preset ? { preset, sequence: null } : {}) });
const scale = mode === 'preview' ? 0.5 : 1;
const OUT = mode === 'export' ? join(ROOT, cfg.output) : join(ROOT, 'tools/reel/out');
await mkdir(OUT, { recursive: true });
const t0 = Date.now();

// a static server at the repo root, so the page imports the engine and the config as modules
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try { const body = await readFile(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))); res.writeHead(200, { 'content-type': TYPES[extname(req.url.split('?')[0])] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://localhost:${server.address().port}/tools/reel/engine/page.html?scale=${scale}&config=/${relative(ROOT, configPath)}${preset ? `&preset=${preset}` : ''}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const jobs = Math.max(1, Number(opt('jobs', Math.min(4, availableParallelism()))));
const pages = await Promise.all(Array.from({ length: mode === 'stills' ? 1 : jobs }, async () => {
  const page = await browser.newPage({ viewport: { width: 600, height: 1000 } });
  page.on('pageerror', (e) => console.error('page:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.reel?.ready, null, { timeout: 60000 });
  return page;
}));
const { frames, FPS } = await pages[0].evaluate(() => ({ frames: window.reel.frames, FPS: window.reel.FPS }));
const type = mode === 'preview' ? 'image/jpeg' : 'image/png';
const grab = (page, n) => page.evaluate(([n, type]) => { window.reel.draw(n); return document.getElementById('c').toDataURL(type, 0.92).split(',')[1]; }, [n, type]).then((b) => Buffer.from(b, 'base64'));
const run = (cmd, a, opts) => new Promise((r, j) => { const p = spawn(cmd, a, opts); p.on('close', (c) => (c ? j(new Error(`${cmd} exited ${c}`)) : r())); if (opts?.feed) opts.feed(p); });

if (mode === 'stills') {
  for (const s of opt('at', '0').split(',').map(Number)) {
    const n = Math.min(frames - 1, Math.round(s * FPS)), f = join(OUT, `still-${String(n).padStart(3, '0')}.png`);
    await writeFile(f, await grab(pages[0], n)); console.log(relative(ROOT, f));
  }
} else {
  const wav = join(ROOT, 'tools/reel/out', 'score.wav');
  await mkdir(join(ROOT, 'tools/reel/out'), { recursive: true });
  await writeFile(wav, score(cfg));
  const file = join(OUT, mode === 'export' ? 'reel.mp4' : 'preview.mp4');
  const enc = mode === 'export' ? ['-preset', 'slow', '-crf', '18'] : ['-preset', 'veryfast', '-crf', '24'];
  // frames render in parallel across pages and are written to ffmpeg strictly in order
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', wav,
    '-c:v', 'libx264', ...enc, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-t', String(frames / FPS), file],
  { stdio: ['pipe', 'inherit', 'inherit'], feed: async (ff) => {
    const done = new Map(); let next = 0, issued = 0;
    const worker = async (page) => { while (issued < frames) { const n = issued++; done.set(n, await grab(page, n)); await flush(); } };
    const flush = async () => {
      while (done.has(next)) {
        const buf = done.get(next); done.delete(next++);
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        if (next % 30 === 0) process.stdout.write(`\r  ${next}/${frames} frames`);
      }
    };
    await Promise.all(pages.map(worker));
    await flush(); ff.stdin.end(); process.stdout.write('\n');
  } });
  if (mode === 'export') {
    const at = plan(cfg).time(cfg.poster ?? 'end-0.1');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(at), '-i', file, '-frames:v', '1', '-q:v', '3', join(OUT, 'reel-poster.jpg')], { stdio: 'inherit' });
  }
  console.log(`${relative(ROOT, file)} · ${cfg.preset} · ${frames} frames · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
await browser.close(); server.close();
