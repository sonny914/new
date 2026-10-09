// Writes a composition's captions (window.CAPS from Kit.phrases) as SRT on the reel's clock, every
// spoken phrase included (also the ones hidden on screen because the type says them).
// Usage: node srt.mjs <composition.html> <out.srt>
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const [comp, out] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve(comp)).href, { waitUntil: 'networkidle' });
const caps = await page.evaluate(() => window.CAPS.map((p) => ({ t0: p.t0, t1: p.t1, until: p.until, text: p.toks.map((w) => w.text).join(' ') })));
await browser.close();
const ts = (x) => { const ms = Math.round(x * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
writeFileSync(out, caps.map((c, i) => `${i + 1}\n${ts(c.t0)} --> ${ts(Math.min(c.until, c.t1 + 0.6))}\n${c.text}\n`).join('\n'));
console.log(`${caps.length} captions → ${out}`);
