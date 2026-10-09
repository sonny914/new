// Renders a reel composition to numbered JPEG frames: frame f shows recording time f/fps + offset
// (the composition's window.REEL). Parallel browsers, one contiguous chunk each.
// Usage: node render.mjs <composition.html> <face dir> <out dir> [--scale 0.5] [--workers 4] [--from N] [--to M]
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));

const pos = [], opt = { scale: 1, workers: 4 };
for (let a = process.argv.slice(2); a.length;) { const x = a.shift(); if (x.startsWith('--')) opt[x.slice(2)] = +a.shift(); else pos.push(x); }
const [comp, faceDir, outDir] = pos;
mkdirSync(outDir, { recursive: true });
const url = pathToFileURL(resolve(comp)).href + '?face=' + encodeURIComponent(pathToFileURL(resolve(faceDir)).href);

async function open() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: opt.scale });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.ready);
  return { browser, page, reel: await page.evaluate(() => window.REEL) };
}
const first = await open();
const { fps, offset, frames } = first.reel;
const from = opt.from ?? 0, to = opt.to ?? frames - 1, n = to - from + 1;
const chunk = Math.ceil(n / opt.workers);
const t0 = Date.now();
await Promise.all([...Array(opt.workers)].map(async (_, w) => {
  const a = from + w * chunk, b = Math.min(to, a + chunk - 1);
  if (a > b) return;
  const { browser, page } = w === 0 ? first : await open();
  const stage = await page.$('#stage');
  for (let f = a; f <= b; f++) {
    await page.evaluate((t) => window.seek(t), f / fps + offset);
    await stage.screenshot({ path: join(outDir, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: opt.scale < 1 ? 85 : 93 });
  }
  await browser.close();
}));
if (opt.workers > 1 && first.browser.isConnected()) await first.browser.close();
console.log(`${n} frames (${from}–${to}) at ×${opt.scale} → ${outDir} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
