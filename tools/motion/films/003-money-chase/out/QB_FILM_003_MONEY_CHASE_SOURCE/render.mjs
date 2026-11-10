// Render a composition from tools/motion/comps to MP4 (H.264, yuv420p) or to PNG stills / a contact sheet.
//   node tools/motion/render.mjs <comp> [--out=path.mp4] [--blur=N] [--frames=0,30,60] [--sheet=cols] [--from=f --to=f]
//   <comp> is a path under comps/ without .js, e.g. everybody-can-build/video
// Needs ffmpeg on PATH and Playwright (global install is fine). Serves the repo so comps can load assets/brand.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { extname, join, resolve, dirname } from 'node:path';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const require = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { pw = require('playwright'); }

const argv = process.argv.slice(2), comp = argv.find((a) => !a.startsWith('--'));
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));
if (!comp) { console.error('usage: render.mjs <comp> [--out=] [--blur=] [--frames=] [--sheet=] [--from= --to=]'); process.exit(1); }
const OUTDIR = join(ROOT, 'tools/motion/renders');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try { const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => console.error('page:', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
await page.goto(`http://localhost:${port}/tools/motion/player.html?comp=${comp}${opt.blur ? `&blur=${opt.blur}` : ''}`);
await page.waitForFunction(() => window.motion?.ready, null, { timeout: 60000 });
const { frames, fps } = await page.evaluate(() => ({ frames: window.motion.frames, fps: window.motion.fps }));
const grab = async (n) => Buffer.from(await page.evaluate((n) => { window.motion.draw(n); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, n), 'base64');
const run = (args) => new Promise((r, j) => spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
const slug = comp.replace(/\//g, '-');
await mkdir(OUTDIR, { recursive: true });

if (opt.frames) {
  const dir = join(OUTDIR, `${slug}-stills`); await mkdir(dir, { recursive: true });
  for (const n of opt.frames.split(',').map(Number)) await writeFile(join(dir, `f${String(n).padStart(4, '0')}.png`), await grab(n));
  console.log(`stills -> ${dir}`);
} else {
  const out = opt.out ? resolve(opt.out) : join(OUTDIR, `${slug}.mp4`);
  await mkdir(dirname(out), { recursive: true });
  const from = +(opt.from ?? 0), to = +(opt.to ?? frames);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let n = from; n < to; n++) {
    const buf = await grab(n);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (n % 30 === 0) process.stdout.write(`\r${n}/${to}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
  console.log(`\nwrote ${out}`);
  if (opt.sheet) {
    // contact sheet: evenly spaced frames, tiled, each labelled with its timecode
    const cols = +opt.sheet === 1 || opt.sheet === 'true' ? 6 : +opt.sheet, n = cols * 2, step = (to - from) / n;
    const sel = Array.from({ length: n }, (_, i) => Math.round(from + step * (i + 0.5)));
    const sheet = out.replace(/\.mp4$/, '-sheet.png');
    await run(['-i', out, '-vf', `select='${sel.map((f) => `eq(n\\,${f - from})`).join('+')}',scale=360:-1,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf:text='%{pts\\:hms}':x=10:y=10:fontsize=18:fontcolor=white@0.7,tile=${cols}x2:padding=6:color=0x222222`, '-frames:v', '1', '-vsync', 'vfr', sheet]);
    console.log(`wrote ${sheet}`);
  }
}
await browser.close(); server.close();
