// Quiet Bands Studio: every page, as data plus a body. `out` is the page's path inside /studio/.
import { SITE, CAMPAIGNS } from './site.mjs';
import { PACK, PARTS, GUIDES, numberedPrompts } from './content/pack.mjs';
import { esc, kicker, button, signupForm, workshopWhen, packPdf, linker, markSvg, wordSvg } from './lib.mjs';

/* ---------- pack blocks ---------- */

function copyBtn(label = 'Copy') { return `<button class="copy" type="button" data-copy>${label}</button>`; }

function renderBlock(b) {
  if (b.p) return `<p>${esc(b.p)}</p>`;
  if (b.h) return `<h3 class="part-h">${esc(b.h)}</h3>`;
  if (b.steps) return `<ol class="steps">${b.steps.map(([lead, t]) => `<li><b>${esc(lead)}</b> ${esc(t)}</li>`).join('')}</ol>`;
  if (b.table) {
    const { head, rows } = b.table;
    return `<div class="table${head.length > 2 ? ' table-3' : ''}"><table><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td data-label="${esc(head[i])}">${esc(c)}</td>`)).join('')}</tr>`)
      .join('')}</tbody></table></div>`;
  }
  if (b.template) return `<div class="tpl"><pre data-copy-src>${esc(b.template)}</pre>${copyBtn()}</div>`;
  if (b.example) return `<dl class="example">${b.example.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  throw new Error('unknown block ' + JSON.stringify(b).slice(0, 60));
}

function renderPrompts() {
  return numberedPrompts().map((g) => `<h3 class="part-h">${esc(g.cat)}</h3>
    <ol class="prompts">${g.items.map((p) => `<li class="prompt" id="${p.id.toLowerCase()}"><span class="prompt-id">${p.id}</span><p class="prompt-text" data-copy-src>${esc(p.text)}</p>${copyBtn()}</li>`).join('')}</ol>`).join('');
}

function renderPart(part, { level = 'h2', number = true } = {}) {
  let inner = (part.blocks || []).map(renderBlock).join('');
  if (part.prompts) inner += renderPrompts();
  if (part.hooks) inner += part.hooks.map((g) => `<h3 class="part-h">${esc(g.cat)}</h3><ol class="hooks">${g.items.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>`).join('');
  if (part.checklist) inner += part.checklist.map((g) => `<h3 class="part-h">${esc(g.cat)}</h3><ul class="checks">${g.items.map((c) => `<li><label><input type="checkbox" /><span>${esc(c)}</span></label></li>`).join('')}</ul>`).join('');
  return `<section class="part" id="${part.id}">
    <header class="part-head">${number ? `<p class="part-n" aria-hidden="true">${part.n}</p>` : ''}<${level} class="part-title">${number ? `<span class="vh">Part ${part.n}. </span>` : ''}${esc(part.title)}</${level}><p class="part-sum">${esc(part.summary)}</p></header>
    <div class="prose">${inner}</div>
  </section>`;
}

const minutes = (parts) => Math.max(2, Math.round(parts.map((p) => JSON.stringify(p)).join(' ').split(/\s+/).length / 220));

/* ---------- repeated sections ---------- */

const frameMarks = '<div class="marks" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';

function insideList(L, { compact = false } = {}) {
  return `<ol class="index${compact ? ' index-compact' : ''}">${PARTS.map((p) => `<li><span class="index-n">${p.n}</span><span class="index-t">${esc(p.title)}</span>${compact ? '' : `<span class="index-s">${esc(p.summary)}</span>`}</li>`).join('')}</ol>`;
}

function faq(items) {
  return `<div class="faq">${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}</div>`;
}

function offers(L, where, { skipPack = false } = {}) {
  const w = workshopWhen();
  return `<ol class="offers">
    ${skipPack ? '' : `<li class="offer">
      <p class="offer-tag"><span>01</span><span>Free · PDF + web</span></p>
      <h3 class="offer-title">AI Content Pack 001</h3>
      <p>The idea test, a 60-second beat sheet, character lock, 24 shot prompts, camera and light words, the edit, 25 hooks and a four-week posting plan.</p>
      ${button(L('pack/'), 'Get the pack', { live: true, track: 'pack', where })}
    </li>`}
    <li class="offer">
      <p class="offer-tag"><span>02</span><span>Free · ${esc(SITE.workshop.where)}</span></p>
      <h3 class="offer-title">Mini-Drama Workshop</h3>
      <p>One sentence in, one finished scene out, in one sitting, next to other people making theirs. <span class="offer-when">${esc(w.line)}.</span></p>
      ${button(L('workshop/'), w.known ? 'Save a seat' : 'Get the date', { live: skipPack, track: 'workshop', where })}
    </li>
    <li class="offer">
      <p class="offer-tag"><span>03</span><span>By brief</span></p>
      <h3 class="offer-title">Commission</h3>
      <p>When you need a cinematic piece made rather than taught: a launch, an ad, a title sequence, a scene for a song.</p>
      ${button(L('commission/'), 'Send a brief', { track: 'commission', where })}
    </li>
  </ol>`;
}

function guideList(L) {
  return `<ol class="rows">${GUIDES.map((g, i) => `<li><a class="row" href="${L(`learn/${g.slug}/`)}"><span class="row-n">${String(i + 1).padStart(2, '0')}</span><span class="row-t">${esc(g.title)}</span><span class="row-s">${esc(g.lede)}</span><span class="row-go" aria-hidden="true">Read</span></a></li>`).join('')}</ol>`;
}

/* ---------- pages ---------- */

const home = {
  out: '', section: '', title: 'Quiet Bands Studio · AI filmmaking and creator education',
  ogTitle: 'Quiet Bands Studio',
  description: 'Free prompts, a working process and live workshops for making short dramas and Reels with AI. Run by Flighty, part of Quiet Bands.',
  dock: { href: 'pack/', label: 'Get the free pack', text: 'AI Content Pack 001 · free', track: 'pack' },
  jsonld: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Quiet Bands Studio', url: SITE.origin + SITE.base, parentOrganization: { '@type': 'Organization', name: 'Quiet Bands', url: SITE.origin + '/' }, sameAs: [SITE.instagram.url] },
  body(L) {
    const w = workshopWhen();
    return `
<section class="hero">
  <div class="frame frame-hero">
    ${frameMarks}
    <p class="slate" aria-hidden="true"><span>SC 01</span><span>TK 01</span><span>INT. YOUR PHONE · NIGHT</span></p>
    <div class="hero-copy">
      ${kicker('AI filmmaking + creator education')}
      <h1 class="display">Turn ideas into cinematic content.</h1>
      <p class="lede">Free prompts, a working process and live workshops for making short dramas and Reels with AI. Run by Flighty, part of Quiet Bands.</p>
      <p class="cta-row">${button(L('pack/'), 'Get the free pack', { live: true, track: 'pack', where: 'home-hero' })}${button(L('workshop/'), w.known ? 'Save a workshop seat' : 'Join the free workshop', { track: 'workshop', where: 'home-hero' })}</p>
    </div>
    <p class="tc" aria-hidden="true"><span data-timecode>00:00:00:00</span></p>
  </div>
</section>

<section class="sec" id="method">
  <div class="wrap">
    ${kicker('The method', '01')}
    <h2 class="h2">Credits are film stock.</h2>
    <div class="split">
      <p class="big">Making a scene with AI got cheap. Knowing which scenes deserve making didn’t. Every generation you throw away is a decision you could have made on paper. So the Studio works the way Quiet Bands works: before you build it, <em class="kill">try to kill it.</em></p>
      <ol class="trio">
        <li><b>Kill it on paper.</b> Five questions before the first credit. Most ideas should fail here, cheaply.</li>
        <li><b>Lock it before you shoot.</b> One identity block per character, one light per scene, one move per shot.</li>
        <li><b>Cut it like film.</b> Trim to the moment, cut on movement, four layers of sound under everything.</li>
      </ol>
    </div>
    <p class="go"><a class="arrow" href="${L('learn/60-second-drama/')}">Read the 60-second drama guide</a></p>
  </div>
</section>

<section class="sec" id="ways-in">
  <div class="wrap">
    ${kicker('Three ways in', '02')}
    <h2 class="h2">Start free.</h2>
    ${offers(L, 'home-offers')}
  </div>
</section>

<section class="sec sec-block" id="the-block">
  <div class="wrap">
    ${kicker('In production', '03')}
    <div class="frame frame-wide">
      ${frameMarks}
      <p class="block-title" aria-hidden="true">The Block</p>
      <h2 class="vh">The Block</h2>
    </div>
    <div class="split">
      <p class="big">Flighty’s own project, built in public on Instagram: the scenes, the prompts that made them and the takes that didn’t make it.</p>
      <p class="go">${button(SITE.instagram.url, `Follow ${SITE.instagram.handle}`, { track: 'instagram', where: 'home-block' })}</p>
    </div>
  </div>
</section>

<section class="sec" id="learn">
  <div class="wrap">
    ${kicker('Free guides', '04')}
    <h2 class="h2">Read before you generate.</h2>
    ${guideList(L)}
    <p class="go"><a class="arrow" href="${L('learn/')}">All guides</a></p>
  </div>
</section>

<section class="sec sec-get" id="get">
  <div class="wrap get">
    <div>
      ${kicker('Start here', '05')}
      <h2 class="h2">Get the pack.</h2>
      <p class="big">Twelve parts, free, on the web and as a PDF. It opens as soon as you send the form.</p>
    </div>
    <div class="get-form">${signupForm(L, { kind: 'pack', id: 'home', where: 'home-get' })}</div>
  </div>
</section>`;
  },
};

const pack = {
  out: 'pack/', section: 'pack/', title: 'AI Content Pack 001: Idea to episode', ogTitle: 'Free AI Content Pack: idea to episode',
  description: 'Free. The idea test, a 60-second drama beat sheet, character lock, 24 copy-ready shot prompts, camera and light words, the edit, 25 hooks and a four-week posting plan.',
  og: 'og-pack.png', ogAlt: 'AI Content Pack 001. Idea to episode. Free from Quiet Bands Studio.',
  hideBarCta: true, bodyClass: 'page-pack',
  dock: { href: '#get', label: 'Get the pack', text: 'Free · PDF + web', track: 'pack' },
  body(L) {
    const taste = numberedPrompts()[2].items[0];
    return `
<section class="hero hero-split">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      ${kicker(`Free · PDF + web · Edition ${PACK.edition}`)}
      <h1 class="display">Idea to episode.</h1>
      <p class="lede">${esc(PACK.subtitle)}</p>
      <ul class="facts"><li><b>12</b> parts</li><li><b>24</b> shot prompts</li><li><b>25</b> hooks</li><li><b>4</b> week plan</li></ul>
    </div>
    <div class="hero-form" id="top">${signupForm(L, { kind: 'pack', id: 'top', where: 'pack-hero' })}</div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${kicker('What’s inside', '01')}
    <h2 class="h2">Twelve parts, in the order you’ll need them.</h2>
    ${insideList(L)}
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${kicker('A taste', '02')}
    <h2 class="h2">Prompt ${taste.id}.</h2>
    <ol class="prompts prompts-solo"><li class="prompt"><span class="prompt-id">${taste.id}</span><p class="prompt-text" data-copy-src>${esc(taste.text)}</p>${copyBtn()}</li></ol>
    <p class="note">Shot size, subject, action, light, lens, move, mood. In that order, every time. Twenty-three more, sorted by kind of shot, are in part 04.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap split">
    <div>${kicker('Who it’s for', '03')}<h2 class="h2">If any of these is you.</h2></div>
    <ol class="trio">
      <li><b>You make Reels</b> and want them to look like film.</li>
      <li><b>You’ve tried AI video</b> and watched the face change every shot.</li>
      <li><b>You have more ideas than credits</b> and would like to keep both.</li>
    </ol>
  </div>
</section>

<section class="sec">
  <div class="wrap split">
    <div>${kicker('Questions', '04')}<h2 class="h2">Before you ask.</h2></div>
    ${faq([
      ['Is it really free?', 'Yes. You give an email and the pack opens on the next screen, as web pages and a PDF.'],
      ['Which AI tools does it work with?', 'Any. The prompts describe shots in film language, which image and video generators share. Part 12 maps tools to the jobs they do.'],
      ['Do I need experience?', 'No. It starts at the idea and assumes nothing after it.'],
      ['What happens to my email?', `It goes on the Quiet Bands Studio list: new packs and workshop dates. It isn’t sold or shared. To come off it, email <a href="mailto:${SITE.email}">${SITE.email}</a>.`],
    ])}
  </div>
</section>

<section class="sec sec-get" id="get">
  <div class="wrap get">
    <div>${kicker('Get it', '05')}<h2 class="h2">Send it to me.</h2><p class="big">Free. Opens straight away.</p></div>
    <div class="get-form">${signupForm(L, { kind: 'pack', id: 'bottom', where: 'pack-bottom' })}</div>
  </div>
</section>`;
  },
};

const inside = {
  out: 'pack/inside/', section: 'pack/', title: 'AI Content Pack 001, inside', noindex: true, hideBarCta: true, bodyClass: 'page-inside',
  description: 'The full AI Content Pack 001 from Quiet Bands Studio: twelve parts from idea to posted episode.',
  canonical: SITE.origin + SITE.base + 'pack/', og: 'og-pack.png',
  dock: { href: 'workshop/', label: workshopWhen().known ? 'Save a seat' : 'Get the date', text: 'Free Mini-Drama Workshop', track: 'workshop' },
  body(L) {
    return `
<section class="hero hero-inside">
  <div class="wrap">
    <p class="cover-lock print-only">${markSvg()}${wordSvg()}<span class="lock-studio">Studio</span></p>
    ${kicker(`${PACK.name} · Edition ${PACK.edition}`)}
    <h1 class="display">Idea to episode.</h1>
    <p class="lede">${esc(PACK.subtitle)}</p>
    <p class="cta-row print-hide"><a class="btn" href="${L(packPdf())}" download data-track="studio_pdf_download" data-track-props='{"where":"inside"}'>Download the PDF</a></p>
    <nav class="toc" aria-label="Parts"><ol>${PARTS.map((p) => `<li><a href="#${p.id}"><span>${p.n}</span>${esc(p.title)}</a></li>`).join('')}</ol></nav>
  </div>
</section>

<div class="parts wrap" data-parts>
  ${renderPart(PARTS[0])}
</div>

<section class="gate print-hide" data-gate hidden>
  <div class="wrap get">
    <div>${kicker('Free')}<h2 class="h2">The other eleven open with an email.</h2><p class="big">Part 01 is open to everyone. Send the form and all twelve open, here and as a PDF.</p></div>
    <div class="get-form">${signupForm(L, { kind: 'pack', id: 'gate', where: 'inside-gate' })}</div>
  </div>
</section>

<div class="parts wrap" data-gated>
  ${PARTS.slice(1).map((p) => renderPart(p)).join('\n')}
  <p class="colophon print-only">Quiet Bands Studio · quietbands.com/studio · ${esc(PACK.name)}, edition ${PACK.edition}. Use it for your own work as much as you like. Please don’t resell it.</p>
</div>

<section class="sec print-hide" data-gated>
  <div class="wrap">
    ${kicker('Next')}
    <h2 class="h2">Make one with people.</h2>
    ${offers(L, 'inside-end', { skipPack: true })}
  </div>
</section>`;
  },
};

const workshop = {
  out: 'workshop/', section: 'workshop/', title: 'Free AI Mini-Drama Workshop', hideBarCta: false, bodyClass: 'page-workshop',
  description: 'Free and live. Take one sentence to a cut, captioned AI mini-drama in one sitting, using the process from the AI Content Pack.',
  og: 'og-workshop.png', ogAlt: 'The AI Mini-Drama Workshop. Free and live, from Quiet Bands Studio.',
  get dock() { const w = workshopWhen(); return { href: '#seat', label: w.known ? 'Save a seat' : 'Get the date', text: `Free · ${w.line}`, track: 'workshop' }; },
  body(L) {
    const w = workshopWhen();
    const steps = [
      ['Kill it', 'Your idea goes through the five questions. If it fails, we fix it or swap it before anyone spends a credit.'],
      ['Beat it', 'Five timed beats on paper. The scene exists before a single frame does.'],
      ['Lock it', 'An identity block and a reference sheet for your lead character.'],
      ['Shoot it', 'A shot list with one prompt per shot. Stills first, then motion.'],
      ['Cut it', 'Trim to the moment, J and L cuts, four layers of sound, captions.'],
      ['Post it', 'A hook in the first frame, one line of context, and the breakdown you’ll post two days later.'],
    ];
    return `
<section class="hero hero-split">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      ${kicker(`Free · ${SITE.workshop.where}`)}
      <h1 class="display">The AI Mini-Drama Workshop.</h1>
      <p class="lede">One sentence in, one finished scene out. In one sitting we take an idea to a cut, captioned mini-drama, with the process from the pack and other people making theirs alongside you.</p>
      <p class="when"><span class="when-k">Next session</span><span class="when-v">${esc(w.line)}</span></p>
    </div>
    <div class="hero-form" id="top">${signupForm(L, { kind: 'workshop', id: 'top', where: 'workshop-hero' })}</div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${kicker('Run of show', '01')}
    <h2 class="h2">Six steps, one scene.</h2>
    <ol class="run">${steps.map(([t, d], i) => `<li><span class="run-n">${String(i + 1).padStart(2, '0')}</span><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol>
  </div>
</section>

<section class="sec">
  <div class="wrap split">
    <div>${kicker('Bring', '02')}<h2 class="h2">Three things.</h2></div>
    <ol class="trio">
      <li><b>A phone or a laptop.</b> Either works for following along.</li>
      <li><b>One idea.</b> One sentence is enough. It doesn’t have to be good yet; that’s step one.</li>
      <li><b>One image tool and one video tool.</b> Any you already use. Part 12 of the <a href="${L('pack/')}">free pack</a> lists some to test.</li>
    </ol>
  </div>
</section>

<section class="sec">
  <div class="wrap split">
    <div>${kicker('Questions', '03')}<h2 class="h2">Before you ask.</h2></div>
    ${faq([
      ['Is it really free?', 'Yes.'],
      ['Do I need to have made anything before?', 'No. Step one starts at the idea.'],
      ['What if I can’t make the date?', 'Get on the list anyway. Every date goes to the list before it’s posted anywhere.'],
      ['Will I finish a scene?', 'The run of show is built for it. How far you get depends on your idea and your tools; you leave with the whole process either way.'],
    ])}
  </div>
</section>

<section class="sec sec-get" id="seat">
  <div class="wrap get">
    <div>${kicker(w.known ? 'Save a seat' : 'Get the date', '04')}<h2 class="h2">${w.known ? 'Save my seat.' : 'Tell me when.'}</h2><p class="big">${esc(w.line)}.</p></div>
    <div class="get-form">${signupForm(L, { kind: 'workshop', id: 'bottom', where: 'workshop-bottom' })}</div>
  </div>
</section>`;
  },
};

const learn = {
  out: 'learn/', section: 'learn/', title: 'Free guides to AI filmmaking',
  description: 'Free guides from Quiet Bands Studio: how to write a 60-second drama, how to keep an AI character’s face the same, and the camera moves AI video understands.',
  dock: { href: 'pack/', label: 'Get the free pack', text: 'All twelve parts, free', track: 'pack' },
  body(L) {
    return `
<section class="hero hero-plain">
  <div class="wrap">
    ${kicker('Free guides')}
    <h1 class="display">Read before you generate.</h1>
    <p class="lede">Three parts of the AI Content Pack, open to everyone. The pack has the other nine, including 24 shot prompts and a four-week posting plan.</p>
  </div>
</section>
<section class="sec sec-tight">
  <div class="wrap">
    ${guideList(L)}
  </div>
</section>
<section class="sec sec-get" id="get">
  <div class="wrap get">
    <div>${kicker('The whole thing')}<h2 class="h2">Get all twelve.</h2><p class="big">Free, on the web and as a PDF.</p></div>
    <div class="get-form">${signupForm(L, { kind: 'pack', id: 'learn', where: 'learn-index' })}</div>
  </div>
</section>`;
  },
};

const guidePages = GUIDES.map((g, gi) => {
  const parts = g.parts.map((id) => PARTS.find((p) => p.id === id));
  const next = GUIDES[(gi + 1) % GUIDES.length];
  return {
    out: `learn/${g.slug}/`, section: 'learn/', title: g.title, description: g.lede,
    dock: { href: 'pack/', label: 'Get the free pack', text: `Part ${parts[0].n} of 12`, track: 'pack' },
    jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.lede, author: { '@type': 'Person', name: SITE.host }, publisher: { '@type': 'Organization', name: 'Quiet Bands' }, isPartOf: { '@type': 'CreativeWork', name: `${PACK.name} ${PACK.edition}` } },
    body(L) {
      return `
<section class="hero hero-plain">
  <div class="wrap">
    ${kicker(`Free guide · ${minutes(parts)} min read · from ${PACK.name} ${PACK.edition}`)}
    <h1 class="display display-md">${esc(g.title)}</h1>
    <p class="lede">${esc(g.lede)}</p>
  </div>
</section>
<div class="parts wrap">
  ${parts.map((p) => renderPart(p)).join('\n')}
</div>
<section class="sec sec-get" id="get">
  <div class="wrap get">
    <div>${kicker(`This is part${parts.length > 1 ? 's' : ''} ${parts.map((p) => p.n).join(' and ')} of 12`)}<h2 class="h2">Get the other ${12 - parts.length}.</h2><p class="big">The shot prompt library, the edit recipe, 25 hooks and the posting plan are in the free pack.</p></div>
    <div class="get-form">${signupForm(L, { kind: 'pack', id: 'guide', where: `guide-${g.slug}` })}</div>
  </div>
</section>
<section class="sec sec-tight">
  <div class="wrap"><p class="go"><a class="arrow" href="${L(`learn/${next.slug}/`)}">Next guide: ${esc(next.short)}</a></p></div>
</section>`;
    },
  };
});

const commission = {
  out: 'commission/', section: 'commission/', title: 'Commission the Studio',
  description: 'Send Quiet Bands Studio a brief for a cinematic AI piece: a launch, an ad, a title sequence, a scene for a song.',
  body(L) {
    return `
<section class="hero hero-split">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      ${kicker('By brief')}
      <h1 class="display">Commission the Studio.</h1>
      <p class="lede">For when you need a cinematic piece made rather than taught. Tell us what it is, where it will run and when you need it.</p>
      <ol class="run run-compact">
        <li><span class="run-n">01</span><b>The brief</b><span>You send it here.</span></li>
        <li><span class="run-n">02</span><b>The reply</b><span>Flighty reads it and replies with questions if it’s a fit.</span></li>
        <li><span class="run-n">03</span><b>The quote</b><span>Priced on what that piece needs. There is no rate card.</span></li>
        <li><span class="run-n">04</span><b>The paper</b><span>The scene is written and approved before anything is generated.</span></li>
      </ol>
    </div>
    <div class="hero-form" id="top">${signupForm(L, { kind: 'commission', id: 'brief', where: 'commission' })}</div>
  </div>
</section>`;
  },
};

const links = {
  out: 'links/', section: '', title: 'Flighty · links', noindex: true, bodyClass: 'page-links', hideBarCta: true,
  description: 'Everything from Flighty and Quiet Bands Studio in one place: the free AI Content Pack, the free Mini-Drama Workshop, guides and commissions.',
  body(L) {
    const w = workshopWhen();
    const item = (href, title, sub, { live, track, ext } = {}) => `<li><a class="link${live ? ' link-live' : ''}" href="${esc(href)}"${ext ? ' rel="noopener"' : ''} data-track="studio_cta" data-track-props='{"cta":"${track}","where":"links"}'><span class="link-t">${esc(title)}</span><span class="link-s">${esc(sub)}</span></a></li>`;
    return `
<section class="hero hero-links">
  <div class="wrap wrap-narrow">
    ${kicker('Flighty · AI filmmaking + creator education')}
    <h1 class="display display-md">Turn ideas into cinematic content.</h1>
    <ul class="links">
      ${item(L('pack/'), 'Free AI Content Pack', '12 parts: prompts, process, posting plan', { live: true, track: 'pack' })}
      ${item(L('workshop/'), 'Free Mini-Drama Workshop', w.line, { track: 'workshop' })}
      ${item(L('learn/'), 'Free guides', 'Beat sheet, character lock, camera moves', { track: 'learn' })}
      ${item(L('commission/'), 'Commission a piece', 'Send a brief', { track: 'commission' })}
      ${item(SITE.instagram.url, 'THE BLOCK', `Built in public on Instagram, ${SITE.instagram.handle}`, { track: 'instagram', ext: true })}
      ${item(SITE.parent.href, 'Building software instead?', 'Quiet Bands, Houston', { track: 'parent' })}
    </ul>
  </div>
</section>`;
  },
};

const campaigns = CAMPAIGNS.map((c) => ({
  out: `go/${c.slug}/`, section: 'pack/', title: c.title, noindex: true, hideBarCta: true, bodyClass: 'page-campaign',
  canonical: SITE.origin + SITE.base + 'pack/', og: 'og-pack.png', description: c.lede,
  dock: { href: '#top', label: 'Get the pack', text: 'Free · PDF + web', track: `campaign-${c.slug}` },
  body(L) {
    return `
<section class="hero hero-split">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      ${kicker(c.kicker)}
      <h1 class="display">${esc(c.title)}</h1>
      <p class="lede">${esc(c.lede)}</p>
      ${insideList(L, { compact: true })}
    </div>
    <div class="hero-form" id="top">${signupForm(L, { kind: 'pack', id: 'top', campaign: c.slug, where: `go-${c.slug}` })}</div>
  </div>
</section>`;
  },
}));

const notFound = {
  out: '404.html', abs: true, section: '', title: 'Not found', noindex: true,
  description: 'That page isn’t in the Studio.',
  body(L) {
    return `
<section class="hero hero-plain hero-404">
  <div class="wrap">
    ${kicker('Cut')}
    <h1 class="display">That scene didn’t make the edit.</h1>
    <p class="lede">The page you wanted isn’t in the Studio. It may have moved.</p>
    <p class="cta-row">${button(L('pack/'), 'Get the free pack', { live: true, track: 'pack', where: '404' })}${button(L(''), 'Studio home', { track: 'home', where: '404' })}</p>
  </div>
</section>`;
  },
};

export const PAGES = [home, pack, inside, workshop, learn, ...guidePages, commission, links, ...campaigns, notFound];
export { linker };
