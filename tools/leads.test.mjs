// The lead forms on Netlify Forms, and the submission-created scorer that reads them. No network: the scorer is
// only run down the paths that return before calling Claude.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formBody } from '../assets/qb.js';
import scorer, { leadFrom } from '../netlify/functions/submission-created.js';

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
