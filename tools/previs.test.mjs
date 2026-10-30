// Test 01 previs: the three camera moves hold up spatially. These are the checks a continuity supervisor would make
// on the animatic, run against the same numbers the renderer draws (tools/previs/shots.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from './previs/shots.mjs';

const frames = Array.from({ length: S.FRAMES }, (_, n) => n / S.FPS);
const gap = (W) => { // closest distance between the bell's surface and the Listener's body
  const b = S.bodyAt('L', W), bell = S.bellAt(W);
  let d = S.len(S.sub(bell, b.joints.head.p)) - S.RIG_L.headR;
  for (const [a, c, ra, rc] of b.rig.segs) {
    const A = b.joints[a].p, AB = S.sub(b.joints[c].p, A), k = Math.max(0, Math.min(1, S.dot(S.sub(bell, A), AB) / S.dot(AB, AB)));
    d = Math.min(d, S.len(S.sub(bell, S.add(A, S.mul(AB, k)))) - S.lerp(ra, rc, k));
  }
  return d - S.BELL.radius;
};

test('the edit is 600 frames of contiguous shots, and the two clocks agree', () => {
  assert.equal(S.FRAMES, 600);
  assert.equal(S.SHOTS[0].t0, 0); assert.equal(S.SHOTS.at(-1).t1, S.DURATION);
  for (let i = 1; i < S.SHOTS.length; i++) assert.equal(S.SHOTS[i].t0, S.SHOTS[i - 1].t1, `${S.SHOTS[i].id} starts where the last shot ends`);
  for (const s of S.SHOTS) assert.ok(s.keys[0].t === s.t0 && s.keys.at(-1).t === s.t1, `${s.id} keys cover the shot`);
  let w = -1;
  for (const t of frames) { const W = S.worldAt(t); assert.ok(W > w, 'world time only runs forward'); w = W; assert.ok(Math.abs(S.editAt(W) - t) < 1e-3, 'editAt inverts worldAt'); }
});

test('MOVE 01: the freeze lands on the apex of the leap and the camera makes one full orbit of it', () => {
  const t0 = 3.2, t1 = 7.0;
  assert.ok(Math.abs(S.worldAt(t0) - S.EV.apex) < 0.01, 'time stops at the top of the arc');
  for (let t = t0; t <= t1; t += 1 / S.FPS) assert.ok(S.speedAt(t) <= 0.01, `still frozen at ${t.toFixed(2)} s`);
  const drift = S.len(S.sub(S.rootL(S.worldAt(t1)), S.rootL(S.worldAt(t0))));
  assert.ok(drift < 0.1, `she holds within 10 cm during the orbit (moved ${(drift * 100).toFixed(1)} cm)`);
  const sweep = Math.abs(S.cameraAt(6.85).az - S.cameraAt(t0).az);
  assert.ok(sweep >= 350, `the orbit turns ${sweep.toFixed(0)}°`);
  assert.equal(S.shotAt(t0).move, 'MOVE 01 · 360° FREEZE');
});

test('MOVE 03: the bell misses her by centimetres, at 2% speed, while the camera orbits the gap', () => {
  let best = { d: Infinity };
  for (let W = 3.0; W < 3.5; W += 0.0005) { const d = gap(W); if (d < best.d) best = { d, W }; }
  assert.ok(best.d > 0.04 && best.d < 0.15, `closest pass is ${(best.d * 100).toFixed(1)} cm`);
  const t = S.editAt(best.W);
  assert.ok(S.speedAt(t) <= 0.025, `the closest pass plays at ${(S.speedAt(t) * 100).toFixed(1)}%`);
  assert.equal(S.shotAt(t).move, 'MOVE 03 · DODGE ORBIT');
  for (let W = 2.0; W < S.EV.contact; W += 0.002) assert.ok(gap(W) > 0.03, `no contact at W ${W.toFixed(3)}`);
  const sweep = S.cameraAt(14.2).az - S.cameraAt(7.7).az;
  assert.ok(sweep >= 150, `the dodge orbit turns ${sweep.toFixed(0)}°`);
});

test('MOVE 04: the tines meet the bell at the contact, and the impact frames fall inside the impact shot', () => {
  const tip = S.bodyAt('L', S.EV.contact).fork.tip;
  assert.ok(S.len(S.sub(tip, S.CONTACT)) < 0.12, `fork tip is ${(S.len(S.sub(tip, S.CONTACT)) * 100).toFixed(0)} cm from the contact point`);
  assert.ok(Math.abs(S.len(S.sub(S.bellAt(S.EV.contact), S.CONTACT)) - S.BELL.radius) < 0.05, 'the contact point is on the bell');
  assert.equal(S.shotAt(S.IMPACT_FRAME / S.FPS).move, 'MOVE 04 · IMPACT TRANSITION');
  assert.ok(S.speedAt(S.IMPACT_FRAME / S.FPS) < 0.1, 'the contact plays braked');
});

test('the camera and the Bellwright leave through the window opening, not through stone', () => {
  const { louverX, louverZ, louverY, sill } = S.BELFRY;
  const crossing = (path) => { for (let i = 1; i < path.length; i++) if (path[i - 1][0] < louverX && path[i][0] >= louverX) return path[i]; return null; };
  const cam = crossing(frames.map((t) => S.cameraAt(t).pos));
  assert.ok(cam, 'the camera goes out through the window');
  assert.ok(Math.abs(cam[2]) < louverZ - 0.3 && cam[1] > sill + 0.3 && cam[1] < louverY[1], `camera crosses at z ${cam[2].toFixed(2)}, y ${cam[1].toFixed(2)}`);
  const bw = crossing(Array.from({ length: 200 }, (_, i) => S.rootB(S.EV.contact + i * 0.005)));
  assert.ok(bw && Math.abs(bw[2]) < louverZ && bw[1] > sill + 0.5, 'the Bellwright clears the sill');
  const louvers = S.BEATS.find(([b]) => b === 'Louvers go')[1], through = S.BEATS.find(([b]) => b === 'Through the window')[1];
  assert.ok(louvers < through, 'the ring opens the window before he reaches it');
});

test('the lens never enters geometry or a character', () => {
  const { radius, pillars, pillarW, height, shaftR } = S.BELFRY, towers = S.city();
  for (const t of frames) {
    const { pos: p, W } = S.cameraAt(t), r = Math.hypot(p[0], p[2]);
    if (p[1] < height) for (let k = 0; k < pillars; k++) {
      const a = ((22.5 + 45 * k) * Math.PI) / 180;
      assert.ok(Math.hypot(p[0] - radius * Math.cos(a), p[2] - radius * Math.sin(a)) > pillarW * 0.71 + 0.15, `t ${t.toFixed(2)}: clear of pillar ${k}`);
    }
    if (r < shaftR + 1.5) assert.ok(p[1] > 0.15, `t ${t.toFixed(2)}: above the flood line inside the tower`);
    for (const tw of towers) assert.ok(Math.hypot(p[0] - tw.x, p[2] - tw.z) > tw.w / 2 + 2 || p[1] > tw.top + tw.w, `t ${t.toFixed(2)}: clear of a city tower`);
    for (const who of ['L', 'B']) for (const j of Object.values(S.bodyAt(who, W).joints)) assert.ok(S.len(S.sub(p, j.p)) > 0.45, `t ${t.toFixed(2)}: clear of the ${who === 'L' ? 'Listener' : 'Bellwright'}`);
    assert.ok(S.len(S.sub(p, S.bellAt(W))) > S.BELL.radius + 0.4, `t ${t.toFixed(2)}: clear of the bell`);
  }
});

test('screen direction holds across every cut: the action line keeps its side of the frame', () => {
  // which side of the frame east (the Listener -> Bellwright axis) points to; near 0 means the lens looks down the line
  const side = (t) => { const c = S.cameraAt(t), f = S.norm(S.sub(c.target, c.pos)); return -f[2] / Math.hypot(f[0], f[2]); };
  for (const cut of S.CUTS) {
    const before = side(cut - 1e-3), after = side(cut + 1e-3);
    if (Math.abs(before) < 0.2 || Math.abs(after) < 0.2) continue; // a cut from or to the line itself is free
    assert.equal(Math.sign(after), Math.sign(before), `cut at ${cut} s keeps east on the ${before > 0 ? 'right' : 'left'}`);
  }
});

test('the Listener flies on real gravity, and nobody stands in the water', () => {
  const h = 1e-3;
  for (let W = S.EV.takeoff + 0.05; W < S.EV.land - 0.05; W += 0.1) {
    const a = (S.rootL(W + h)[1] - 2 * S.rootL(W)[1] + S.rootL(W - h)[1]) / (h * h);
    assert.ok(Math.abs(a + 9.8) < 0.05, `vertical acceleration ${a.toFixed(2)} m/s² at W ${W.toFixed(2)}`);
  }
  for (const W of [0, 0.5, S.EV.launch]) for (const f of ['ftL', 'toeL']) assert.ok(S.bodyAt('L', W).joints[f].p[1] > -0.05, `Listener's ${f} above the floor at W ${W}`);
  for (const W of [0, 1, 2.4, S.EV.contact]) for (const f of ['ftL', 'ftR']) assert.ok(S.bodyAt('B', W).joints[f].p[1] > -0.05, `Bellwright's ${f} above the floor at W ${W}`);
});
