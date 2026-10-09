// Renders the reel composition (index.html) to numbered JPEG frames, 1080×1920 @ 30 fps.
// Output frame f shows source time f/30 + OFFSET (trims the dead air before the first word).
// Usage: node render-frames.mjs <graded face frames dir> <out dir> [first] [last]
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));

export const FPS = 30, OFFSET = 0.2, FRAMES = 834;            // 27.8 s out: 26.4 s of speech + end frame
const [faceDir, outDir, first = '0', last = String(FRAMES - 1)] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const url = pathToFileURL(join(here, 'index.html')).href + '?face=' + encodeURIComponent(pathToFileURL(resolve(faceDir)).href);
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => window.ready);
const stage = await page.$('#stage');
for (let f = +first; f <= +last; f++) {
  await page.evaluate((t) => window.seek(t), f / FPS + OFFSET);
  await stage.screenshot({ path: join(outDir, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 93 });
}
await browser.close();
console.log(`frames ${first}–${last} → ${outDir}`);
