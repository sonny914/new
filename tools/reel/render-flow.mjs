// Render tools/reel/flow-reel.html to tools/reel/out/flow/ (1080×960, 30 fps, silent): the full cut plus one clip per scene,
// so each beat can be laid under the voiceover on its own.
//   node tools/reel/render-flow.mjs [--high=74 --rain=60]   (the forecast the bot "sends" in the first-build scene)
//   node tools/reel/render-flow.mjs --frames=a,b,c           (PNG stills to tools/reel/out/flow/ for review)
// Needs ffmpeg on PATH and Playwright (`npm i --no-save playwright`; set CHROMIUM to a browser binary if it has none).
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = join(ROOT, 'tools/reel/out/flow');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const forecast = new URLSearchParams({ high: arg('high') ?? '74', rain: arg('rain') ?? '60' });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try { const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)), body = await readFile(p); res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 540, height: 480 } });
page.on('pageerror', (e) => console.error('page:', e.message));
await page.goto(`http://localhost:${port}/tools/reel/flow-reel.html?${forecast}`);
await page.waitForFunction(() => window.reel?.ready, null, { timeout: 30000 });
const { frames, FPS, scenes } = await page.evaluate(() => ({ frames: window.reel.frames, FPS: window.reel.FPS, scenes: window.reel.scenes }));
const grab = (n) => page.evaluate((n) => { window.reel.draw(n); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, n);
const ffmpeg = (args, stdin) => new Promise((r, j) => { const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: [stdin ? 'pipe' : 'ignore', 'inherit', 'inherit'] }); p.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())); if (stdin) stdin(p.stdin); });
const H264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

await mkdir(OUT, { recursive: true });
const only = arg('frames');
if (only) {
  for (const n of only.split(',').map(Number)) await writeFile(join(OUT, `f${String(n).padStart(4, '0')}.png`), Buffer.from(await grab(n), 'base64'));
} else {
  const full = join(OUT, 'flow-full.mp4');
  await ffmpeg(['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...H264, full], async (stdin) => {
    for (let n = 0; n < frames; n++) {
      const buf = Buffer.from(await grab(n), 'base64');
      if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r));
    }
    stdin.end();
  });
  // re-encode each cut so every clip starts on a keyframe, exactly on its first frame
  for (const [i, s] of scenes.entries()) {
    await ffmpeg(['-ss', String(s.start), '-i', full, '-t', String(s.dur), ...H264, join(OUT, `${i + 1}-${s.name}.mp4`)]);
  }
  console.log(`wrote tools/reel/out/flow/flow-full.mp4 and ${scenes.length} scene clips`);
}
await browser.close(); server.close();
