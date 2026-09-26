import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeline, depthOpacity, parallax, compensation, slatOpen, slatState, SLATS, P, TRAVEL, K, Y_GAIN } from '../assets/lab/hero.js';

test('the line is the fixed reference: depth 0 never moves, front moves with, back moves against', () => {
  assert.deepEqual(parallax(0, 1, 1), { x: 0, y: 0 });
  assert.ok(parallax(180, 1, 0).x > 0 && parallax(-420, 1, 0).x < 0);
  assert.ok(Math.abs(parallax(-420, 1, 0).x) > Math.abs(parallax(-70, 1, 0).x), 'deeper moves more');
  assert.deepEqual(parallax(-1100, 1, 1, 1100), { x: 0, y: 0 }, 'the resolution is still once the camera is on it');
});

test('every object projects at its layout size when the camera is where it is meant to be seen', () => {
  for (const depth of [300, 180, 80, 0, -40, -420]) {
    const projected = compensation(depth) * P / (P - depth);
    assert.ok(Math.abs(projected - 1) < 1e-12, `depth ${depth} from the front`);
  }
  const arrival = compensation(-1100, 1100) * P / (P - (-1100 + 1100));
  assert.ok(Math.abs(arrival - 1) < 1e-12, 'the resolution at true size when the camera arrives');
  assert.ok(compensation(-1100, 1100) * P / (P + 1100) < 0.5, 'and small from the front');
});

test('the slats are closed from the front and open with the viewing angle, in both directions', () => {
  for (const s of SLATS) {
    const xw = (s.t - 0.5) * 306;
    assert.equal(slatOpen(s, 0, xw, 0), 0, `${s.word} closed at rest`);
    assert.ok(!slatState(slatOpen(s, 0, xw, 0)).visible);
    let prev = 0;
    for (let v = 0; v <= 1; v += 0.05) { const o = slatOpen(s, v, xw, 0); assert.ok(o >= prev - 1e-9); prev = o; }
    assert.ok(slatOpen(s, 1, xw, 0) >= 57 && slatOpen(s, 1, xw, 0) <= 62, `${s.word} fully open at full tilt: ${slatOpen(s, 1, xw, 0)}`);
    assert.ok(Math.abs(slatOpen(s, -1, xw, 0) - slatOpen(s, 1, xw, 0)) < 1e-9, 'symmetric');
  }
});

test('purple is the state of legibility: none until about 28°, full by 40°', () => {
  assert.equal(slatState(20).purple, 0);
  assert.ok(slatState(34).purple > 0.3 && slatState(34).purple < 0.8);
  assert.equal(slatState(42).purple, 1);
  assert.ok(slatState(30).legible && !slatState(29).legible);
});

test('approach opens the slats on its own: each is legible by the time it passes the camera', () => {
  for (const s of SLATS) {
    // the camera position at which this slat starts to fade (z = 420)
    const camZ = 420 - s.depth;
    let p = 0; while (p < 1 && timeline(p).camZ < camZ) p += 0.001;
    const t = timeline(p);
    const xw = (s.t - 0.5) * 306 + parallax(s.depth, t.drift, 0, t.camZ).x;
    const o = slatOpen(s, t.drift, xw, t.camZ);
    assert.ok(o >= 30, `${s.word} legible as it passes (scroll ${p.toFixed(3)}, open ${o.toFixed(1)}°)`);
  }
  for (const s of SLATS) assert.equal(slatOpen(s, 0, (s.t - 0.5) * 306, 0), 0, `${s.word} still closed before any scroll`);
});

test('the camera arrives exactly at the resolution, and everything nearer has been passed', () => {
  const end = timeline(1);
  assert.equal(end.camZ, TRAVEL);
  assert.equal(-1100 + end.camZ, 0, 'resolution at depth 0');
  for (const depth of [180, 80, 0, -40, -420]) assert.equal(depthOpacity(depth + end.camZ), 0, `depth ${depth} passed`);
  assert.equal(timeline(0).camZ, 0);
  let prev = 0;
  for (let p = 0; p <= 1; p += 0.005) { const c = timeline(p).camZ; assert.ok(c >= prev - 1e-9 && c - prev < 20, `camera jumps at ${p}`); prev = c; }
});

test('planes fade before they reach the camera', () => {
  assert.equal(depthOpacity(400), 1); assert.equal(depthOpacity(640), 0);
});

test('pitch keeps the sculpture one object: QUIET-to-rule travel fits the 38 px clearance, the words keep their 25 px interlock', () => {
  const quiet = parallax(180, 0, 1).y, bands = parallax(80, 0, 1).y, rule = parallax(0, 0, 1).y;
  assert.ok(Math.abs(quiet - rule) <= 12, `QUIET moves ${(quiet - rule).toFixed(1)} px against the rule at full pitch`);
  assert.ok(Math.abs(quiet - bands) <= 8, `QUIET moves ${(quiet - bands).toFixed(1)} px against BANDS at full pitch`);
  assert.ok(Y_GAIN > 0 && K * Y_GAIN * (180 / 300) < 38 - 16, 'clearance to the rule survives with margin');
});
