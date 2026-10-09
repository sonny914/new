// Renders a post page to PNG at 2× and downsamples (Lanczos) to its true size.
// Usage: node render.mjs <page.html> <out.png> [query]   e.g. "ar=4x5&v=accent"
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const [page, out, query = ''] = process.argv.slice(2);
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
await p.goto(pathToFileURL(resolve(page)).href + '?' + query, { waitUntil: 'networkidle' });
await p.evaluate(() => window.ready);
const box = await (await p.$('#stage')).boundingBox();
await (await p.$('#stage')).screenshot({ path: out + '.2x.png' });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out + '.2x.png', '-vf', `scale=${box.width}:${box.height}:flags=lanczos`, out]);
execFileSync('rm', [out + '.2x.png']);
console.log(out, box.width + '×' + box.height, await p.title());
await browser.close();
