import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { sameKey, MIN_KEY_LENGTH } from '../netlify/functions/leads.js';
import { statusOf, splitReasoning, parseAnswers, replyHref, telHref, ago, counts, filterLeads, scorePayload, explainScoreResult, PENDING_MS } from '../assets/leads-core.js';

const KEY = 'k'.repeat(MIN_KEY_LENGTH) + '-view';
const req = (headers = {}, method = 'GET') => new Request('https://x.test/.netlify/functions/leads', { method, headers });
async function withEnv(env, fn) {
  const saved = { ...process.env }; const savedFetch = globalThis.fetch;
  Object.assign(process.env, env);
  try { return await fn(); } finally { for (const k of Object.keys(env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); globalThis.fetch = savedFetch; }
}
const ENV = { SUPABASE_URL: 'https://db.test/', SUPABASE_SERVICE_ROLE_KEY: 'service', LEADS_VIEW_KEY: KEY };

test('leads function fails closed until a long view key is set', async () => {
  await withEnv({ ...ENV, LEADS_VIEW_KEY: '' }, async () => { const r = await handler(req({ 'x-leads-key': '' })); assert.equal(r.status, 503); });
  await withEnv({ ...ENV, LEADS_VIEW_KEY: 'short' }, async () => { const r = await handler(req({ 'x-leads-key': 'short' })); assert.equal(r.status, 503, 'a short key is refused even when it matches'); });
});

test('leads function refuses wrong keys and other methods, and never touches the database for them', async () => {
  await withEnv(ENV, async () => {
    let called = 0; globalThis.fetch = async () => { called++; return new Response('[]'); };
    assert.equal((await handler(req({ 'x-leads-key': KEY + 'x' }))).status, 401);
    assert.equal((await handler(req({}))).status, 401);
    assert.equal((await handler(req({ 'x-leads-key': KEY }, 'POST'))).status, 405);
    assert.equal(called, 0);
  });
});

test('with the right key it reads with the service role, newest first, uncached', async () => {
  await withEnv(ENV, async () => {
    let seen; globalThis.fetch = async (url, init) => { seen = { url: String(url), init }; return new Response(JSON.stringify([{ id: 1 }]), { status: 200 }); };
    const r = await handler(req({ 'x-leads-key': KEY }));
    assert.equal(r.status, 200); assert.deepEqual((await r.json()).leads, [{ id: 1 }]);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.ok(seen.url.startsWith('https://db.test/rest/v1/leads?'), seen.url);
    assert.ok(seen.url.includes('order=created_at.desc'));
    assert.equal(seen.init.headers.Authorization, 'Bearer service');
  });
});

test('upstream failures are reported, not leaked', async () => {
  await withEnv(ENV, async () => {
    globalThis.fetch = async () => new Response('secret detail', { status: 500 });
    const orig = console.error; console.error = () => {};
    try { const r = await handler(req({ 'x-leads-key': KEY })); assert.equal(r.status, 502); assert.ok(!(await r.text()).includes('secret')); } finally { console.error = orig; }
  });
});

test('sameKey compares any lengths safely', () => {
  assert.equal(sameKey('abc', 'abc'), true); assert.equal(sameKey('abc', 'abcd'), false);
  assert.equal(sameKey('', ''), false); assert.equal(sameKey(undefined, 'x'), false);
});

const NOW = Date.parse('2026-10-09T15:00:00Z');
const at = (msAgo) => new Date(NOW - msAgo).toISOString();

test('a fresh unscored lead is being scored; an old one is stuck; a scored one is scored', () => {
  assert.equal(statusOf({ created_at: at(30_000) }, NOW), 'pending');
  assert.equal(statusOf({ created_at: at(PENDING_MS + 1) }, NOW), 'unscored');
  assert.equal(statusOf({ created_at: at(1000), triage_score: 'hot' }, NOW), 'scored');
  assert.equal(statusOf({ created_at: 'nonsense' }, NOW), 'unscored');
});

test('counts and filters agree, and stuck leads are their own bucket', () => {
  const ls = [{ triage_score: 'HOT' }, { triage_score: 'WARM' }, { triage_score: 'COLD' }, { created_at: at(10_000) }, { created_at: at(PENDING_MS * 2) }];
  const c = counts(ls, NOW);
  assert.deepEqual(c, { all: 5, HOT: 1, WARM: 1, COLD: 1, unscored: 1, pending: 1 }, 'a lead the scorer has is not stuck');
  for (const f of ['HOT', 'WARM', 'COLD', 'unscored']) assert.equal(filterLeads(ls, f, NOW).length, c[f], f);
  assert.equal(filterLeads(ls, 'all', NOW).length, 5); assert.equal(filterLeads(ls, 'bogus', NOW).length, 5);
});

test('reasoning splits into why and next, from either scorer', () => {
  assert.deepEqual(splitReasoning('Recurring re-keying, named systems. | Next: Call today'), { reason: 'Recurring re-keying, named systems.', next: 'Call today' });
  assert.deepEqual(splitReasoning('Just a reason'), { reason: 'Just a reason', next: '' });
  assert.deepEqual(splitReasoning(''), { reason: '', next: '' });
  assert.deepEqual(splitReasoning('{"v":2,"fit":true}'), { reason: 'Scored by another tool.', next: '' });
  assert.deepEqual(splitReasoning('{"reasoning":"Fit","next_step":"Email"}'), { reason: 'Fit', next: 'Email' });
  assert.equal(splitReasoning('{not json').reason, '{not json');
});

test('intake answers come back labelled, multi-line answers kept whole', () => {
  const pp = 'WHAT IS HAPPENING TODAY: We re-key orders.\nEvery Monday.\nWHO DOES THIS WORK: Dana\nSYSTEMS INVOLVED: Gmail / Sheets';
  assert.deepEqual(parseAnswers(pp), [
    { label: 'What is happening today', text: 'We re-key orders.\nEvery Monday.' },
    { label: 'Who does this work', text: 'Dana' },
    { label: 'Systems involved', text: 'Gmail / Sheets' },
  ]);
  assert.deepEqual(parseAnswers('free text from an older form'), [{ label: '', text: 'free text from an older form' }]);
  assert.deepEqual(parseAnswers(null), []);
});

test('reply and call links are addressed, started, and safe', () => {
  const href = replyHref({ email: 'dana@ops.co', contact_name: 'Dana Ruiz', company_name: 'Ops & Co' });
  assert.ok(href.startsWith('mailto:dana@ops.co?subject='));
  assert.ok(decodeURIComponent(href).includes('Quiet Bands, about Ops & Co'));
  assert.ok(decodeURIComponent(href).includes('Hi Dana,'));
  assert.ok(!replyHref({ email: 'a@b.c?bcc=x@y.z' }).includes('?bcc'), 'an email cannot inject headers');
  assert.equal(telHref('(832) 555-0100'), 'tel:8325550100'); assert.equal(telHref('n/a'), '');
});

test('time reads like a person would say it', () => {
  assert.equal(ago(at(20_000), NOW), 'just now'); assert.equal(ago(at(5 * 60_000), NOW), '5 min ago');
  assert.equal(ago(at(3 * 3600_000), NOW), '3 h ago'); assert.equal(ago(at(2 * 86400_000), NOW), '2 d ago'); assert.equal(ago('x', NOW), '');
});

test('Score now sends what the scorer needs and explains every answer it can get', () => {
  const p = scorePayload({ id: 9, email: 'a@b.c', pain_point: 'x', intake: { big: 1 }, company_name: 'C' });
  assert.equal(p.email, 'a@b.c'); assert.equal(p.id, undefined); assert.equal(p.intake, undefined); assert.equal(p.phone, null);
  assert.deepEqual(explainScoreResult(200, { success: true, score: 'HOT' }), { ok: true, text: 'Scored HOT.' });
  assert.match(explainScoreResult(200, { ok: false, reason: 'config' }).text, /ANTHROPIC_API_KEY/);
  assert.match(explainScoreResult(404, { error: 'lead not found' }).text, /no unscored lead/);
  assert.match(explainScoreResult(500, { error: 'Anthropic request failed: 401 invalid x-api-key' }).text, /401 invalid x-api-key/);
  assert.match(explainScoreResult(502, null).text, /status 502/);
});
