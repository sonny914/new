// Renders each slide's motion (body.motion in index.html) to a looping 1080×1350 MP4 in ./export.
// Every CSS animation is paused and seeked per frame, so timing is exact and repeatable.
// Usage: node lab/ig-carousel-2/render-video.mjs [s1 s2 …]   (default: all six slides)
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Local install if present, else the machine's global Playwright.
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));

const FPS = 30, LOOP = 8;
const NAMES = { s1: '01-cover', s2: '02-patterns', s3: '03-color', s4: '04-type', s5: '05-components', s6: '06-follow' };
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(NAMES);
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'export');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(join(here, 'index.html')).href + '?motion', { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await document.fonts.ready;
  const walk = new Image(); walk.src = 'img/jay-walk.png'; await walk.decode();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
});

for (const id of ids) {
  const frames = join(out, `.frames-${id}`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const el = await page.$(`#${id}`);
  const total = LOOP * FPS;
  for (let f = 0; f < total; f++) {
    await page.evaluate(([sel, ms]) => {
      for (const a of document.querySelector(sel).getAnimations({ subtree: true })) { a.pause(); a.currentTime = ms; }
    }, [`#${id}`, (f / FPS) * 1000]);
    await el.screenshot({ path: join(frames, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 95 });
  }
  const mp4 = join(out, `${NAMES[id]}.mp4`);
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, '%04d.jpg'),
    '-vf', 'scale=1080:1350:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4,
  ]);
  rmSync(frames, { recursive: true, force: true });
  console.log(`✓ ${NAMES[id]}.mp4 · ${total} frames · ${LOOP}s @ ${FPS}fps`);
}
await browser.close();
