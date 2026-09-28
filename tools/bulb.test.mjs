import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poseAt, labelAt, settledAt, seg, MAP, ROTATION, CRACK0, SEPARATION, SETTLE } from '../assets/bulb/map.js';

test('the whole bulb holds still through the hold; the text is on at rest and the marks stay until the turn', () => {
  for (const t of [0, MAP.hold / 2, MAP.hold]) { const p = poseAt(t); assert.equal(p.rot, 0); assert.equal(p.dims, 1); assert.equal(p.broken, false); assert.equal(p.sep, 0); }
  assert.equal(poseAt(0).text, 1);
});

test('the bulb turns before the glass cracks: whole through the first fifth, then the cracks run fastest at their start', () => {
  for (const t of [0, 0.10, MAP.crack]) assert.ok(Math.abs(poseAt(t).crack - CRACK0) < 1e-12, `the crack at rest only, at ${t}`);
  assert.ok(poseAt(MAP.crack).rot > ROTATION * 0.2, 'a clearly visible turn before the first new crack');
  const first = poseAt(MAP.crack + 0.05).crack - poseAt(MAP.crack).crack, later = poseAt(0.40).crack - poseAt(0.35).crack;
  assert.ok(first > later * 2.5, 'more crack per scroll at the start than near the end');
  assert.ok(poseAt(0.03).text < 1 && poseAt(MAP.crack).text === 0, 'the headline answers the first flick and is gone before the glass cracks');
  assert.ok(poseAt(MAP.hold + 0.02).rot > Math.PI / 30, 'the turn tracks the scroll from the first flick: more than 6° after 2% of the track');
  assert.ok(poseAt(MAP.crack).rot > Math.PI / 2, 'at least a quarter turn, whole, before the first new crack');
  assert.ok(CRACK0 > 0 && CRACK0 <= 0.08, 'a hairline at rest, not a crack under way');
});

test('rotation is 0 at the start of its segment, 200° at the end, monotonic between, and never overshoots', () => {
  assert.equal(poseAt(MAP.hold).rot, 0);
  assert.ok(Math.abs(poseAt(MAP.rotate).rot - ROTATION) < 1e-12);
  let prev = -1;
  for (let t = 0; t <= 1.0001; t += 0.005) { const r = poseAt(t).rot; assert.ok(r >= prev - 1e-12, `rotation goes backwards at ${t}`); assert.ok(r <= ROTATION + 1e-12); prev = r; }
});

test('the dimension marks leave early in the turn and stay gone; the text stays gone too', () => {
  const gone = MAP.hold + 0.10;
  assert.equal(poseAt(gone).dims, 0);
  assert.ok(poseAt((MAP.hold + gone) / 2).dims > 0 && poseAt((MAP.hold + gone) / 2).dims < 1);
  assert.equal(poseAt(1).text, 0); assert.equal(poseAt(1).dims, 0);
});

test('segments ease at both ends: zero slope entering and leaving', () => {
  const d = 1e-4;
  assert.ok(seg(0.2 + d, 0.2, 0.5) < 1e-6);
  assert.ok(1 - seg(0.5 - d, 0.2, 0.5) < 1e-6);
  assert.ok(Math.abs(seg(0.35, 0.2, 0.5) - 0.5) < 1e-12, 'symmetric about the middle');
});

test('the cracks start as a hairline at rest, grow with the scroll, and are complete before the glass separates', () => {
  assert.ok(poseAt(0).crack > 0 && poseAt(0).crack <= 0.2, 'a short crack at rest, not the network');
  let prev = 0;
  for (let t = 0; t <= 1.0001; t += 0.005) { const c = poseAt(t).crack; assert.ok(c >= prev - 1e-12, `cracks close again at ${t}`); prev = c; }
  assert.ok(Math.abs(poseAt(MAP.rotate).crack - 1) < 1e-12);
  assert.equal(poseAt(MAP.separate).crack, 1);
  assert.ok(poseAt(0.33).crack > 0.5 && poseAt(0.33).crack < 0.95, 'well under way mid-turn');
  assert.ok(CRACK0 > 0);
});

test('the glass breaks only once the turn is complete; separation runs to the settle; nothing separates before', () => {
  assert.equal(poseAt(MAP.rotate - 0.001).broken, false); assert.equal(poseAt(MAP.rotate).broken, true);
  assert.equal(poseAt(MAP.rotate).sep, 0); assert.equal(poseAt(MAP.separate).sep, 1);
  assert.ok(SEPARATION > 0.2 && SEPARATION < 1, 'a slide, not a launch');
  let prev = 0;
  for (let t = 0; t <= 1.0001; t += 0.005) { const s = poseAt(t).sep; assert.ok(s >= prev - 1e-12); prev = s; }
});

test('the bulb opens as one continuous move: the settle overlaps the separation and never jumps in speed', () => {
  assert.equal(poseAt(SETTLE.from).settle, 0);
  assert.ok(poseAt(1).settle > 0.999);
  assert.ok(SETTLE.from > MAP.rotate && SETTLE.from < MAP.separate, 'the pieces start for their poses while still sliding out');
  const step = 0.005; let prev = poseAt(0).settle, prevD = 0, maxD = 0, maxJump = 0;
  for (let t = step; t <= 1.0001; t += step) { const s = poseAt(t).settle, d = s - prev; assert.ok(d >= -1e-12); maxD = Math.max(maxD, d); maxJump = Math.max(maxJump, Math.abs(d - prevD)); prev = s; prevD = d; }
  const mean = step / (SETTLE.to - SETTLE.from);
  assert.ok(maxD < mean * 1.6, 'no lunge: the fastest step is close to the average');
  assert.ok(maxJump < mean * 0.2, 'speed changes gradually from step to step');
});

test('the debris leaves only after the break, and the base fades only once the fragments leave for their poses', () => {
  assert.equal(poseAt(MAP.rotate).release, 0); assert.ok(poseAt(0.6).release > 0); assert.equal(poseAt(0.85).release, 1);
  assert.equal(poseAt(MAP.separate).anchor, 1); assert.equal(poseAt(0.85).anchor, 0); assert.equal(poseAt(0.3).anchor, 1);
});

test('labels arrive staggered near the end and are all fully on at 1', () => {
  for (let i = 0; i < 4; i++) { assert.equal(labelAt(MAP.separate, i), 0); assert.equal(labelAt(1, i), 1); }
  const t = 0.90;
  assert.ok(labelAt(t, 0) > labelAt(t, 1) && labelAt(t, 1) > labelAt(t, 2) && labelAt(t, 2) > labelAt(t, 3), 'one after another');
  assert.equal(settledAt(MAP.separate), 0); assert.equal(settledAt(1), 1); assert.ok(settledAt(0.94) > 0 && settledAt(0.94) < 1, 'the wordmark and contact line arrive last');
});

test('the selection curve is the strong ease-in-out from the stylesheet: slow at both ends, monotonic', async () => {
  const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('../assets/bulb/entry.js', import.meta.url), 'utf8'));
  // entry.js needs the browser import map for three; lift the pure bezier out and evaluate it alone
  const m = src.match(/export function bezier[\s\S]*?\n}\n/);
  const bezier = new Function(m[0].replace('export function bezier', 'function bezier') + '; return bezier;')();
  const ease = bezier(0.77, 0, 0.175, 1);
  assert.equal(ease(0), 0); assert.equal(ease(1), 1);
  assert.ok(ease(0.1) < 0.02, 'slow start'); assert.ok(ease(0.9) > 0.98, 'slow end');
  assert.ok(ease(0.5) > 0.4 && ease(0.5) < 0.62, 'the middle is near the middle');
  let prev = 0; for (let x = 0; x <= 1.0001; x += 0.01) { const y = ease(x); assert.ok(y >= prev - 1e-9); prev = y; }
});
