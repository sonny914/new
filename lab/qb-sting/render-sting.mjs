// Renders the sting (sting.html) to numbered frames at 30 fps: JPEG on black, or PNG with alpha.
// Usage: node render-sting.mjs <ar: 9x16|4x5|1x1|16x9> <out dir> [alpha]
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const [ar = '9x16', outDir, alphaArg] = process.argv.slice(2);
const alpha = alphaArg === 'alpha';
const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });
const [w, h] = { '9x16': [1080, 1920], '4x5': [1080, 1350], '1x1': [1080, 1080], '16x9': [1920, 1080] }[ar];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(here, 'sting.html')).href + `?ar=${ar}${alpha ? '&alpha' : ''}`);
await page.evaluate(() => window.ready);
const stage = await page.$('#stage');
const frames = Math.round((await page.evaluate(() => window.LENGTH)) * 30);
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.seek(t), f / 30);
  const path = join(outDir, `${String(f).padStart(3, '0')}.${alpha ? 'png' : 'jpg'}`);
  await stage.screenshot(alpha ? { path, omitBackground: true } : { path, type: 'jpeg', quality: 95 });
}
await browser.close();
console.log(`${ar}${alpha ? ' alpha' : ''}: ${frames} frames → ${outDir}`);
