import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poseAt, labelAt, settledAt, seg, MAP, ROTATION, CRACK0, SEPARATION } from '../assets/bulb/map.js';

test('the whole bulb holds still through the hold; the text is on at rest and the marks stay until the turn', () => {
  for (const t of [0, 0.04, MAP.hold]) { const p = poseAt(t); assert.equal(p.rot, 0); assert.equal(p.dims, 1); assert.equal(p.broken, false); assert.equal(p.sep, 0); }
  assert.equal(poseAt(0).text, 1); assert.equal(poseAt(0.05).text, 1);
});

test('the first flick is rewarded: the cracks grow fastest at the start, and the text begins to leave before the turn', () => {
  const first = poseAt(0.05).crack - poseAt(0).crack, later = poseAt(0.40).crack - poseAt(0.35).crack;
  assert.ok(first > later * 3, 'more crack per scroll at the start than near the end');
  assert.ok(poseAt(0.12).text < 1 && poseAt(0.12).text > 0, 'the text is leaving during the first fifth');
  assert.equal(poseAt(0.30).text, 0);
  assert.ok(CRACK0 >= 0.12, 'a crack at rest, not a hairline');
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
  assert.ok(poseAt(0.25).crack > 0.5 && poseAt(0.25).crack < 0.95, 'well under way mid-scroll');
  assert.ok(CRACK0 > 0);
});

test('the glass breaks only once the turn is complete; separation runs to the settle; nothing separates before', () => {
  assert.equal(poseAt(MAP.rotate - 0.001).broken, false); assert.equal(poseAt(MAP.rotate).broken, true);
  assert.equal(poseAt(MAP.rotate).sep, 0); assert.equal(poseAt(MAP.separate).sep, 1);
  assert.ok(SEPARATION > 0.2 && SEPARATION < 1, 'a slide, not a launch');
  let prev = 0;
  for (let t = 0; t <= 1.0001; t += 0.005) { const s = poseAt(t).sep; assert.ok(s >= prev - 1e-12); prev = s; }
});

test('the settle is an ease-out entrance: fast away from the separated pose, slow into the final one, complete at 1', () => {
  assert.equal(poseAt(MAP.separate).settle, 0);
  assert.ok(poseAt(1).settle > 0.999);
  const early = poseAt(MAP.separate + 0.06).settle - poseAt(MAP.separate).settle;
  const late = poseAt(1).settle - poseAt(1 - 0.06).settle;
  assert.ok(early > late * 4, 'most of the movement happens early');
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
