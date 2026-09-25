/* Visual acceptance for the QB Spatial Hero composition (lab). Not part of `npm test`: it needs Playwright's Chromium.
   Run: node tools/hero.accept.mjs   (optional FONT_DIR=<dir with fonts.css + woff2> to serve Hubot Sans offline)
   Serves the repo on a local port, drives the engine through the full tilt grid (x, y in {-1,0,1}) at three scroll
   positions on three iPhone viewports (the in-app browser is the short one), and asserts the sculpture holds:
     the wordmark never reaches the rule, QUIET stays interlocked with BANDS, BANDS keeps its feet on the rule,
     the descriptor clears the rule. This is the frame from the 2026-09-25 iPhone screenshot, made into a case. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = join(ROOT, p);
  if (!existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const FONT_DIR = process.env.FONT_DIR;

const LIMITS = { gapQL: 16, ovQB: 12, feet: 16, gapLW: 6 };   // px, CSS
const VIEWPORTS = [[393, 680, 'iPhone in-app browser'], [393, 852, 'iPhone 15 Pro'], [430, 932, 'iPhone Pro Max']];
const grid = [];
for (const p of [0, 0.12, 0.25]) for (const vy of [-1, 0, 1]) for (const vx of [-1, 0, 1]) grid.push([vx, vy, p]);

const b = await chromium.launch();
let failures = 0, checks = 0;
for (const [w, h, name] of VIEWPORTS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage();
  if (FONT_DIR) {
    await pg.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: readFileSync(join(FONT_DIR, 'fonts.css'), 'utf8') }));
    await pg.route('https://fonts.gstatic.com/**', (r) => { try { r.fulfill({ contentType: 'font/woff2', body: readFileSync(join(FONT_DIR, r.request().url().split('/').pop())) }); } catch { r.abort(); } });
  }
  await pg.goto(`${base}/lab/spatial-hero/`, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(600);
  const range = await pg.evaluate(() => document.getElementById('track').offsetHeight - document.getElementById('stage').offsetHeight);
  const worst = { gapQL: Infinity, ovQB: Infinity, feet: 0, gapLW: Infinity };
  for (const [vx, vy, p] of grid) {
    await pg.evaluate(([x, y, sy]) => { window.scrollTo(0, sy); const s = window.QB_HERO.engine.state; s.viewT.x = x; s.viewT.y = y; window.QB_HERO.engine.wake(); }, [vx, vy, Math.round(range * p)]);
    await pg.waitForTimeout(800);
    const m = await pg.evaluate(() => {
      const r = (sel) => document.querySelector(sel).getBoundingClientRect();
      const q = r('.quiet'), bd = r('.bands'), ln = r('.line'), wh = r('.where');
      return { gapQL: ln.top - q.bottom, ovQB: q.bottom - bd.top, feet: bd.bottom - (ln.top + ln.bottom) / 2, gapLW: wh.top - ln.bottom };
    });
    worst.gapQL = Math.min(worst.gapQL, m.gapQL); worst.ovQB = Math.min(worst.ovQB, m.ovQB); worst.feet = Math.max(worst.feet, Math.abs(m.feet)); worst.gapLW = Math.min(worst.gapLW, m.gapLW);
    const bad = [];
    if (m.gapQL < LIMITS.gapQL) bad.push(`wordmark ${m.gapQL.toFixed(0)}px from the rule`);
    if (m.ovQB < LIMITS.ovQB) bad.push(`QUIET/BANDS interlock ${m.ovQB.toFixed(0)}px`);
    if (Math.abs(m.feet) > LIMITS.feet) bad.push(`BANDS feet ${m.feet.toFixed(0)}px off the rule`);
    if (m.gapLW < LIMITS.gapLW) bad.push(`descriptor ${m.gapLW.toFixed(0)}px from the rule`);
    checks++;
    if (bad.length) { failures++; console.log(`FAIL ${name} ${w}x${h} x${vx} y${vy} scroll${p}: ${bad.join('; ')}`); }
  }
  console.log(`${name} ${w}x${h}: worst gapQL ${worst.gapQL.toFixed(0)} (>=${LIMITS.gapQL})  ovQB ${worst.ovQB.toFixed(0)} (>=${LIMITS.ovQB})  |feet| ${worst.feet.toFixed(0)} (<=${LIMITS.feet})  gapLW ${worst.gapLW.toFixed(0)} (>=${LIMITS.gapLW})`);
  await ctx.close();
}
await b.close(); server.close();
console.log(failures ? `${failures}/${checks} frames fail` : `all ${checks} frames hold`);
process.exit(failures ? 1 : 0);
