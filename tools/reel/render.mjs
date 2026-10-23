// Render tools/reel/orb-reel.html to experiments/thinking-orb/reel.mp4 (1080×1920, 30 fps, 15 s, with sound).
//   node tools/reel/render.mjs [--frames=a,b,c]   (frames mode writes PNG stills to tools/reel/out/ for review)
// Needs ffmpeg on PATH and Playwright (`npm install`, then `npx playwright install chromium`, or set CHROMIUM to a browser binary). Serves the repo itself so the page imports the real orb engine.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { synth } from './sound.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OUT = join(ROOT, 'experiments/thinking-orb');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try { const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)), body = await readFile(p); res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => console.error('page:', e.message));
await page.goto(`http://localhost:${port}/tools/reel/orb-reel.html`);
await page.waitForFunction(() => window.reel?.ready, null, { timeout: 30000 });
const { frames, FPS, cuts } = await page.evaluate(() => ({ frames: window.reel.frames, FPS: window.reel.FPS, cuts: window.reel.cuts }));
const grab = (n) => page.evaluate((n) => { window.reel.draw(n); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, n);

const only = process.argv.find((a) => a.startsWith('--frames='));
if (only) {
  await mkdir(join(ROOT, 'tools/reel/out'), { recursive: true });
  for (const n of only.slice(9).split(',').map(Number)) await writeFile(join(ROOT, `tools/reel/out/f${String(n).padStart(3, '0')}.png`), Buffer.from(await grab(n), 'base64'));
} else {
  await mkdir(OUT, { recursive: true });
  const wav = join(tmpdir(), 'orb-reel-sound.wav');
  await writeFile(wav, synth(cuts, frames / FPS));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-shortest', join(OUT, 'reel.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let n = 0; n < frames; n++) {
    const buf = Buffer.from(await grab(n), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
  // the poster is the end card, so a page that never plays the reel still shows its last word
  await new Promise((r, j) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '13.95', '-i', join(OUT, 'reel.mp4'), '-frames:v', '1', '-q:v', '3', join(OUT, 'reel-poster.jpg')], { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
  console.log('wrote experiments/thinking-orb/reel.mp4 and reel-poster.jpg');
}
await browser.close(); server.close();
