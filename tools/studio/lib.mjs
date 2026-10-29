// Quiet Bands Studio: the shared components. Pure functions from data to HTML strings; build.mjs writes the files.
// Every in-studio link goes through `link()`, which makes it relative to the page it sits on, so the section keeps
// working wherever /studio/ is mounted and never points into the parent site by accident.
import { readFileSync } from 'node:fs';
import { SITE, NAV } from './site.mjs';

const ROOT = new URL('../../', import.meta.url);
const brandPath = (file) => readFileSync(new URL(`assets/brand/${file}`, ROOT), 'utf8').match(/ d="([^"]+)"/)[1];
export const MARK_D = brandPath('mark.svg');
export const WORD_D = brandPath('wordmark.svg');

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Relative URL from one studio page to another. Paths are studio-relative: '' is the home, 'pack/' a folder, 'a.css' a file. */
export function rel(from, to) {
  const [toPath, hash = ''] = to.split('#');
  const fromDir = from.endsWith('/') || from === '' ? from : from.slice(0, from.lastIndexOf('/') + 1);
  const a = fromDir.split('/').filter(Boolean), b = toPath.split('/').filter(Boolean);
  const toIsDir = toPath === '' || toPath.endsWith('/');
  let i = 0; while (i < a.length && i < b.length - (toIsDir ? 0 : 1) && a[i] === b[i]) i++;
  let out = '../'.repeat(a.length - i) + b.slice(i).join('/') + (toIsDir && b.length > i ? '/' : '');
  if (out === '') out = './';
  return out + (hash ? '#' + hash : '');
}

/** A link maker bound to one page. `abs` pages (the 404, served at any depth) get /studio/-prefixed links instead. */
export function linker(page) {
  return (to) => (page.abs ? SITE.base + to : rel(page.out, to));
}

export const markSvg = (cls = 'qb') => `<svg class="${cls}" viewBox="0 0 823 658" aria-hidden="true" focusable="false"><path d="${MARK_D}"/></svg>`;
export const wordSvg = () => `<svg class="qb-word" viewBox="0 0 845 155" aria-hidden="true" focusable="false"><path d="${WORD_D}"/></svg>`;

/* ---------- small parts ---------- */

export const kicker = (text, n) => `<p class="kicker">${n ? `<span class="kicker-n">${esc(n)}</span>` : ''}${esc(text)}</p>`;

export function button(href, label, { live = false, track, where, cls = '' } = {}) {
  const t = track ? ` data-track="studio_cta" data-track-props='${esc(JSON.stringify({ cta: track, where }))}'` : '';
  return `<a class="btn${live ? ' btn-live' : ''}${cls ? ' ' + cls : ''}" href="${esc(href)}"${t}>${esc(label)}</a>`;
}

export function workshopWhen() {
  const w = SITE.workshop;
  if (!w.date) return { known: false, line: 'Next date goes to the list first' };
  const d = new Date(w.date);
  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
  return { known: true, line: `${day}, ${time} Central` };
}

/* ---------- forms: one component, three kinds. studio.js posts them to studio_signups. ---------- */

const MAKES = ['Reels and shorts', 'Short films or a series', 'Content for a brand or clients', 'Just starting'];

export function signupForm(L, { kind = 'pack', id = 'f', campaign = '', where = '' } = {}) {
  const f = (name) => `${id}-${name}`;
  const email = `<div class="field"><label for="${f('email')}">Email</label><input class="input" type="email" id="${f('email')}" name="email" autocomplete="email" inputmode="email" required /></div>`;
  const first = `<div class="field"><label for="${f('first')}">First name <span class="opt">optional</span></label><input class="input" type="text" id="${f('first')}" name="first_name" autocomplete="given-name" maxlength="80" /></div>`;
  const makes = `<div class="field"><label for="${f('makes')}">What do you make? <span class="opt">optional</span></label><select class="input" id="${f('makes')}" name="makes"><option value="">Pick one</option>${MAKES.map((m) => `<option>${esc(m)}</option>`).join('')}</select></div>`;
  const hp = `<div class="hp" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>`;
  const err = `<p class="form-error" role="alert" hidden></p>`;
  const attrs = `class="signup" data-signup="${kind}" data-campaign="${esc(campaign)}" data-where="${esc(where)}" novalidate`;

  if (kind === 'pack') {
    return `<form ${attrs}>
      <div class="fields">${email}${first}</div>
      ${makes}
      <label class="check"><input type="checkbox" name="workshop_optin" value="1" /><span>Also save me a seat at the next free Mini-Drama Workshop</span></label>
      ${hp}
      <button class="btn btn-live btn-block" type="submit">Send me the pack</button>
      <p class="fine">Free. You get the pack now, then new packs and workshop dates. To come off the list, email <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
      ${err}
    </form>
    <div class="done" data-done="pack" tabindex="-1" hidden>
      <p class="done-stamp">It’s yours</p>
      <p class="done-h">The pack is open.</p>
      <p class="done-p">Twelve parts on the web, with copy buttons on every prompt, or the same thing as a PDF.</p>
      <p class="done-go">${button(L('pack/inside/'), 'Open the pack', { live: true, track: 'open_pack', where })} <a class="btn" href="${L(packPdf())}" download data-track="studio_pdf_download" data-track-props='{"where":"${esc(where)}"}'>Download the PDF</a></p>
      <p class="done-next" data-if-no-workshop>Next: <a href="${L('workshop/')}">save a seat at the free Mini-Drama Workshop</a>.</p>
    </div>`;
  }

  if (kind === 'workshop') {
    const w = workshopWhen();
    return `<form ${attrs}>
      <div class="fields">${email}${first}</div>
      ${makes}
      <div class="field"><label for="${f('want')}">One idea you’d like to make <span class="opt">optional</span></label><input class="input" type="text" id="${f('want')}" name="idea" maxlength="200" placeholder="A woman finds a key under her mat that isn’t hers" /></div>
      ${hp}
      <button class="btn btn-live btn-block" type="submit">${w.known ? 'Save my seat' : 'Get the next date'}</button>
      <p class="fine">Free. ${w.known ? 'The link comes by email before it starts.' : 'The date comes to this list before it’s posted anywhere.'} To come off the list, email <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
      ${err}
    </form>
    <div class="done" data-done="workshop" tabindex="-1" hidden>
      <p class="done-stamp">Seat saved</p>
      <p class="done-h">You’re on the list.</p>
      <p class="done-p">${w.known ? `See you ${esc(w.line)}. The link comes by email before it starts.` : 'The date comes to you first. The process we follow in the room is written down in the pack, so you can start before we do.'}</p>
      <p class="done-go" data-if-no-pack>${button(L('pack/'), 'Get the free pack', { live: true, track: 'pack_from_workshop', where })}</p>
      <p class="done-go" data-if-pack hidden>${button(L('pack/inside/'), 'Open the pack', { live: true, track: 'open_pack', where })}</p>
    </div>`;
  }

  // commission
  return `<form ${attrs}>
    <div class="fields">
      <div class="field"><label for="${f('name')}">Your name</label><input class="input" type="text" id="${f('name')}" name="first_name" autocomplete="name" maxlength="80" required /></div>
      ${email}
    </div>
    <div class="field"><label for="${f('org')}">Brand, company or project <span class="opt">optional</span></label><input class="input" type="text" id="${f('org')}" name="org" autocomplete="organization" maxlength="120" /></div>
    <div class="field"><label for="${f('what')}">What do you want made?</label><textarea class="input" id="${f('what')}" name="what" rows="5" maxlength="2000" required placeholder="What it is, where it will run, and anything it has to say or show."></textarea></div>
    <div class="field"><label for="${f('when')}">When do you need it? <span class="opt">optional</span></label><select class="input" id="${f('when')}" name="when"><option value="">Pick one</option><option>This month</option><option>In the next three months</option><option>Just exploring</option></select></div>
    ${hp}
    <button class="btn btn-live btn-block" type="submit">Send the brief</button>
    <p class="fine">Flighty reads every brief. No pricing is published: every piece is quoted on what it needs.</p>
    ${err}
  </form>
  <div class="done" data-done="commission" tabindex="-1" hidden>
    <p class="done-stamp">Received</p>
    <p class="done-h">Got it.</p>
    <p class="done-p">If it’s a fit, Flighty replies personally, usually within two business days. If it isn’t, you’ll hear that too.</p>
  </div>`;
}

export const packPdf = () => 'downloads/quiet-bands-studio-ai-content-pack-001.pdf';

/* ---------- shell ---------- */

function header(page, L) {
  const nav = NAV.map((n) => `<a href="${L(n.path)}"${page.section === n.path ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('');
  const sheet = NAV.map((n, i) => `<li><a href="${L(n.path)}"${page.section === n.path ? ' aria-current="page"' : ''}><span class="sheet-n">${String(i + 1).padStart(2, '0')}</span>${esc(n.label)}</a></li>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="bar" data-bar>
  <div class="bar-in">
    <a class="lock" href="${L('')}" aria-label="Quiet Bands Studio, home">${markSvg()}${wordSvg()}<span class="lock-studio" aria-hidden="true">Studio</span></a>
    <nav class="bar-nav" aria-label="Studio">${nav}</nav>
    ${page.hideBarCta ? '' : `<a class="btn btn-live btn-sm bar-cta" href="${L('pack/')}" data-track="studio_cta" data-track-props='{"cta":"pack","where":"bar"}'>Get the free pack</a>`}
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="studio-menu"><span class="menu-btn-label">Menu</span><span class="menu-btn-icon" aria-hidden="true"><i></i><i></i></span></button>
  </div>
</header>
<div class="sheet" id="studio-menu" hidden>
  <nav aria-label="Studio menu"><ul>
    <li><a href="${L('')}"${page.out === '' ? ' aria-current="page"' : ''}><span class="sheet-n">00</span>Studio</a></li>
    ${sheet}
  </ul></nav>
  <div class="sheet-foot">
    ${button(L('pack/'), 'Get the free pack', { live: true, track: 'pack', where: 'menu', cls: 'btn-block' })}
    <p><a href="${SITE.instagram.url}" rel="noopener">${esc(SITE.instagram.handle)}</a> · <a href="${SITE.parent.href}">${esc(SITE.parent.label)}</a></p>
  </div>
</div>`;
}

function footer(page, L) {
  return `<footer class="foot">
  <div class="wrap">
    <p class="foot-line">One sentence in.<br />One scene out.</p>
    <div class="foot-grid">
      <nav class="foot-nav" aria-label="Studio, footer">
        <a href="${L('')}">Studio</a>
        ${NAV.map((n) => `<a href="${L(n.path)}">${esc(n.label)}</a>`).join('')}
      </nav>
      <div class="foot-meta">
        <a href="${SITE.instagram.url}" rel="noopener">Instagram ${esc(SITE.instagram.handle)}</a>
        <a href="mailto:${SITE.email}">${SITE.email}</a>
        <a class="foot-parent" href="${SITE.parent.href}">${markSvg()}<span>${esc(SITE.parent.label)}</span></a>
      </div>
    </div>
  </div>
</footer>`;
}

function dock(page, L) {
  if (!page.dock) return '';
  const { href, label, text, track } = page.dock;
  return `<div class="dock" data-dock hidden><p>${esc(text)}</p><a class="btn btn-live btn-sm" href="${esc(href.startsWith('#') ? href : L(href))}" data-track="studio_cta" data-track-props='{"cta":"${esc(track)}","where":"dock"}'>${esc(label)}</a></div>`;
}

/** The whole document for one page. */
export function layout(page, body) {
  const L = linker(page);
  const url = SITE.origin + SITE.base + page.out;
  const title = page.out === '' ? page.title : `${page.title} · ${SITE.name}`;
  const og = SITE.origin + SITE.base + (page.og || 'og-studio.png');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}" />
<meta name="theme-color" content="#000000" />
${page.noindex ? '<meta name="robots" content="noindex" />\n' : ''}<link rel="canonical" href="${esc(page.canonical || url)}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${SITE.name}" />
<meta property="og:title" content="${esc(page.ogTitle || page.title)}" />
<meta property="og:description" content="${esc(page.description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${og}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${esc(page.ogAlt || 'Quiet Bands Studio. Turn ideas into cinematic content.')}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(page.ogTitle || page.title)}" />
<meta name="twitter:description" content="${esc(page.description)}" />
<meta name="twitter:image" content="${og}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Hubot+Sans:wdth,wght@75..125,200..900&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${L('assets/studio.css')}?v=1" />
<script>document.documentElement.classList.add('js');</script>
${page.jsonld ? `<script type="application/ld+json">${JSON.stringify(page.jsonld)}</script>\n` : ''}</head>
<body class="${esc(page.bodyClass || '')}" data-page-view="studio_page_view">
${header(page, L)}
<main id="main">
${body}
</main>
${footer(page, L)}
${dock(page, L)}
<script type="module" src="${L('assets/studio.js')}?v=1"></script>
</body>
</html>
`;
}
