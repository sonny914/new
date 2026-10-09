// Renders each .slide in index.html to a 1080×1350 PNG in ./export.
// Captures at 2× density, then downsamples with ffmpeg (lanczos) for crisp type.
// Usage: node lab/ig-carousel-2/render.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Local install if present, else the machine's global Playwright.
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'export');
const names = ['01-cover', '02-patterns', '03-color', '04-type', '05-components', '06-follow'];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(join(here, 'index.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const slides = await page.$$('.slide');
if (slides.length !== names.length) throw new Error(`expected ${names.length} slides, found ${slides.length}`);
for (const [i, el] of slides.entries()) {
  const hi = join(out, `${names[i]}@2x.png`);
  const final = join(out, `${names[i]}.png`);
  await el.screenshot({ path: hi });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', hi, '-vf', 'scale=1080:1350:flags=lanczos', final]);
  rmSync(hi);
  console.log(`✓ ${names[i]}.png`);
}
await browser.close();
