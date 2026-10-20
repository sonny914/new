// Render a reel page to an MP4 (1080×1920, 30 fps, with its synthesised sound) and a poster.
//   node tools/reel/render.mjs [orb|qb] [--frames=a,b,c]   (frames mode writes PNG stills to tools/reel/out/ for review)
//   orb (default): orb-reel.html + sound.mjs    → experiments/thinking-orb/reel.mp4, 15 s
//   qb:            qb-reel.html  + qb-sound.mjs → experiments/quiet-bands-reel/reel.mp4, 10 s
// Needs ffmpeg on PATH and Playwright (`npm i --no-save playwright`; set CHROMIUM to a browser binary if it has none). Serves the repo itself so the page imports the real orb engine.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

const REELS = {
  orb: { page: 'orb-reel.html', sound: './sound.mjs', out: 'experiments/thinking-orb', poster: 13.95 },
  qb: { page: 'qb-reel.html', sound: './qb-sound.mjs', out: 'experiments/quiet-bands-reel', poster: 9.9 },
};
const name = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'orb';
const REEL = REELS[name];
if (!REEL) throw new Error(`unknown reel "${name}" (try: ${Object.keys(REELS).join(', ')})`);
const { synth } = await import(REEL.sound);
const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = join(ROOT, REEL.out);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try { const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); const body = await readFile(p); res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => console.error('page:', e.message));
await page.goto(`http://localhost:${port}/tools/reel/${REEL.page}`);
await page.waitForFunction(() => window.reel?.ready, null, { timeout: 30000 });
const { frames, FPS, cuts } = await page.evaluate(() => ({ frames: window.reel.frames, FPS: window.reel.FPS, cuts: window.reel.cuts }));
const grab = (n) => page.evaluate((n) => { window.reel.draw(n); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, n);

const only = process.argv.find((a) => a.startsWith('--frames='));
if (only) {
  await mkdir(join(ROOT, 'tools/reel/out'), { recursive: true });
  for (const n of only.slice(9).split(',').map(Number)) await writeFile(join(ROOT, `tools/reel/out/${name}-f${String(n).padStart(3, '0')}.png`), Buffer.from(await grab(n), 'base64'));
} else {
  await mkdir(OUT, { recursive: true });
  const wav = join(tmpdir(), `${name}-reel-sound.wav`);
  await writeFile(wav, synth(cuts, frames / FPS));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-t', String(frames / FPS), join(OUT, 'reel.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let n = 0; n < frames; n++) {
    const buf = Buffer.from(await grab(n), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
  // the poster is the end card, so a page that never plays the reel still shows its last word
  await new Promise((r, j) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(REEL.poster), '-i', join(OUT, 'reel.mp4'), '-frames:v', '1', '-q:v', '3', join(OUT, 'reel-poster.jpg')], { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
  console.log(`wrote ${REEL.out}/reel.mp4 and reel-poster.jpg`);
}
await browser.close(); server.close();
