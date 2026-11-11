// Render tools/reel/life-reel.html to downloads/life-you-cant-stop-thinking-about.mp4 (1080×1350 4:5 feed, 30 fps, 8 s, with sound).
//   --tall renders the 9:16 Reels cut (1080×1920) to downloads/life-you-cant-stop-thinking-about-reels.mp4 instead.
//   node tools/reel/render.mjs [--frames=a,b,c]   (frames mode writes PNG stills to tools/reel/out/ for review)
// Needs ffmpeg on PATH and Playwright (`npm i --no-save playwright`; set CHROMIUM to a browser binary if it has none). Serves the repo itself so the page loads the real brand mark.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { synth } from './life-sound.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = join(ROOT, 'downloads');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try { const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); const body = await readFile(p); res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const TALL = process.argv.includes('--tall'), NAME = TALL ? 'life-you-cant-stop-thinking-about-reels' : 'life-you-cant-stop-thinking-about';
const page = await browser.newPage({ viewport: { width: 540, height: TALL ? 960 : 675 } });
page.on('pageerror', (e) => console.error('page:', e.message));
await page.goto(`http://localhost:${port}/tools/reel/life-reel.html${TALL ? '?tall' : ''}`);
await page.waitForFunction(() => window.reel?.ready, null, { timeout: 30000 });
const { frames, FPS, cues, START } = await page.evaluate(() => ({ frames: window.reel.frames, FPS: window.reel.FPS, cues: window.reel.cues, START: window.reel.START }));
const grab = (n) => page.evaluate((n) => { window.reel.draw(n); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, n);

const only = process.argv.find((a) => a.startsWith('--frames='));
if (only) {
  await mkdir(join(ROOT, 'tools/reel/out'), { recursive: true });
  for (const n of only.slice(9).split(',').map(Number)) await writeFile(join(ROOT, `tools/reel/out/f${String(n).padStart(3, '0')}.png`), Buffer.from(await grab(n), 'base64'));
} else {
  await mkdir(OUT, { recursive: true });
  const wav = join(tmpdir(), 'life-reel-sound.wav');
  // the score is written in story order; turn it the same START seconds the picture is turned
  const score = synth(cues, frames / FPS), cut = Math.round(START * 44100) * 4, pcm = score.subarray(44);
  await writeFile(wav, Buffer.concat([score.subarray(0, 44), pcm.subarray(cut), pcm.subarray(0, cut)]));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-shortest', join(OUT, `${NAME}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let n = 0; n < frames; n++) {
    const buf = Buffer.from(await grab(n), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
  // the cover is the first frame, which is the settled poster
  await new Promise((r, j) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(OUT, `${NAME}.mp4`), '-frames:v', '1', '-q:v', '3', join(OUT, `${NAME}.jpg`)], { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
  console.log(`wrote downloads/${NAME}.mp4 and ${NAME}.jpg`);
}
await browser.close(); server.close();
