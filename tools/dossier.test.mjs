import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeline, depthOpacity, layerTransform, rubberband, springStep } from '../assets/lab/dossier.js';

const L = { id: 'front', baseZ: 44, px: 1.4, py: 1.2, holdZ: 210, holdX: 26, holdY: 16, rot: 1.2 };
const rest = { tilt: { x: 0, y: 0 }, tiltW: 1, sep: 0, camZ: 0, rot: 6 };

test('timeline is continuous and returns to the assembled state', () => {
  let prev = timeline(0);
  for (let p = 0.005; p <= 1; p += 0.005) { const t = timeline(p); assert.ok(Math.abs(t.camZ - prev.camZ) < 30, `camZ jumps at ${p}`); assert.ok(Math.abs(t.sep - prev.sep) < 0.05, `sep jumps at ${p}`); prev = t; }
  const end = timeline(1); assert.equal(end.camZ, 0); assert.equal(end.sep, 0); assert.equal(end.final, 1);
  assert.equal(timeline(0).final, 0); assert.equal(timeline(0).travel, 0);
});

test('captions appear in order and never overlap', () => {
  const seen = [];
  for (let p = 0; p <= 1; p += 0.01) { const c = timeline(p).caps; const on = c.map((v, i) => (v > 0.5 ? i : -1)).filter((i) => i >= 0); assert.ok(on.length <= 1, `two captions at ${p}`); if (on.length && seen[seen.length - 1] !== on[0]) seen.push(on[0]); }
  assert.deepEqual(seen, [0, 1, 2]);
});

test('front plane passes the camera before the back plane during travel', () => {
  const t = timeline(0.5), s = { ...rest, sep: t.sep, camZ: t.camZ };
  const gold = layerTransform(L, s), back = layerTransform({ id: 'schematic', baseZ: -40, px: -0.3, py: -0.25, holdZ: -110, holdX: 14, holdY: 10, rot: 0.5 }, s);
  assert.ok(gold.z > back.z);
  assert.ok(gold.o < back.o, 'the plane nearer the camera is the fainter one');
});

test('depth opacity is 1 at rest and 0 past the camera', () => {
  assert.equal(depthOpacity(0), 1); assert.equal(depthOpacity(300), 1); assert.equal(depthOpacity(1100), 0);
});

test('tilt moves the front plane more than the back plane, and holding separates them in z', () => {
  const s = { ...rest, tilt: { x: 1, y: 0 } };
  const front = layerTransform(L, s), back = layerTransform({ id: 'shadow', baseZ: -80, px: -0.12, py: -0.12, holdZ: -60, holdX: 0, holdY: 0, rot: 0.15 }, s);
  assert.ok(Math.abs(front.x) > Math.abs(back.x) * 5);
  assert.ok(Math.sign(front.x) !== Math.sign(back.x), 'back plane moves the other way');
  const held = layerTransform(L, { ...rest, sep: 1 });
  assert.equal(held.z, 44 + 210);
});

test('rubber-band: identity inside the limit, rising resistance past it, never hard-stops', () => {
  assert.equal(rubberband(0.5), 0.5); assert.equal(rubberband(-1), -1);
  const a = rubberband(1.5), b = rubberband(3);
  assert.ok(a > 1 && a < 1.5); assert.ok(b > a && b < 3); assert.ok(b - a < 1.5 - 1);
});

test('spring: settles on the target without overshoot and carries velocity', () => {
  let x = 0, v = 0; const dt = 1 / 60;
  for (let i = 0; i < 120; i++) [x, v] = springStep(x, v, 1, dt);
  assert.ok(Math.abs(x - 1) < 0.01, 'settles');
  let over = false; x = 0; v = 0;
  for (let i = 0; i < 120; i++) { [x, v] = springStep(x, v, 1, dt); if (x > 1.0005) over = true; }
  assert.equal(over, false, 'critically damped: no overshoot');
  let x2 = 0, v2 = 4; [x2, v2] = springStep(x2, v2, 0, dt);
  assert.ok(x2 > 0, 'a release with velocity keeps moving before it returns');
});

test('spring: stays stable and bounded at long frame times', () => {
  let x = 0, v = 0;
  for (let i = 0; i < 60; i++) [x, v] = springStep(x, v, 1, 0.048, 0.2);
  assert.ok(Math.abs(x - 1) < 0.01 && Math.abs(v) < 0.05, `x=${x} v=${v}`);
});