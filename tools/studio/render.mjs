// Render the Studio's binary assets from the built pages, so they never drift from the source:
//   studio/downloads/quiet-bands-studio-ai-content-pack-001.pdf   the web edition (/studio/pack/inside/) through its print stylesheet
//   studio/og-studio.png, studio/og-pack.png                       1200×630 share cards in the Studio's type and palette
//   node tools/studio/render.mjs [--pdf] [--og]    (both when neither flag is given; run `npm run studio:build` first)
// Needs Playwright (`npm i --no-save playwright`). It drives an installed Chrome or Edge, or set CHROMIUM to a browser binary.
// The Google Fonts stylesheet the pages use must be reachable, or the cards and PDF fall back to system type.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { STUDIO_DIR } from './build.mjs';
import { PACK, PARTS, numberedPrompts } from './content/pack.mjs';
import { SITE } from './site.mjs';
import { esc, markSvg, wordSvg, packPdf } from './lib.mjs';

const args = process.argv.slice(2);
const want = (f) => !args.length || args.includes(f);

async function launch() {
  if (process.env.CHROMIUM) return chromium.launch({ executablePath: process.env.CHROMIUM });
  for (const channel of ['chrome', 'msedge']) { try { return await chromium.launch({ channel }); } catch { /* try the next */ } }
  return chromium.launch();
}

/** One share card. The frame marks, slate and lockup are the hero's, at card size. */
function card({ slate, kicker, title, foot }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
<link href="https://fonts.googleapis.com/css2?family=Hubot+Sans:wdth,wght@75..125,200..900&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/studio/assets/studio.css" />
<style>
  html,body{width:1200px;height:630px;overflow:hidden}
  .card{position:relative;width:1200px;height:630px;padding:64px 72px;display:flex;flex-direction:column;background:var(--lift)}
  .card::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 45%,transparent 55%,rgba(0,0,0,.6) 100%)}
  .card > *{position:relative;z-index:1}
  .card > .marks{position:absolute;inset:0;z-index:2}
  .marks i{width:22px;height:22px}
  .marks i:nth-child(1),.marks i:nth-child(2){top:22px}.marks i:nth-child(3),.marks i:nth-child(4){bottom:22px}
  .marks i:nth-child(1),.marks i:nth-child(3){left:22px}.marks i:nth-child(2),.marks i:nth-child(4){right:22px}
  .top{display:flex;justify-content:space-between;align-items:center}
  .lock .qb{width:36px;height:29px}.lock .qb-word{width:128px;height:23px}.lock .lock-studio{font-size:14px;line-height:23px}
  .slate{position:static;font-size:13px;color:var(--faint)}
  .kicker{margin-top:auto;padding-top:28px;font-size:16px}
  .kicker b{color:var(--live);font-weight:700}
  .display{font-size:118px;margin-top:18px;max-width:15ch}
  .foot-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:36px;padding-top:20px;border-top:1px solid var(--rule)}
  .foot-row p{font-size:14px;font-weight:600;font-stretch:112%;letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}
  .foot-row .url{color:var(--text)}
</style></head><body><div class="card">
  <div class="marks" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <div class="top"><p class="lock">${markSvg()}${wordSvg()}<span class="lock-studio">Studio</span></p><p class="slate">${esc(slate)}</p></div>
  <p class="kicker">${kicker}</p>
  <h1 class="display">${esc(title)}</h1>
  <div class="foot-row"><p>${esc(foot)}</p><p class="url">quietbands.com/studio</p></div>
</div></body></html>`;
}

const prompts = numberedPrompts().reduce((n, g) => n + g.items.length, 0);
const CARDS = {
  'og-studio.png': card({ slate: 'SC 01 · TK 01', kicker: 'AI filmmaking + creator education', title: 'Turn ideas into cinematic content.', foot: 'Free pack · Free guides · Commissions' }),
  'og-pack.png': card({ slate: `Edition ${PACK.edition}`, kicker: `<span><b>Free</b> · ${esc(PACK.name)} ${esc(PACK.edition)}</span>`, title: `${PACK.title}.`, foot: `${PARTS.length} parts · ${prompts} shot prompts · PDF + web` }),
};

const server = await serve(0);
const origin = `http://localhost:${server.address().port}`;
const browser = await launch();
const errors = [];
try {
  if (want('--pdf')) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${origin}${SITE.base}pack/inside/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const out = STUDIO_DIR + packPdf();
    mkdirSync(dirname(out), { recursive: true });
    await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    console.log('wrote studio/' + packPdf());
    await page.close();
  }
  if (want('--og')) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    page.on('pageerror', (e) => errors.push(e.message));
    for (const [file, html] of Object.entries(CARDS)) {
      // served from the origin so the card can load the Studio's own stylesheet
      await page.route(`${origin}/__card`, (r) => r.fulfill({ contentType: 'text/html', body: html }));
      await page.goto(`${origin}/__card`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: STUDIO_DIR + file, type: 'png' });
      await page.unroute(`${origin}/__card`);
      console.log('wrote studio/' + file);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1); }
