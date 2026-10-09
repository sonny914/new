import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {prepareProject} from '../src/engine/config/prepare';
import {approximateMeasure, layoutProject} from '../src/engine/layout';
import {resolveTime} from '../src/engine/time';
import type {Prepared} from '../src/engine/types';
import {PRESETS} from '../src/presets';
import {exampleProject} from '../src/presets/examples';
import {evaluateText, matchGlyphs, restWindows, type TextLayout} from '../src/presets/typography/textcore';
import {quietBands} from '../src/themes/quiet-bands/tokens';

describe('every preset is complete and its example runs', () => {
  for (const def of Object.values(PRESETS)) {
    it(def.id, () => {
      // Documentation the catalog is generated from.
      assert.ok(def.summary.length > 20);
      for (const k of ['effect', 'timing', 'easing', 'performance'] as const) assert.ok(def.doc[k].length > 10, `${def.id}.doc.${k}`);
      assert.ok(def.doc.supports.length && def.doc.covers.length);
      // The example validates and lays out, and publishes the anchors it declares.
      const r = prepareProject(exampleProject(def), {presets: PRESETS});
      assert.deepEqual(r.issues.filter((i) => i.level === 'error'), [], JSON.stringify(r.issues));
      const lay = layoutProject(r as Prepared, PRESETS, approximateMeasure);
      assert.deepEqual(lay.issues, []);
      for (const a of def.anchors ?? []) assert.ok(lay.anchors[`example.${a}`], `${def.id} should publish @example.${a}`);
      // Defaults fill in: an empty-ish param object is completed by the schema.
      const parsed = def.schema.safeParse(def.example.params);
      assert.ok(parsed.success);
      if (def.events) {
        const prep = r as Prepared;
        const ev = def.events(prep.layers[prep.layers.length - 1].params as never, {t: (e) => resolveTime(e, prep.time), fps: 30, theme: quietBands}, prep.layers[prep.layers.length - 1]);
        assert.ok(ev.every((f) => Number.isFinite(f)));
      }
    });
  }
});

describe('typography: glyph matching (the COMPLEXITY → SIMPLICITY match cut)', () => {
  it('keeps the six shared letters in place and rolls the other four', () => {
    const m = matchGlyphs([...'COMPLEXITY'], [...'SIMPLICITY']);
    assert.deepEqual(m.pairs, [
      [2, 2],
      [3, 3],
      [4, 4],
      [7, 7],
      [8, 8],
      [9, 9],
    ]);
    assert.deepEqual(m.swaps, [
      [0, 0],
      [1, 1],
      [5, 5],
      [6, 6],
    ]);
    assert.deepEqual(m.outs, []);
    assert.deepEqual(m.ins, []);
  });
  it('handles words of different length with leftovers', () => {
    const m = matchGlyphs([...'NOISE'], [...'NOTICE']);
    assert.equal(m.pairs.length, 4); // N O I E
    assert.equal(m.swaps.length, 1); // S ↔ T or C
    assert.equal(m.ins.length, 1);
  });
});

describe('typography: evaluation over time', () => {
  const raw = JSON.parse(
    JSON.stringify({
      id: 't',
      title: 't',
      duration: '4s',
      scenes: [{id: 's1', start: 0, end: 'end', title: 't', purpose: 'p'}],
      layers: [
        {
          id: 'h',
          preset: 'KineticHeadline',
          params: {states: [{text: 'COMPLEXITY', at: 10}, {text: 'SIMPLICITY', at: 60}], exit: {at: 100}},
        },
      ],
    }),
  );
  const prep = prepareProject(raw, {presets: PRESETS}) as Prepared;
  const d = layoutProject(prep, PRESETS, approximateMeasure).data.h as TextLayout;
  it('is empty before it enters and at rest once arrived', () => {
    assert.equal(evaluateText(d, 5, quietBands).glyphs.length, 0);
    const settled = evaluateText(d, 50, quietBands);
    assert.equal(settled.rest, true);
    assert.equal(settled.glyphs.map((g) => g.char).join(''), 'COMPLEXITY');
    assert.ok(settled.glyphs.every((g) => g.dy === 0));
  });
  it('mid-swap shows old and new glyphs glued one slot apart', () => {
    const mid = evaluateText(d, 66, quietBands);
    assert.equal(mid.rest, false);
    const s = mid.glyphs.find((g) => g.char === 'S');
    const c = mid.glyphs.find((g) => g.char === 'C' && g.key.startsWith('0-'));
    assert.ok(s && c);
    assert.ok(Math.abs(s.dy - c.dy - 1) < 1e-9, 'incoming sits exactly one slot below outgoing');
    assert.equal(s.x, c.x);
  });
  it('reads SIMPLICITY after the swap and leaves on exit', () => {
    assert.equal(evaluateText(d, 95, quietBands).glyphs.map((g) => g.char).join(''), 'SIMPLICITY');
    assert.equal(evaluateText(d, 140, quietBands).glyphs.length, 0);
  });
  it('reports rest windows for reading-time checks', () => {
    const w = restWindows(d, 120);
    assert.equal(w.length, 2);
    assert.ok(w[0].from < w[0].to && w[0].to === 60);
    assert.equal(w[1].to, 100);
  });
});
