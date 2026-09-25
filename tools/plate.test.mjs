import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeline, project, depthOpacity, wakeOf, LAYERS, P } from '../assets/lab/plate.js';
import { rubberband, springStep } from '../assets/lab/spatial-engine.js';

const view = (o = {}) => ({ viewX: 0, viewY: 0, sep: 0, camZ: 0, rot: 3.5, viewW: 1, ...o });

test('timeline is continuous, sealed at both ends, resolved at the end', () => {
  let prev = timeline(0);
  for (let p = 0.005; p <= 1; p += 0.005) {
    const t = timeline(p);
    assert.ok(Math.abs(t.camZ - prev.camZ) < 30, `camZ jumps at ${p}`);
    assert.ok(Math.abs(t.sep - prev.sep) < 0.05, `sep jumps at ${p}`);
    prev = t;
  }
  for (const p of [0, 1]) { const t = timeline(p); assert.equal(t.sep, 0); assert.equal(t.camZ, 0); assert.equal(t.wake, 0); }
  assert.equal(timeline(1).final, 1); assert.equal(timeline(0).final, 0); assert.equal(timeline(0).caps[0], 1);
});

test('the six states happen in order', () => {
  const at = (p) => timeline(p);
  assert.ok(at(0.22).sep > 0.6 && at(0.22).camZ < 100, 'separation before entry');
  assert.ok(at(0.40).camZ > 250 && at(0.40).caps[1] > 0.5, 'entry with LOOK DEEPER');
  assert.ok(at(0.62).wake > 0.9 && at(0.62).camZ > 600, 'intelligence: awake and inside');
  assert.ok(at(0.86).camZ < 100 && at(0.86).sep < 0.3, 'reassembly');
  assert.ok(at(0.97).final > 0.5, 'resolution');
});

test('captions never overlap and appear in order', () => {
  const seen = [];
  for (let p = 0; p <= 1; p += 0.01) {
    const c = timeline(p).caps, on = c.map((v, i) => (v > 0.5 ? i : -1)).filter((i) => i >= 0);
    assert.ok(on.length <= 1, `two captions at ${p}`);
    if (on.length && seen[seen.length - 1] !== on[0]) seen.push(on[0]);
  }
  assert.deepEqual(seen, [0, 1, 2]);
});

test('from the front, all four planes project to the same rectangle', () => {
  for (const L of LAYERS) {
    const t = project(L, view());
    const projected = t.scale * P / (P - t.z);
    assert.ok(Math.abs(projected - 1) < 1e-9, `${L.id} projects at ${projected}`);
    assert.equal(t.x, 0); assert.equal(t.y, 0);
  }
});

test('a change of angle moves the planes by depth: front most, rear against', () => {
  const xs = LAYERS.map((L) => project(L, view({ viewX: 1 })).x);
  const byId = Object.fromEntries(LAYERS.map((L, i) => [L.id, xs[i]]));
  assert.ok(byId.security > byId.analysis && byId.analysis > byId.evidence && byId.evidence > 0, 'front planes move with the view');
  assert.ok(byId.intel < 0, 'the rear plane counter-moves');
  assert.ok(byId.security - byId.intel > 70, 'the relative motion is obvious');
});

test('opening for inspection increases the separation between planes', () => {
  const gap = (sep) => { const s = project(LAYERS[3], view({ viewX: 1, sep })), i = project(LAYERS[0], view({ viewX: 1, sep })); return { x: s.x - i.x, z: s.z - i.z }; };
  const closed = gap(0), open = gap(1);
  assert.ok(open.z > closed.z + 150, 'depth separation'); assert.ok(open.x > closed.x + 30, 'more relative parallax while open');
});

test('planes fade before they reach the camera', () => {
  let prev = 1;
  for (let z = 0; z <= 900; z += 10) { const o = depthOpacity(z); assert.ok(o <= prev + 1e-12); prev = o; }
  assert.equal(depthOpacity(400), 1); assert.equal(depthOpacity(640), 0);
});

test('the hidden path wakes with angle, fully under inspection, never at rest', () => {
  assert.equal(wakeOf(0, 1, 0, 0), 0);
  assert.equal(wakeOf(0, 1, 1, 0), 1);
  let prev = 0;
  for (let x = 0; x <= 1; x += 0.05) { const w = wakeOf(x, 1, 0, 0); assert.ok(w >= prev - 1e-12); prev = w; }
  assert.ok(wakeOf(1, 1, 0, 0) > 0.6 && wakeOf(1, 1, 0, 0) < 1, 'angle alone never fully wakes it');
  assert.ok(wakeOf(1, 0.3, 0, 0) < wakeOf(1, 1, 0, 0), 'angle matters less while travelling');
});

test('rubber-band: linear inside the limit, diminishing past it', () => {
  assert.equal(rubberband(0.5), 0.5); assert.ok(rubberband(2) < 1.6 && rubberband(2) > 1); assert.ok(rubberband(-3) > -1.6);
});

test('spring settles without overshoot, keeps velocity on handoff, stable at 48ms frames', () => {
  let x = 0, v = 0;
  for (let i = 0; i < 60; i++) { [x, v] = springStep(x, v, 1, 1 / 60, 0.42); assert.ok(x <= 1 + 1e-6); }
  assert.ok(Math.abs(x - 1) < 0.01);
  [x, v] = springStep(0, 4, 0, 1 / 60, 0.42); assert.ok(x > 0, 'a release carries the finger velocity');
  x = 0; v = 0;
  for (let i = 0; i < 40; i++) { [x, v] = springStep(x, v, 1, 0.048, 0.2); assert.ok(Number.isFinite(x) && x < 1.2 && x > -0.2, `unstable at frame ${i}: ${x}`); }
  assert.ok(Math.abs(x - 1) < 0.01);
});
