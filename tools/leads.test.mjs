// The lead forms on Netlify Forms, and the submission-created scorer that reads them. No network: the scorer is
// only run down the paths that return before calling Claude.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { formBody } from '../assets/qb.js';
import scorer, { leadFrom, failureReason } from '../netlify/functions/submission-created.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/** The field names a built form declares, by form name. */
function declared(html, name) {
  const m = html.match(new RegExp(`<form [^>]*name="${name}"[^>]*>([\\s\\S]*?)</form>`));
  assert.ok(m, `form ${name} is in the page`);
  return new Set([...m[1].matchAll(/\sname="([^"]+)"/g)].map((x) => x[1]));
}

test('formBody: named, url-encoded, objects as JSON, empties left out', () => {
  const p = new URLSearchParams(formBody('work-intake', { email: 'a@b.co', who: '', tried: null, attribution: { utm_source: 'ig' }, today: 'A & B' }));
  assert.equal(p.get('form-name'), 'work-intake');
  assert.equal(p.get('today'), 'A & B');
  assert.equal(p.has('who'), false);
  assert.equal(p.has('tried'), false);
  assert.deepEqual(JSON.parse(p.get('attribution')), { utm_source: 'ig' });
});

test('/work declares every field intake.js sends, so Netlify keeps them', () => {
  const html = read('work/index.html');
  assert.match(html, /<form [^>]*name="work-intake" data-netlify="true" netlify-honeypot="website"/);
  const fields = declared(html, 'work-intake');
  const call = read('assets/intake.js').match(/formPost\('work-intake', \{([\s\S]*?)\n {2}\}\);/)[1];
  const sent = [...call.matchAll(/(\w+):/g)].map((m) => m[1]).filter((k) => !['state', 'answers', 'completed_at'].includes(k));
  assert.ok(sent.length >= 15);
  for (const k of sent) assert.ok(fields.has(k), `work-intake sends "${k}" but doesn't declare it`);
});

test('the note pages post the note-lead form and no longer load Supabase', () => {
  for (const slug of ['the-coffee-credit', 'the-promise-gap']) {
    const html = read(`notes/${slug}/index.html`);
    const fields = declared(html, 'note-lead');
    for (const k of ['contact_name', 'company_name', 'email', 'pain_point', 'current_tech', 'source']) assert.ok(fields.has(k), `${slug}: ${k}`);
    assert.match(html, new RegExp(`name="source" value="note-${slug}"`));
    assert.doesNotMatch(html, /supabase/i);
  }
});

test('lead-scores declares every field the scorer posts', () => {
  const fields = declared(read('work/index.html'), 'lead-scores');
  const src = read('netlify/functions/submission-created.js');
  const call = src.match(/await saveScore\(\{([\s\S]*?)\}\);/)[1];
  for (const [, k] of call.matchAll(/(\w+):/g)) assert.ok(fields.has(k), `lead-scores is missing "${k}"`);
  assert.doesNotMatch(src, /supabase/i);
});

test('the work intake becomes the same verbatim pain_point the prompt always had', () => {
  const lead = leadFrom('work-intake', { today: 'We rekey by hand', who: 'Front desk', systems: 'Opera', how_often: 'Daily', contact_name: 'A', company_name: 'B', email: 'a@b.co', source: 'pressure-test' });
  assert.equal(lead.pain_point, 'WHAT IS HAPPENING TODAY: We rekey by hand\nWHO DOES THIS WORK: Front desk\nHOW OFTEN: Daily\nSYSTEMS INVOLVED: Opera');
  assert.equal(lead.current_tech, 'Opera');
  assert.equal(lead.timeline, 'Daily');
  assert.equal(lead.source, 'pressure-test');
  assert.equal(leadFrom('note-lead', { email: 'a@b.co', pain_point: 'x', source: 'note-the-promise-gap' }).source, 'note-the-promise-gap');
});

test('the scorer ignores the Studio forms and its own lead-scores posts', async () => {
  const run = async (form_name, data = { email: 'a@b.co' }) => (await scorer(new Request('http://x/', { method: 'POST', body: JSON.stringify({ payload: { form_name, data } }) }))).text();
  for (const f of ['studio-pack', 'studio-commission', 'lead-scores']) assert.equal(await run(f), 'not a lead form');
  assert.equal(await run('note-lead', {}), 'no email');
});

test('a failed score is still recorded, as UNSCORED with a readable reason', async () => {
  const posts = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => { posts.push({ url: String(url), body: new URLSearchParams(init.body) }); return new Response('', { status: 200 }); };
  try {
    const res = await scorer(new Request('http://x/', { method: 'POST', body: JSON.stringify({ payload: { id: 's1', form_name: 'work-intake', data: { email: 'a@b.co', today: 'x', contact_name: 'A' } } }) }));
    assert.equal(await res.text(), 'UNSCORED');   // no ANTHROPIC_API_KEY under test
  } finally { globalThis.fetch = real; }
  assert.equal(posts.length, 1);
  const b = posts[0].body;
  assert.equal(b.get('form-name'), 'lead-scores');
  assert.equal(b.get('score'), 'UNSCORED');
  assert.match(b.get('reasoning'), /ANTHROPIC_API_KEY is not set/);
  assert.equal(b.get('next_step'), 'Review manually');
  assert.equal(b.get('lead_id'), 's1');
});

test('failure reasons name the fix without dumping the raw error', () => {
  assert.match(failureReason(new Error('Anthropic request failed: 401 {"type":"error","error":{"message":"invalid x-api-key"}}')), /key was rejected \(401\)\. Replace ANTHROPIC_API_KEY/);
  assert.match(failureReason(new Error('Anthropic request failed: 429 slow down')), /rate limit/);
  assert.match(failureReason(new Error('Anthropic request failed: 529 overloaded')), /unavailable \(529\)/);
  assert.match(failureReason(new TypeError('fetch failed')), /unexpected error/);
  assert.doesNotMatch(failureReason(new Error('Anthropic request failed: 401 {"secret":"x"}')), /secret/);
});

test('every public page loads Plausible, with the queue stub so early track() calls are kept', () => {
  const pages = ['404.html', 'index.html', 'commercial/index.html', 'notes/index.html', 'notes/the-coffee-credit/index.html', 'notes/the-promise-gap/index.html', 'rd/index.html', 'rd/pressure-test/index.html', 'resident-experience/index.html', 'small-business/index.html', 'work/index.html', 'work/frenchies/index.html', 'studio/index.html', 'studio/pack/index.html', 'studio/commission/index.html'];
  for (const p of pages) {
    const html = read(p);
    assert.match(html, /<script defer data-domain="quietbands\.com" src="https:\/\/plausible\.io\/js\/script\.js"><\/script>/, p);
    assert.match(html, /window\.plausible=window\.plausible\|\|function\(\)/, p);
  }
  const csp = read('netlify.toml').match(/Content-Security-Policy = "([^"]+)"/)[1];
  assert.match(csp, /script-src [^;]*https:\/\/plausible\.io/);
  assert.match(csp, /connect-src [^;]*https:\/\/plausible\.io/);
});

test('the home inquiry declares every field home.js sends, and the scorer reads it', () => {
  const html = read('index.html');
  assert.match(html, /<form [^>]*name="project-inquiry" method="POST" data-netlify="true" netlify-honeypot="website"/);
  const fields = declared(html, 'project-inquiry');
  const call = read('assets/home.js').match(/formPost\('project-inquiry', \{([\s\S]*?)\}\);/)[1];
  const sent = [...call.matchAll(/(\w+):/g)].map((m) => m[1]);
  assert.ok(sent.length >= 9);
  for (const k of sent) assert.ok(fields.has(k), `project-inquiry sends "${k}" but doesn't declare it`);
  const lead = leadFrom('project-inquiry', { contact_name: 'A', email: 'a@b.co', project_type: 'A working prototype', details: 'Book fittings online', timeline: 'Later this year', budget: '10k', source: 'home-inquiry' });
  assert.equal(lead.pain_point, 'PROJECT TYPE: A working prototype\nWHAT IT SHOULD DO: Book fittings online');
  assert.equal(lead.timeline, 'Later this year');
  assert.equal(lead.budget_range, '10k');
  assert.equal(lead.source, 'home-inquiry');
});

test('a home inquiry is scored like the other lead forms', async () => {
  const posts = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => { posts.push(new URLSearchParams(init.body)); return new Response('', { status: 200 }); };
  try {
    const res = await scorer(new Request('http://x/', { method: 'POST', body: JSON.stringify({ payload: { id: 'h1', form_name: 'project-inquiry', data: { email: 'a@b.co', details: 'x', contact_name: 'A' } } }) }));
    assert.equal(await res.text(), 'UNSCORED');
  } finally { globalThis.fetch = real; }
  assert.equal(posts.length, 1);
  assert.equal(posts[0].get('lead_form'), 'project-inquiry');
});

test('the home page starts at the Pressure Test: hero, what the test returns, proof, services, process, inquiry', () => {
  const html = read('index.html');
  const at = (s) => { const i = html.indexOf(s); assert.ok(i > 0, `home has "${s}"`); return i; };
  // the hero asks the question, says what Quiet Bands does, and its primary button is the test
  assert.match(html, /<h1 class="h1 reveal">Your business has a problem\. <span>Does it actually need an app\?<\/span><\/h1>/);
  const hero = html.slice(at('<section class="hero">'), at('id="pressure-test"'));
  assert.match(hero, /<a class="btn btn-live" href="\/rd\/pressure-test\/"[^>]*>Take the free Pressure Test<\/a>\s*<a class="btn" href="#work"[^>]*>Explore our work<\/a>/);
  assert.match(hero, /Custom software and automation/);
  for (const result of ['Research more', 'Talk to humans', 'Test manually', 'Explore a build', 'Park it']) assert.ok(hero.includes(result), result);
  // then the journey, in order
  assert.ok(at('id="pressure-test"') < at('try to kill it'));
  assert.ok(at('try to kill it') < at('id="work"'));
  assert.ok(at('id="work"') < at('id="hire"'));
  assert.ok(at('id="hire"') < at('id="process"'));
  assert.ok(at('id="process"') < at('id="inquire"'));
  assert.ok(at('id="inquire"') < at('href="/studio/" style'));
  // the test is reachable from the bar, the phone menu, every relevant section and the phone dock
  const where = [...html.matchAll(/href="\/rd\/pressure-test\/" data-track="home_cta" data-track-props='\{"cta":"pressure-test","where":"([\w-]+)"\}'/g)].map((m) => m[1]);
  for (const w of ['bar', 'menu', 'hero', 'hero-results', 'start', 'hire', 'process', 'inquire', 'dock']) assert.ok(where.includes(w), `Pressure Test link in "${w}"`);
  const menu = html.slice(at('id="menu"'), at('</header>'));
  assert.ok(menu.indexOf('/rd/pressure-test/') < menu.indexOf('#work'), 'the phone menu opens with the Pressure Test');
  assert.match(menu, /href="#inquire"[^>]*>Discuss a project</);
  // the Field Guide stays available, as the secondary resource
  assert.ok((html.match(/href="\/downloads\/flighty-rd-field-guide\.pdf"/g) || []).length >= 3);
  assert.ok(existsSync(new URL('../downloads/flighty-rd-field-guide.pdf', import.meta.url)));
  for (const s of ['THE BLOCK', 'KILL TRILL', 'Spirited']) assert.ok(html.includes(s));
  assert.doesNotMatch(html, /in production/i);   // Frenchies' current status is not claimed
  for (const img of html.matchAll(/src="(\/assets\/work\/[^"]+|\/studio\/media\/[^"]+)"/g)) assert.ok(existsSync(new URL(`..${img[1]}`, import.meta.url)), img[1]);
});

test('every link on the home page and in a Pressure Test result leads to a page, file or anchor that exists', async () => {
  const { STATES, AFTER } = await import('../assets/triage.js');
  const target = (href) => {
    const [path, hash] = href.split('?')[0].split('#');
    const file = path.endsWith('/') ? `${path}index.html` : path;
    assert.ok(existsSync(new URL(`..${file}`, import.meta.url)), `${href} points at a missing file`);
    if (hash) assert.match(read(file.slice(1)), new RegExp(`id=["']${hash}["']`), `${href} points at a missing anchor`);
  };
  const home = read('index.html');
  for (const [, href] of home.matchAll(/<a [^>]*href="([^"]+)"/g)) {
    if (href.startsWith('mailto:')) continue;
    if (href.startsWith('#')) assert.match(home, new RegExp(`id="${href.slice(1)}"`), `home links to missing ${href}`);
    else target(href);
  }
  for (const [state, m] of Object.entries(STATES)) {
    for (const c of [m.cta, m.secondary]) if (c.href) target(c.href);
    assert.ok(AFTER[state], `"${state}" says what the visitor can do next`);
  }
  // every result can be sent on, and only "explore a build" reaches the scorer as a build-ready lead
  const pt = read('assets/pressure-test.js');
  assert.match(pt, /preserveUtm\('\/work\/\?from=pressure-test'\)/);
  assert.match(read('assets/intake.js'), /ptState === 'build' \? 'pressure-test' : `pressure-test-\$\{ptState\}`/);
  assert.match(read('netlify/functions/submission-created.js'), /"pressure-test-research", "pressure-test-humans", "pressure-test-manual" or "pressure-test-park"/);
});
