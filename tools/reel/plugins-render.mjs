// Render tools/reel/plugins-carousel.html, every slide, to downloads/claude-plugins/slide-N.mp4 (1080×1350 4:5, 30 fps, 8 s
// silent loops) plus slide-N.jpg, the slide's first frame, for a still carousel.
//   node tools/reel/plugins-render.mjs [--slides=1,7] [--frames=0,90]   (frames mode writes PNG stills to tools/reel/out/)
// Needs ffmpeg on PATH and Playwright (`npm i --no-save playwright`; set CHROMIUM to a browser binary if it has none).
// Slide 1 draws over downloads/claude-plugins/cover-photo.jpg when it exists, and over the five orbs when it doesn't.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = join(ROOT, 'downloads/claude-plugins');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try { const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); const body = await readFile(p); res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1].split(',').map(Number);
const run = (args) => new Promise((r, j) => spawn('ffmpeg', args, { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
await mkdir(OUT, { recursive: true });
for (const slide of arg('slides') ?? [1, 2, 3, 4, 5, 6, 7]) {
  const page = await browser.newPage({ viewport: { width: 540, height: 675 } });
  page.on('pageerror', (e) => console.error('page:', e.message));
  await page.goto(`http://localhost:${port}/tools/reel/plugins-carousel.html?slide=${slide}`);
  await page.waitForFunction(() => window.reel?.ready, null, { timeout: 30000 });
  const { frames, FPS } = await page.evaluate(() => ({ frames: window.reel.frames, FPS: window.reel.FPS }));
  const grab = (n) => page.evaluate((n) => { window.reel.draw(n); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, n);
  const only = arg('frames');
  if (only) {
    await mkdir(join(ROOT, 'tools/reel/out'), { recursive: true });
    for (const n of only) await writeFile(join(ROOT, `tools/reel/out/s${slide}-f${String(n).padStart(3, '0')}.png`), Buffer.from(await grab(n), 'base64'));
  } else {
    const mp4 = join(OUT, `slide-${slide}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let n = 0; n < frames; n++) {
      const buf = Buffer.from(await grab(n), 'base64');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
    // the still is the first frame: every slide is fully set there
    await run(['-y', '-loglevel', 'error', '-i', mp4, '-frames:v', '1', '-q:v', '2', join(OUT, `slide-${slide}.jpg`)]);
    console.log(`wrote downloads/claude-plugins/slide-${slide}.mp4 and .jpg`);
  }
  await page.close();
}
await browser.close(); server.close();
