// Quiet Bands Studio: the signup rules against the table they write to, and the built section against its launch scope.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { buildSignup, outcome, readState, writeState, validEmail, KINDS, TABLE } from '../studio/assets/studio-core.js';
import { renderAll } from './studio/build.mjs';
import { parseRedirects, matchRule } from './studio/serve.mjs';
import { SITE, NAV } from './studio/site.mjs';
import { packPdf } from './studio/lib.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const SQL = read('db/studio_signups.sql');
const pages = renderAll();

/* ---------- the form rows and the table ---------- */

test('a pack signup builds a row with only the columns the table has', () => {
  const r = buildSignup('pack', { email: ' a@b.co ', first_name: 'Ana', makes: 'Just starting' }, { where: 'pack-hero', attribution: { utm_source: 'ig' }, path: '/studio/pack/' });
  assert.equal(r.ok, true);
  assert.equal(r.row.email, 'a@b.co');
  assert.equal(r.row.workshop_optin, false);
  const table = SQL.match(/create table if not exists public\.studio_signups \(([\s\S]*?)\n\);/)[1];
  const cols = [...table.matchAll(/^\s+([a-z_]+)\s+/gm)].map((m) => m[1]);
  for (const k of Object.keys(r.row)) assert.ok(cols.includes(k), `column ${k} is in the table`);
});

test('invalid inputs say what is wrong and point at the field', () => {
  assert.deepEqual(buildSignup('pack', { email: '' }), { ok: false, error: 'Add your email and it’s on its way.', field: 'email' });
  assert.equal(buildSignup('pack', { email: 'not-an-email' }).field, 'email');
  assert.equal(buildSignup('pack', { email: 'a@b' }).field, 'email');
  assert.equal(buildSignup('commission', { email: 'a@b.co', what: 'x' }).field, 'first_name');
  assert.equal(buildSignup('commission', { email: 'a@b.co', first_name: 'A' }).field, 'what');
  assert.equal(buildSignup('nope', { email: 'a@b.co' }).ok, false);
});

test('the honeypot is caught before anything is sent', () => {
  assert.equal(buildSignup('pack', { email: 'a@b.co', website: 'spam.biz' }).error, 'bot');
});

test('long fields are clipped to the table limits', () => {
  const r = buildSignup('commission', { email: 'a@b.co', first_name: 'n'.repeat(500), what: 'w'.repeat(5000), org: 'o'.repeat(500) }, { campaign: 'c'.repeat(100) });
  assert.equal(r.row.first_name.length, 80);
  assert.equal(r.row.brief.what.length, 2000);
  assert.equal(r.row.brief.org.length, 120);
  assert.equal(r.row.campaign.length, 64);
});

test('the browser email check matches the table constraint', () => {
  assert.match(SQL, /email ~\* '\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$'/);
  assert.ok(validEmail('x@y.io'));
  assert.ok(!validEmail('x@y'));
  assert.ok(!validEmail('a'.repeat(250) + '@y.io'));
});

test('insert results: created, duplicate (already on the list) and failures', () => {
  assert.equal(outcome(201), 'ok');
  assert.equal(outcome(409), 'repeat');      // the unique (kind, lower(email)) index
  for (const s of [0, 400, 401, 403, 404, 500]) assert.equal(outcome(s), 'error');
});

test('remembered signups survive storage that throws', () => {
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(readState(bad), {});
  assert.equal(writeState(bad, 'pack').pack, true);
});

test('the table lets anon insert and nothing else, and duplicates are refused', () => {
  assert.equal(TABLE, 'studio_signups');
  assert.deepEqual(KINDS, ['pack', 'workshop', 'commission']);   // the workshop kind stays for when it launches
  assert.match(SQL, /alter table public\.studio_signups enable row level security;/);
  const policies = [...SQL.matchAll(/create policy [\s\S]*?;/g)].map((m) => m[0]);
  assert.equal(policies.length, 1);
  assert.match(policies[0], /for insert to anon/);
  assert.doesNotMatch(SQL, /for (select|update|delete|all)/);
  assert.match(SQL, /create unique index[\s\S]*?\(kind, lower\(email\)\) where kind in \('pack', 'workshop'\)/);
  assert.match(SQL, /security_invoker = true/);
});

/* ---------- launch scope: the workshop is off ---------- */

test('the workshop is not public: no page, no nav item, no mention', () => {
  assert.equal(SITE.workshop.public, false);
  assert.ok(!NAV.some((n) => n.path === 'workshop/'));
  assert.ok(!pages.some((p) => p.out.startsWith('workshop')));
  for (const { out, html } of pages) assert.doesNotMatch(html, /workshop/i, `studio/${out || 'index.html'} mentions the workshop`);
  assert.ok(!existsSync(new URL('studio/workshop/index.html', ROOT)), 'a stale built workshop page would shadow the redirect');
  assert.doesNotMatch(read('sitemap.xml'), /workshop/);
});

test('/studio/workshop/ goes to the guides, temporarily, ahead of the Studio 404', () => {
  const rules = parseRedirects(read('_redirects'));
  for (const path of ['/studio/workshop', '/studio/workshop/', '/studio/workshop/anything']) {
    const r = matchRule(rules, path);
    assert.equal(r.status, 302, path);
    assert.equal(r.to, '/studio/learn/');
  }
  assert.equal(matchRule(rules, '/studio/nope/').to, '/studio/404.html');
});

/* ---------- the built section ---------- */

test('the committed pages match what the source renders', () => {
  for (const { file, html, out } of pages) assert.equal(readFileSync(file, 'utf8'), html, `studio/${out} is stale`);
});

test('every Studio link and asset resolves to a real file', () => {
  for (const { page, html } of pages) {
    const base = new URL(page.abs ? 'https://x/studio/' : `https://x/studio/${page.out}`);
    for (const [, href] of html.matchAll(/\s(?:href|src)="([^"#]+)[^"]*"/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const u = new URL(href, base);
      let p = decodeURIComponent(u.pathname).slice(1);
      if (p === '' || p.endsWith('/')) p += 'index.html';
      assert.ok(existsSync(new URL(p, ROOT)), `${page.out || 'home'} links to missing /${p}`);
    }
  }
});

test('the PDF and the share images the pages name are committed', () => {
  const pdf = new URL('studio/' + packPdf(), ROOT);
  assert.ok(existsSync(pdf) && readFileSync(pdf).subarray(0, 5).toString() === '%PDF-');
  const ogs = new Set(pages.flatMap(({ html }) => [...html.matchAll(/property="og:image" content="([^"]+)"/g)].map((m) => m[1])));
  for (const og of ogs) {
    assert.ok(og.startsWith(SITE.origin + SITE.base));
    const f = new URL('studio/' + og.slice((SITE.origin + SITE.base).length), ROOT);
    assert.ok(existsSync(f), `${og} is committed`);
    const png = readFileSync(f);
    assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
    assert.ok(statSync(f).size < 300_000, `${og} stays small enough for link previews`);
  }
});

test('the pack stays free', () => {
  for (const { html } of pages) assert.doesNotMatch(html, /\$\d|checkout|buy now|price:/i);
});
