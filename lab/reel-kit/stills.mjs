// QA contact sheet: renders a composition at the given recording times (half size) and tiles them,
// each labelled with its time. Usage: node stills.mjs <composition.html> <face dir> <out.jpg> t1 t2 ...
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));

const [comp, faceDir, out, ...times] = process.argv.slice(2);
const dir = mkdtempSync(join(tmpdir(), 'stills-'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(pathToFileURL(resolve(comp)).href + '?face=' + encodeURIComponent(pathToFileURL(resolve(faceDir)).href), { waitUntil: 'networkidle' });
await page.evaluate(() => window.ready);
const stage = await page.$('#stage');
for (const [i, t] of times.entries()) {
  await page.evaluate((t) => window.seek(t), +t);
  await page.evaluate((t) => { let l = document.getElementById('qa-t'); if (!l) { l = document.createElement('div'); l.id = 'qa-t'; Object.assign(l.style, { position: 'absolute', left: '16px', top: '16px', zIndex: 999, font: '700 44px monospace', color: '#0f0', background: '#000a', padding: '4px 12px' }); document.getElementById('stage').append(l); } l.textContent = t.toFixed(2); }, +t);
  await stage.screenshot({ path: join(dir, `${String(i).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 80 });
}
await page.evaluate(() => document.getElementById('qa-t')?.remove());
await browser.close();
const cols = Math.min(6, times.length), rows = Math.ceil(times.length / cols);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', join(dir, '%03d.jpg'), '-vf', `scale=270:480,tile=${cols}x${rows}:padding=6:color=gray`, '-frames:v', '1', resolve(out)]);
if (errors.length) console.log('page errors:', errors);
console.log(`${times.length} stills → ${out}`);
