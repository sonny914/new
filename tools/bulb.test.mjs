import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poseAt, seg, MAP, ROTATION, CRACK0 } from '../assets/bulb/map.js';

test('the whole bulb holds still and the text is on until the hold ends', () => {
  for (const t of [0, 0.05, 0.1, MAP.hold]) { const p = poseAt(t); assert.equal(p.rot, 0); assert.equal(p.text, 1); assert.equal(p.dims, 1); }
});

test('rotation is 0 at the start of its segment, 200° at the end, monotonic between, and never overshoots', () => {
  assert.equal(poseAt(MAP.hold).rot, 0);
  assert.ok(Math.abs(poseAt(MAP.rotate).rot - ROTATION) < 1e-12);
  let prev = -1;
  for (let t = 0; t <= 1.0001; t += 0.005) { const r = poseAt(t).rot; assert.ok(r >= prev - 1e-12, `rotation goes backwards at ${t}`); assert.ok(r <= ROTATION + 1e-12); prev = r; }
});

test('the text and the dimension marks leave together, early in the turn, and stay gone', () => {
  const gone = MAP.hold + 0.12;
  assert.equal(poseAt(gone).text, 0); assert.equal(poseAt(gone).dims, 0);
  assert.ok(poseAt((MAP.hold + gone) / 2).text > 0 && poseAt((MAP.hold + gone) / 2).text < 1);
  assert.equal(poseAt(1).text, 0);
});

test('segments ease at both ends: zero slope entering and leaving', () => {
  const d = 1e-4;
  assert.ok(seg(0.2 + d, 0.2, 0.5) < 1e-6);
  assert.ok(1 - seg(0.5 - d, 0.2, 0.5) < 1e-6);
  assert.ok(Math.abs(seg(0.35, 0.2, 0.5) - 0.5) < 1e-12, 'symmetric about the middle');
});

test('the cracks start as a hairline at rest, grow with the scroll, and are complete before the glass separates', () => {
  assert.ok(poseAt(0).crack > 0 && poseAt(0).crack <= 0.06, 'a hairline at rest');
  let prev = 0;
  for (let t = 0; t <= 1.0001; t += 0.005) { const c = poseAt(t).crack; assert.ok(c >= prev - 1e-12, `cracks close again at ${t}`); prev = c; }
  assert.ok(Math.abs(poseAt(MAP.rotate).crack - 1) < 1e-12);
  assert.equal(poseAt(MAP.separate).crack, 1);
  assert.ok(poseAt(0.25).crack > 0.3 && poseAt(0.25).crack < 0.8, 'well under way mid-scroll');
  assert.ok(CRACK0 > 0);
});
