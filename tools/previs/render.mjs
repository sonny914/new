// Render tools/previs/test01.html: the Test 01 animatic, its stills, the storyboard sheet and the plan diagrams.
//   node tools/previs/render.mjs                 animatic.mp4 (1920×1080, 24 fps, temp sound) + poster, plan, remap, storyboard
//   node tools/previs/render.mjs --frames=77,260 PNG stills to tools/previs/out/ for review (add --clean for no burn-ins)
//   node tools/previs/render.mjs --board         only the storyboard sheet and the diagrams
// Needs ffmpeg on PATH, Playwright (`npm i --no-save playwright`) and three (`npm i --no-save three@0.186.1`): the page
// imports three from jsDelivr, and the renderer serves that URL from node_modules so a render never needs the network.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { synth } from './sound.mjs';
import { FRAMES, FPS, BEATS, SHOTS, editAt, EV, IMPACT_FRAME } from './shots.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = join(ROOT, 'docs/originals/test-01/previs'), STILLS = join(ROOT, 'tools/previs/out');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    let body = await readFile(p);
    // the page is written as an Artifact body (no doctype); give it a standards-mode document here
    if (p.endsWith('.html')) body = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>';
    res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('page:', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', async (route) => {
  const file = join(ROOT, 'node_modules/three', new URL(route.request().url()).pathname.split('/three@0.186.1/')[1]);
  route.fulfill({ body: await readFile(file), contentType: 'text/javascript' });
});
await page.goto(`http://localhost:${port}/tools/previs/test01.html?render`);
await page.waitForFunction(() => window.previs?.ready, null, { timeout: 120000 });
const grab = (n) => page.evaluate((n) => { window.previs.frame(n); return window.previs.out.toDataURL('image/png').split(',')[1]; }, n);
const png = (b64) => Buffer.from(b64, 'base64');
const run = (args) => new Promise((r, j) => spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));

// storyboard: one panel per beat that matters, captioned from the shot data
const BOARD = [
  ['SH010', 0.4, 'Standoff. The Bellwright fills the window light.'],
  ['SH020', editAt(EV.takeoff) + 0.15, 'Track the charge; she leaves the water.'],
  ['SH020', 3.25, 'MOVE 01 · the apex holds. Rain hangs as beads.'],
  ['SH020', 4.2, 'Orbit east: her face, eyes shut, band lifted.'],
  ['SH020', 5.95, 'Orbit west: the coiled bell she cannot see.'],
  ['SH030', 7.35, 'Snap to speed. The bell whips up.'],
  ['SH030', 9.2, 'MOVE 03 · 2%. The bell crosses her.'],
  ['SH030', editAt(EV.miss), 'Near miss, 9 cm. The Bellwright behind it.'],
  ['SH040', 15.1, 'Real time. She lands inside his reach.'],
  ['SH040', (IMPACT_FRAME + 4) / FPS, 'MOVE 04 · contact. The ring is born.'],
  ['SH040', 17.6, 'Ride the ring out through the louvers.'],
  ['SH040', 23.5, 'The drowned city. The bell meets the flood.'],
];

async function board() {
  await mkdir(OUT, { recursive: true });
  const panels = [];
  await page.evaluate(() => window.previs.burn(false));
  for (const [, t] of BOARD) panels.push(await grab(Math.round(t * FPS)));
  await page.evaluate(() => window.previs.burn(true));
  const sheet = await page.evaluate(async ({ panels, BOARD, FPS }) => {
    const cols = 3, pw = 600, ph = Math.round(pw / 2.39), gap = 28, capH = 74, head = 120;
    const rows = Math.ceil(panels.length / cols), W = cols * pw + (cols + 1) * gap, H = head + rows * (ph + capH + gap) + gap;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = '#07080B'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#F2EEE5'; c.font = '800 46px "Big Shoulders Display", "DejaVu Sans Condensed", sans-serif'; c.fillText('THE DROWNED BELFRY · TEST 01 STORYBOARD', gap, 70);
    c.fillStyle = '#8C97AB'; c.font = '400 17px "JetBrains Mono", monospace'; c.fillText('Frames pulled from the previs, not drawn. 2.39:1. Timecodes are edit time at 24 fps.', gap, 102);
    for (let i = 0; i < panels.length; i++) {
      const img = new Image(); img.src = 'data:image/png;base64,' + panels[i]; await img.decode();
      const x = gap + (i % cols) * (pw + gap), y = head + Math.floor(i / cols) * (ph + capH + gap);
      c.drawImage(img, 0, 138, 1920, 804, x, y, pw, ph);
      const [shot, t, cap] = BOARD[i], f = Math.round(t * FPS);
      c.fillStyle = '#FF5A00'; c.font = '600 15px "JetBrains Mono", monospace'; c.fillText(`${String(i + 1).padStart(2, '0')}  ${shot}  ·  ${t.toFixed(2)} s  ·  F ${String(f).padStart(3, '0')}`, x, y + ph + 26);
      c.fillStyle = '#F2EEE5'; c.font = '400 19px "Instrument Sans", "DejaVu Sans", sans-serif'; c.fillText(cap, x, y + ph + 54);
    }
    return cv.toDataURL('image/png').split(',')[1];
  }, { panels, BOARD, FPS });
  await writeFile(join(OUT, 'storyboard.png'), png(sheet));
  await writeFile(join(OUT, 'camera-plan.png'), png((await page.evaluate(() => window.previs.plan())).split(',')[1]));
  await writeFile(join(OUT, 'time-remap.png'), png((await page.evaluate(() => window.previs.remap())).split(',')[1]));
  // the board panels as their own stills, for the docs
  await mkdir(join(OUT, 'board'), { recursive: true });
  for (let i = 0; i < panels.length; i++) {
    const f = join(tmpdir(), `belfry-panel-${i}.png`); await writeFile(f, png(panels[i]));
    await run(['-i', f, '-vf', 'crop=1920:804:0:138,scale=960:-2', '-q:v', '3', join(OUT, 'board', `${String(i + 1).padStart(2, '0')}-${BOARD[i][0].toLowerCase()}.jpg`)]);
  }
  console.log('wrote storyboard.png, camera-plan.png, time-remap.png and board/*.jpg');
}

const only = process.argv.find((a) => a.startsWith('--frames='));
if (only) {
  await mkdir(STILLS, { recursive: true });
  if (process.argv.includes('--clean')) await page.evaluate(() => window.previs.burn(false));
  for (const n of only.slice(9).split(',').map(Number)) { const t0 = Date.now(); await writeFile(join(STILLS, `f${String(n).padStart(3, '0')}.png`), png(await grab(n))); console.log(`f${n} ${Date.now() - t0} ms`); }
} else if (process.argv.includes('--board')) {
  await board();
} else {
  await mkdir(OUT, { recursive: true });
  const wav = join(tmpdir(), 'belfry-sound.wav');
  await writeFile(wav, synth());
  const mp4 = join(OUT, 'animatic.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '160k', '-shortest', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let n = 0; n < FRAMES; n++) {
    const buf = png(await grab(n));
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (n % 50 === 0) console.log(`frame ${n}/${FRAMES} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
  await run(['-ss', '3.6', '-i', mp4, '-frames:v', '1', '-q:v', '3', join(OUT, 'animatic-poster.jpg')]);
  await board();
  console.log(`wrote ${mp4} in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
await browser.close(); server.close();
