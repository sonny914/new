import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODE_FRAMES, STATE_TO_MODE, resolvePreset, countDots } from '../assets/orb/engine.js';
import { STATES, SIZES, LABELS, parseTint, nearestSize, normalizeProps, ancestorTheme, resolveDark, makePainter, ThinkingOrbElement, STILL_T } from '../assets/orb/thinking-orb.js';

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

test('every state at every size resolves to a mode and draws a finished, finite, far-to-near frame', () => {
  for (const state of STATES) for (const size of SIZES) {
    const { mode, speed, opts } = resolvePreset(state, size);
    assert.equal(mode, STATE_TO_MODE[state]);
    assert.ok(speed > 0, `${state}@${size} has a speed`);
    for (const t of [0, STILL_T, 3.7, 120]) {
      const f = MODE_FRAMES[mode](size, t, opts);
      assert.ok(f.dots.length > 0, `${state}@${size} t=${t} draws dots`);
      let z = -Infinity;
      for (const d of f.dots) {
        assert.ok(finite(d.x) && finite(d.y) && finite(d.z) && finite(d.r) && finite(d.white), `${state}@${size} finite dot`);
        assert.ok(d.r > 0 && d.white > -0.2 && d.white < 1.2, `${state}@${size} radius positive, ink near 0..1 (the painter clamps it)`);
        assert.ok(d.z >= z, `${state}@${size} dots are z-sorted far to near`); z = d.z;
      }
      for (const l of f.lines) assert.ok(finite(l.x1) && finite(l.y1) && finite(l.x2) && finite(l.y2) && l.w > 0);
    }
  }
});

test('frames are deterministic: the same instant paints the same marks, so all instances share one clock', () => {
  for (const state of STATES) {
    const { mode, opts } = resolvePreset(state, 64);
    assert.deepEqual(MODE_FRAMES[mode](64, 2.25, opts), MODE_FRAMES[mode](64, 2.25, opts));
  }
});

test('the smaller presets are their own designs: fewer dots at 20 than at 64, and 32 sits between', () => {
  for (const state of STATES) {
    // shaping is density-driven, so its profile carries no count: measure what it actually draws
    const n = (size) => { const { mode, opts } = resolvePreset(state, size); return countDots(opts) || MODE_FRAMES[mode](size, STILL_T, opts).dots.length; };
    assert.ok(n(20) <= n(32) && n(32) <= n(64), `${state}: ${n(20)} ≤ ${n(32)} ≤ ${n(64)}`);
  }
});

test('every state has a label, and breathing says Thinking', () => {
  for (const s of STATES) assert.ok(LABELS[s].endsWith('…'), s);
  assert.equal(LABELS.breathing, 'Thinking…');
});

test('parseTint reads #rgb, #rrggbb and rgb(); anything else is the stock ink', () => {
  assert.deepEqual(parseTint('#f00'), { r: 255, g: 0, b: 0 });
  assert.deepEqual(parseTint('#FF5A1F'), { r: 255, g: 90, b: 31 });
  assert.deepEqual(parseTint(' rgb(1, 2, 3) '), { r: 1, g: 2, b: 3 });
  assert.deepEqual(parseTint('rgba(4,5,6,0.5)'), { r: 4, g: 5, b: 6 });
  for (const bad of ['orange', '#12', '', undefined, null, 12]) assert.equal(parseTint(bad), undefined, String(bad));
});

test('sizes snap to the nearest tuned preset, ties and nonsense to 64', () => {
  assert.equal(nearestSize(64), 64); assert.equal(nearestSize('20'), 20); assert.equal(nearestSize(30), 32);
  assert.equal(nearestSize(50), 64); assert.equal(nearestSize(25), 20); assert.equal(nearestSize(48), 64);
  assert.equal(nearestSize('big'), 64); assert.equal(nearestSize(undefined), 64);
});

test('normalizeProps fills defaults, drops undefined, validates, and keeps null label as decorative', () => {
  assert.deepEqual(normalizeProps(), { state: 'working', size: 64, theme: 'auto', speed: 1, paused: false, color: undefined, dots: 1, dotSize: 1, opts: undefined, label: undefined });
  const p = normalizeProps({ state: 'searching', size: '20', theme: 'dark', speed: '1.5', paused: '', color: ' #fff ', dots: '0', dotSize: 'x', opts: { thr: 2 }, label: null });
  assert.deepEqual(p, { state: 'searching', size: 20, theme: 'dark', speed: 1.5, paused: true, color: '#fff', dots: 0.1, dotSize: 1, opts: { thr: 2 }, label: null });
  assert.equal(normalizeProps({ state: 'flying', theme: 'neon', speed: -2 }).state, 'working');
  assert.equal(normalizeProps({ theme: 'neon' }).theme, 'auto');
  assert.equal(normalizeProps({ speed: -2 }).speed, 0);
  assert.equal(normalizeProps({ ...p, state: undefined }).state, 'working', 'an undefined patch falls back to the default, never to undefined');
  assert.equal(normalizeProps({ label: 'Analysing…' }).label, 'Analysing…');
});

const node = (attrs = {}, classes = [], parent = null) => ({ getAttribute: (k) => attrs[k] ?? null, classList: { contains: (c) => classes.includes(c) }, parentElement: parent });

test('theme resolves pinned first, then the nearest ancestor data-theme or class, then the system', () => {
  const html = node({ 'data-theme': 'dark' });
  const panel = node({ 'data-theme': 'light' }, [], html);
  const leaf = node({}, [], panel);
  assert.equal(ancestorTheme(leaf), false, 'nearest wins');
  assert.equal(ancestorTheme(panel), false);
  assert.equal(ancestorTheme(node({}, ['dark'], node({ 'data-theme': 'light' }))), true, 'a class counts');
  assert.equal(ancestorTheme(node()), null, 'nothing decides');
  assert.equal(resolveDark('dark', leaf), true); assert.equal(resolveDark('light', html), false);
  assert.equal(resolveDark('auto', leaf, () => true), false, 'tree beats system');
  assert.equal(resolveDark('auto', node(), () => true), true); assert.equal(resolveDark('auto', node(), () => false), false);
  assert.equal(resolveDark('auto', null, () => true), true, 'no element: system');
});

test('makePainter bakes speed, tint and density into one painter that draws a frame on any 2D context', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, k) => (...a) => { calls.push(k); if (k === 'createLinearGradient' || k === 'createRadialGradient') return { addColorStop() {} }; return undefined; } });
  const base = makePainter(normalizeProps({ state: 'connecting', size: 64 }));
  const fast = makePainter(normalizeProps({ state: 'connecting', size: 64, speed: 2, color: '#FF5A1F', dots: 0.5 }));
  assert.equal(fast.effSpeed, base.effSpeed * 2);
  assert.ok(fast.frame(1).dots.length < base.frame(1).dots.length, 'half density draws fewer nodes');
  fast.paint(ctx, 2, STILL_T, true);
  assert.equal(calls[0], 'setTransform'); assert.equal(calls[1], 'clearRect'); assert.ok(calls.includes('arc') && calls.includes('fill'), 'dots are canvas arcs');
});

test('the module imports without a DOM and only defines the element where one exists', () => {
  assert.equal(ThinkingOrbElement, null);
});
