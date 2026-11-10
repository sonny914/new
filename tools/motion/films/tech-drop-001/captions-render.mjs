// Renders each burned caption (captions.json) to a transparent 1080x260 PNG in the film's type system.
// Placement: centred, lower third (baseline band y 1440-1560 of the frame), max 860 px wide, up to two lines.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { pw = require('playwright'); }
const caps = JSON.parse(await readFile(new URL('./captions.json', import.meta.url)));
await mkdir(new URL('./captions/', import.meta.url), { recursive: true });
const browser = await pw.chromium.launch();
const page = await browser.newPage();
await page.setContent('<canvas id="c" width="1080" height="260"></canvas>');
await page.evaluate(() => document.fonts.load('600 46px "Inter Display"'));
for (const [i, c] of caps.entries()) {
  const png = await page.evaluate(({ text, em }) => {
    const cv = document.getElementById('c'), x = cv.getContext('2d');
    x.clearRect(0, 0, 1080, 260);
    x.font = '600 46px "Inter Display"'; x.letterSpacing = '-0.3px'; x.textBaseline = 'alphabetic';
    // wrap to <= 860 px, balanced into two lines when needed
    const words = text.split(' '); let lines = [text];
    if (x.measureText(text).width > 860) { let best = null; for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(' '), b = words.slice(k).join(' '); const m = Math.max(x.measureText(a).width, x.measureText(b).width); if (!best || m < best.m) best = { m, l: [a, b] }; } lines = best.l; }
    const lh = 58, y0 = 260 - 40 - (lines.length - 1) * lh;
    lines.forEach((ln, li) => {
      // draw word by word so the emphasised phrase can take the accent colour
      const w = x.measureText(ln).width; let cx = 540 - w / 2; const y = y0 + li * lh;
      const s = em && ln.includes(em) ? ln.indexOf(em) : -1, parts = s < 0 ? [[ln, false]] : [[ln.slice(0, s), false], [em, true], [ln.slice(s + em.length), false]];
      for (const [t, hot] of parts) {
        x.save(); x.shadowColor = 'rgba(0,0,0,0.9)'; x.shadowBlur = 18; x.fillStyle = hot ? '#FF5A00' : '#F2EEE5'; x.fillText(t, cx, y); x.restore();
        cx += x.measureText(t).width;
      }
    });
    return cv.toDataURL('image/png').split(',')[1];
  }, c);
  await writeFile(new URL(`./captions/${String(i).padStart(2, '0')}.png`, import.meta.url), Buffer.from(png, 'base64'));
}
await browser.close();
console.log(`${caps.length} caption images`);
