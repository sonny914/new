// Renders index.html to PNG frames: 600 frames (10s at 60fps), or single stills.
// Usage: node render.mjs <outDir> [t1,t2,...] [--vertical]   e.g. node render.mjs stills 3.4,4.25,9.5
import fs from 'fs';
import { execSync } from 'child_process';
const { chromium } = await import('playwright').catch(() =>
  import(execSync('npm root -g').toString().trim() + '/playwright/index.mjs'));

const args = process.argv.slice(2), vertical = args.includes('--vertical');
const [out = 'frames', only] = args.filter(a => !a.startsWith('--')), fps = 60;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage();
p.on('pageerror', e => { console.error(e); process.exitCode = 1; });
await p.goto(new URL('index.html?frames' + (vertical ? '&format=vertical' : ''), import.meta.url).href);
await p.evaluate(() => document.fonts.ready);
const ts = only ? only.split(',').map(Number) : [...Array(10 * fps).keys()].map(i => i / fps);
for (const [i, t] of ts.entries()) {
  const d = await p.evaluate(t => { render(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, t);
  fs.writeFileSync(`${out}/${only ? 't' + t : String(i).padStart(4, '0')}.png`, Buffer.from(d, 'base64'));
}
await b.close();
