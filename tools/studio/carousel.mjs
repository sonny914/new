// Instagram carousels in the Studio's look: black ground, cream type, one orange for the live thing, Hubot Sans
// set as film (condensed title cards, viewfinder marks, hairline rules, grain).
// A carousel is a data file in tools/studio/carousels/<slug>.mjs; this renders it to 1080×1350 PNGs plus the caption.
//   node tools/studio/carousel.mjs <slug>            writes social/<slug>/01.png … NN.png and caption.txt
//   node tools/studio/carousel.mjs <slug> --html     also writes social/<slug>/preview.html (all slides, one page)
// Needs Playwright, like render.mjs. The Google Fonts stylesheet must be reachable or the slides fall back to system type.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { esc, markSvg, wordSvg } from './lib.mjs';
import { SITE } from './site.mjs';

export const W = 1080, H = 1350;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Escape, then turn *word* into the slide's one live (orange) span. */
export const live = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em class="live">$1</em>').replace(/\n/g, '<br />');
/** The copy with its markers removed, for checks and alt text. */
export const plain = (s) => String(s ?? '').replace(/\*/g, '');

/* ---------- visuals: drawn, never photos, so every slide is ours ---------- */

const VISUALS = {
  // A 9:16 viewfinder: the format itself.
  frame: (v) => `<div class="vf" aria-hidden="true"><div class="marks"><i></i><i></i><i></i><i></i></div>
    <p class="vf-top"><span><b class="rec"></b>Rec</span><span>${esc(v.tc)}</span></p>
    <span class="vf-cross"></span><p class="vf-foot">${esc(v.label)}</p></div>`,
  // A contact sheet of vertical frames: the slate of series.
  slate: (v) => `<div class="sheet" aria-hidden="true">${'<i></i>'.repeat(v.count)}</div>`,
  // A phone with the episode run on it.
  phone: (v) => `<div class="phone" aria-hidden="true"><p class="phone-t">${esc(v.title)}</p>
    <ol>${Array.from({ length: v.episodes }, (_, i) => `<li><span>Ep ${String(i + 1).padStart(2, '0')}</span><b></b></li>`).join('')}</ol>
    ${(v.meta || []).map((m) => `<p class="phone-m">${esc(m)}</p>`).join('')}
    <p class="phone-w">${esc(v.where)}</p></div>`,
  // Columns to scale. `on` is the one that's the slide's number, `open` a forecast drawn as an outline.
  bars: (v) => {
    const max = Math.max(...v.bars.map((b) => b.value));
    return `<div class="bars" aria-hidden="true">${v.bars.map((b) => `<div class="bar${b.on ? ' on' : ''}${b.open ? ' open' : ''}">
      <p class="bar-v">${esc(b.value)}<small>${esc(v.unit)}</small></p><span style="height:${(b.value / max * 100).toFixed(1)}%"></span>
      <p class="bar-l">${esc(b.label)}<small>${esc(b.note)}</small></p></div>`).join('')}</div>`;
  },
  // A grid of cells with one filled: the odds, counted out.
  cells: (v) => `<div class="cells-wrap" aria-hidden="true"><div class="cells" style="grid-template-columns:repeat(${v.cols},1fr)">${'<i></i>'.repeat(v.cols * v.rows - 1)}<i class="on"></i></div><p class="vis-cap">${esc(v.label)}</p></div>`,
  // Horizontal shares against a midline.
  split: (v) => `<div class="split" aria-hidden="true">${v.rows.map((r) => `<div class="row${r.on ? ' on' : ''}"><p>${esc(r.label)}</p>
    <div class="track"><span style="width:${r.value}%"></span><i style="left:${v.mid}%"></i></div><p class="pct">${esc(r.value)}%</p></div>`).join('')}
    <p class="vis-cap">${esc(v.caption)}</p></div>`,
};

/* ---------- one slide ---------- */

function slide(c, s, i) {
  const n = String(i + 1).padStart(2, '0'), total = String(c.slides.length).padStart(2, '0');
  const last = i === c.slides.length - 1;
  const vis = s.visual ? VISUALS[s.visual.type](s.visual) : '';
  const kicker = `<p class="kicker"><span class="kicker-n">${n}</span>${esc(s.kicker)}</p>`;
  let main = '';
  if (s.kind === 'cover') {
    // The lede and the run of what's inside on the left, the viewfinder on the right.
    const list = (s.list || []).map((t, j) => `<li><span>${String(j + 2).padStart(2, '0')}</span>${esc(t)}</li>`).join('');
    main = `${kicker}<h1 class="display xl">${live(s.title)}</h1>
      <div class="cover-row"><div class="cover-copy"><p class="lede">${esc(s.lede)}</p>${list ? `<ol class="toc">${list}</ol>` : ''}</div>${vis}</div>`;
  } else if (s.kind === 'stat') {
    // A `beside` visual sits to the right of the number; the rest get the row under the title.
    const beside = s.visual?.beside;
    main = `${kicker}<div class="stat-row"><p class="stat">${live(s.stat)}</p>${beside ? `<div class="vis-side">${vis}</div>` : ''}</div>
      <h2 class="display md">${live(s.title)}</h2>
      ${vis && !beside ? `<div class="vis">${vis}</div>` : ''}<p class="body">${esc(s.body)}</p>`;
  } else if (s.kind === 'story') {
    main = `${kicker}<div class="story-row"><div><h2 class="display lg">${live(s.title)}</h2><p class="body">${esc(s.body)}</p></div>${vis}</div>`;
  } else if (s.kind === 'cta') {
    main = `${kicker}<h2 class="display xxl">${live(s.title)}</h2><p class="lede">${esc(s.lede)}</p>
      <div class="pitch">${s.pitchLead ? `<p class="pitch-lead">${esc(s.pitchLead)}</p>` : ''}<p class="pitch-line">${live(s.pitch)}</p><p class="body">${esc(s.pitchNote)}</p></div>`;
  }
  return `<section class="slide k-${s.kind}" data-n="${n}">
  <div class="marks" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <header class="top"><p class="lock">${markSvg()}${wordSvg()}<span class="lock-studio">Studio</span></p><p class="slate">${esc(c.slate)}</p></header>
  <main class="main">${main}</main>
  ${s.takeaway ? `<p class="takeaway">${esc(s.takeaway)}</p>` : ''}
  ${s.source ? `<p class="source">Source · ${esc(s.source)}</p>` : ''}
  <footer class="foot"><p class="handle">${esc(SITE.instagram.handle)}</p>
    <p>${last ? 'quietbands.com/studio' : `<span class="pg">${n} / ${total}</span><span class="sw">Swipe →</span>`}</p></footer>
</section>`;
}

const CSS = `
:root{--ground:#000;--lift:#0A0908;--text:#F2EEE5;--live:#FF5A00;--dim:rgba(242,238,229,.7);--faint:rgba(242,238,229,.44);--rule:rgba(242,238,229,.16);--rule-strong:rgba(242,238,229,.34)}
*{box-sizing:border-box;margin:0;padding:0}
/* Hubot Sans with one borrowed glyph: its dotted zero reads as a theta at slide sizes, so 0 comes from Mona Sans, its sibling. */
html,body{background:var(--ground);color:var(--text);font-family:'Mona Sans','Hubot Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.slide{position:relative;width:${W}px;height:${H}px;padding:64px 76px 56px;display:flex;flex-direction:column;background:var(--lift);overflow:hidden}
.slide::before{content:"";position:absolute;inset:0;background:url('/assets/lab/grain.png') repeat;background-size:128px;opacity:.07;pointer-events:none}
.slide::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 42%,transparent 58%,rgba(0,0,0,.55) 100%);pointer-events:none}
.slide>*{position:relative;z-index:1}
.marks{position:absolute;inset:0;z-index:2;pointer-events:none}
.marks i{position:absolute;width:30px;height:30px;border:0 solid var(--faint)}
.marks i:nth-child(1){top:26px;left:26px;border-top-width:2px;border-left-width:2px}
.marks i:nth-child(2){top:26px;right:26px;border-top-width:2px;border-right-width:2px}
.marks i:nth-child(3){bottom:26px;left:26px;border-bottom-width:2px;border-left-width:2px}
.marks i:nth-child(4){bottom:26px;right:26px;border-bottom-width:2px;border-right-width:2px}
.top{display:flex;justify-content:space-between;align-items:center}
.lock{display:flex;align-items:center;gap:14px}
.qb,.qb-word{fill:currentColor;flex:0 0 auto}.qb{width:40px;height:32px}.qb-word{width:146px;height:27px}
.lock-studio,.slate,.kicker,.source,.foot p,.stat-label,.vis-cap,.bar-l,.vf p,.phone-w,.phone li span,.split p{font-weight:600;font-stretch:112%;letter-spacing:.16em;text-transform:uppercase;font-variant-numeric:tabular-nums}
.lock-studio{font-size:18px;line-height:27px;padding-left:14px;border-left:1px solid var(--rule-strong)}
.slate{font-size:17px;color:var(--faint)}
.main{flex:1;display:flex;flex-direction:column;min-height:0;padding-top:56px}
.kicker{display:flex;align-items:center;gap:18px;font-size:21px;color:var(--dim)}
.kicker-n{display:inline-flex;align-items:center;gap:18px;color:var(--text)}
.kicker-n::after{content:"";width:44px;height:1px;background:var(--rule-strong)}
.display{font-weight:800;font-stretch:75%;text-transform:uppercase;letter-spacing:-.005em;line-height:.86;text-wrap:balance}
.display.xxl{font-size:206px;margin-top:34px}
.display.xl{font-size:176px;margin-top:30px}
.display.lg{font-size:118px;margin-top:30px}
.display.md{font-size:84px;line-height:.9;margin-top:30px;max-width:22ch}
.live{font-style:normal;color:var(--live)}
.stat-row{display:flex;align-items:flex-end;gap:48px;margin-top:56px}
.stat{flex:0 0 auto;font-weight:800;font-stretch:75%;font-size:320px;line-height:.78;letter-spacing:-.02em}
.vis-side{flex:1;min-width:0;padding-bottom:4px}
.lede{font-size:36px;line-height:1.32;color:var(--dim);max-width:24ch;margin-top:36px}
.body{font-size:29px;line-height:1.42;color:var(--dim);max-width:44ch}
.k-stat .body{margin-top:30px}
.vis{flex:1;display:flex;align-items:center;min-height:0;padding-top:28px}
.takeaway{font-size:36px;line-height:1.24;font-weight:600;max-width:30ch;margin-top:30px;padding-left:24px;border-left:2px solid var(--text);text-wrap:balance}
.source{font-size:15px;color:var(--faint);margin-top:28px}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--rule)}
.foot p{font-size:18px;color:var(--dim)}.foot .handle{color:var(--text);letter-spacing:.08em;text-transform:none}
.foot .sw{margin-left:28px;color:var(--text)}

/* cover */
.cover-row{flex:1;display:flex;justify-content:space-between;align-items:flex-end;gap:48px;margin-top:40px}
.cover-copy{flex:1;min-width:0}
.k-cover .lede{margin-top:0;font-size:32px;max-width:22ch}
.toc{list-style:none;margin-top:36px;border-top:1px solid var(--rule)}
.toc li{display:flex;align-items:baseline;gap:20px;padding:13px 0;border-bottom:1px solid var(--rule);font-size:21px;font-weight:600;font-stretch:112%;letter-spacing:.14em;text-transform:uppercase}
.toc span{color:var(--faint);font-size:17px}
.vf{position:relative;flex:0 0 auto;width:330px;height:587px;border:1px solid var(--rule-strong);background:#050505}
.vf .marks i{width:22px;height:22px;border-color:var(--text)}
.vf .marks i:nth-child(1),.vf .marks i:nth-child(2){top:14px}.vf .marks i:nth-child(3),.vf .marks i:nth-child(4){bottom:14px}
.vf .marks i:nth-child(1),.vf .marks i:nth-child(3){left:14px}.vf .marks i:nth-child(2),.vf .marks i:nth-child(4){right:14px}
.vf p{position:absolute;left:28px;right:28px;font-size:14px;color:var(--dim);display:flex;justify-content:space-between}
.vf-top{top:46px}.vf-foot{bottom:46px}
.rec{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--text);margin-right:10px;vertical-align:1px}
.vf-cross{position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}
.vf-cross::before,.vf-cross::after{content:"";position:absolute;background:var(--faint)}
.vf-cross::before{left:50%;top:0;bottom:0;width:1px}.vf-cross::after{top:50%;left:0;right:0;height:1px}

/* story (phone right) */
.story-row{flex:1;display:flex;gap:48px;align-items:stretch}
.story-row>div:first-child{flex:1;display:flex;flex-direction:column}
.story-row .body{margin-top:auto;font-size:28px}
.phone{flex:0 0 auto;align-self:center;width:300px;height:600px;border:2px solid var(--rule-strong);border-radius:40px;padding:64px 26px 34px;display:flex;flex-direction:column;background:#050505;position:relative}
.phone::before{content:"";position:absolute;top:20px;left:50%;width:84px;height:22px;border-radius:12px;background:var(--rule);transform:translateX(-50%)}
.phone-t{font-weight:800;font-stretch:75%;text-transform:uppercase;font-size:52px;line-height:.88;text-wrap:balance}
.phone ol{list-style:none;margin-top:30px;display:flex;flex-direction:column;gap:14px}
.phone li{display:flex;align-items:center;gap:14px}
.phone li span{font-size:13px;color:var(--dim);flex:0 0 auto}
.phone li b{flex:1;height:30px;border:1px solid var(--rule-strong)}

.phone-m{font-size:15px;color:var(--dim);margin-top:14px;font-weight:600;font-stretch:112%;letter-spacing:.12em;text-transform:uppercase}
.phone ol+.phone-m{margin-top:28px}
.phone-w{margin-top:auto;font-size:12px;color:var(--faint);letter-spacing:.12em}

/* contact sheet */
.sheet{display:grid;grid-template-columns:repeat(13,44px);gap:10px}
.sheet i{aspect-ratio:9/16;border:1px solid var(--rule-strong)}


/* columns */
.bars{display:flex;align-items:flex-end;gap:36px;width:100%;height:100%;max-height:330px}
.bar{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end}
.bar span{display:block;background:rgba(242,238,229,.3)}
.bar.on span{background:var(--text)}
.bar.open span{background:transparent;border:2px dashed var(--rule-strong)}
.bar-v{font-weight:800;font-stretch:75%;font-size:46px;line-height:1;margin-bottom:12px}
.bar-v small{font-size:22px;margin-left:4px;color:var(--dim);font-weight:700}
.bar:not(.on) .bar-v{color:var(--dim)}
.bar-l{font-size:17px;margin-top:14px;display:flex;justify-content:space-between;color:var(--text)}
.bar-l small{font-size:14px;color:var(--faint)}

/* cells */
.cells-wrap{width:100%}
.cells{display:grid;gap:7px;width:100%}
.cells i{aspect-ratio:1;border:1px solid var(--rule-strong)}
.cells i.on{background:var(--text);border-color:var(--text)}
.vis-cap{font-size:16px;color:var(--faint);margin-top:16px}

/* split */
.split{width:100%;display:flex;flex-direction:column;gap:12px}
.split .row{display:grid;grid-template-columns:150px 1fr 110px;align-items:center;gap:24px}
.split .row p{font-size:19px;color:var(--dim)}
.split .row .pct{font-weight:800;font-stretch:75%;font-size:40px;line-height:1;letter-spacing:0;text-align:right}
.split .row.on p{color:var(--text)}
.track{position:relative;height:32px;border:1px solid var(--rule-strong)}
.track span{position:absolute;inset:0 auto 0 0;background:rgba(242,238,229,.3)}
.split .row.on .track span{background:var(--text)}
.track i{position:absolute;top:-8px;bottom:-8px;width:1px;background:var(--faint)}

/* cta */
.k-cta .lede{font-size:40px;color:var(--text);margin-top:40px}
.pitch{margin-top:auto;padding-top:36px;border-top:1px solid var(--rule)}
.pitch-lead{font-size:28px;color:var(--dim);margin-bottom:16px}
.pitch-line{font-weight:800;font-stretch:75%;text-transform:uppercase;font-size:84px;line-height:.9}
.pitch .body{margin-top:24px;font-size:28px}
`;

export function page(c, only = null) {
  const slides = c.slides.map((s, i) => slide(c, s, i)).filter((_, i) => only === null || i === only);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>${esc(c.slug)}</title>
<link href="https://fonts.googleapis.com/css2?family=Hubot+Sans:wdth,wght@75..125,200..900&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Mona+Sans:wdth,wght@75..125,200..900&text=0&display=swap" rel="stylesheet" />
<style>${CSS}${only === null ? 'body{display:flex;flex-direction:column;gap:40px;padding:40px;align-items:center}' : ''}</style></head><body>${slides.join('\n')}</body></html>`;
}

/** Runs in the page: blocks that collide with their neighbours, or spill out of the slide or their visual's box. */
function overlaps() {
  const out = [], r = (e) => e.getBoundingClientRect(), name = (e) => e.className || e.tagName;
  const slide = document.querySelector('.slide'), S = r(slide);
  const stack = (parent) => [...parent.children].filter((e) => getComputedStyle(e).position !== 'absolute' && r(e).height > 0);
  for (const parent of [slide, document.querySelector('.main'), ...document.querySelectorAll('.cover-copy, .story-row > div:first-child, .pitch')]) {
    if (!parent) continue;
    const kids = stack(parent);
    for (let k = 1; k < kids.length; k++) if (r(kids[k]).top < r(kids[k - 1]).bottom - 1 && getComputedStyle(parent).flexDirection !== 'row') out.push(`${name(kids[k - 1])} runs into ${name(kids[k])}`);
  }
  for (const box of document.querySelectorAll('.vis, .vis-side, .cover-row, .story-row, .stat-row')) {
    const B = r(box);
    for (const e of box.querySelectorAll('*')) { if (getComputedStyle(e).display === 'inline') continue; const E = r(e); if (E.bottom > B.bottom + 1 || E.top < B.top - 1) { out.push(`${name(e)} spills out of ${name(box)}`); break; } }
  }
  for (const e of slide.querySelectorAll('*')) { const E = r(e); if (E.right > S.right - 40 || E.bottom > S.bottom - 30) { if (!e.closest('.marks')) { out.push(`${name(e)} reaches the edge`); break; } } }
  return out;
}

export async function load(slug) {
  return (await import(pathToFileURL(fileURLToPath(new URL(`./carousels/${slug}.mjs`, import.meta.url))).href)).CAROUSEL;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [slug, ...flags] = process.argv.slice(2);
  if (!slug) { console.error('usage: node tools/studio/carousel.mjs <slug> [--html]'); process.exit(1); }
  const c = await load(slug);
  const { chromium } = await import('playwright');
  const { serve } = await import('./serve.mjs');
  const out = `${ROOT}social/${c.slug}/`;
  mkdirSync(out, { recursive: true });
  const server = await serve(0);
  const origin = `http://localhost:${server.address().port}`;
  const browser = await (async () => {
    if (process.env.CHROMIUM) return chromium.launch({ executablePath: process.env.CHROMIUM });
    for (const channel of ['chrome', 'msedge']) { try { return await chromium.launch({ channel }); } catch { /* next */ } }
    return chromium.launch();
  })();
  const errors = [];
  try {
    const p = await browser.newPage({ viewport: { width: W, height: H } });
    p.on('pageerror', (e) => errors.push(e.message));
    for (let i = 0; i < c.slides.length; i++) {
      // served from the site origin so the grain loads like it does on the pages
      await p.route(`${origin}/__slide`, (r) => r.fulfill({ contentType: 'text/html', body: page(c, i) }));
      await p.goto(`${origin}/__slide`, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      const clash = await p.evaluate(overlaps);
      if (clash.length) errors.push(`slide ${i + 1}: ${clash.join('; ')}`);
      const file = `${String(i + 1).padStart(2, '0')}.png`;
      await p.screenshot({ path: out + file, type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
      await p.unroute(`${origin}/__slide`);
      console.log(`wrote social/${c.slug}/${file}`);
    }
    writeFileSync(out + 'caption.txt', c.caption + '\n');
    console.log(`wrote social/${c.slug}/caption.txt`);
    if (flags.includes('--html')) { writeFileSync(out + 'preview.html', page(c)); console.log(`wrote social/${c.slug}/preview.html`); }
  } finally {
    await browser.close();
    server.close();
  }
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
}
