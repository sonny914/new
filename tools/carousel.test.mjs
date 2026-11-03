// Studio carousels: the copy rules the pack follows, checked on every carousel data file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { load, page, live, plain } from './studio/carousel.mjs';
import { SITE } from './studio/site.mjs';

const slugs = readdirSync(new URL('./studio/carousels/', import.meta.url)).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4));
const KINDS = ['cover', 'stat', 'story', 'cta'];
const words = (s) => Object.values(s).filter((v) => typeof v === 'string').concat(s.list || [], s.visual ? JSON.stringify(s.visual) : []);

test('there is at least one carousel', () => assert.ok(slugs.length > 0));

for (const slug of slugs) {
  test(`${slug}: shape`, async () => {
    const c = await load(slug);
    assert.equal(c.slug, slug, 'slug matches the file name');
    assert.ok(c.slides.length >= 2 && c.slides.length <= 20, 'Instagram takes 2 to 20 slides');
    assert.equal(c.slides[0].kind, 'cover', 'opens on the cover');
    assert.equal(c.slides.at(-1).kind, 'cta', 'ends on the ask');
    for (const s of c.slides) assert.ok(KINDS.includes(s.kind), `known kind: ${s.kind}`);
    assert.ok(c.caption && c.caption.length <= 2200, 'caption fits Instagram’s 2,200 characters');
  });

  test(`${slug}: copy rules (no em dashes, one live accent per slide, every claim sourced)`, async () => {
    const c = await load(slug);
    for (const [i, s] of c.slides.entries()) {
      for (const w of words(s)) assert.ok(!w.includes('—'), `slide ${i + 1} has no em dash: ${w}`);
      const accents = words(s).join(' ').match(/\*[^*]+\*/g) || [];
      assert.ok(accents.length <= 1, `slide ${i + 1} has at most one orange accent`);
      if (s.kind === 'stat' || s.kind === 'story') assert.ok(s.source, `slide ${i + 1} names its source`);
    }
    assert.ok(!c.caption.includes('—'), 'caption has no em dash');
  });

  test(`${slug}: renders every slide with the handle and the page count`, async () => {
    const c = await load(slug);
    const html = page(c);
    assert.equal((html.match(/<section class="slide/g) || []).length, c.slides.length);
    assert.ok(html.includes(SITE.instagram.handle));
    assert.ok(html.includes(`01 / ${String(c.slides.length).padStart(2, '0')}`));
    assert.ok(!/\*[^*<]+\*/.test(html.split('<body>')[1]), 'no unrendered accent markers');
  });
}

test('accent markers become the live span and are escaped', () => {
  assert.equal(live('a *b* <c>'), 'a <em class="live">b</em> &lt;c&gt;');
  assert.equal(live('x\ny'), 'x<br />y');
  assert.equal(plain('*b*'), 'b');
});
