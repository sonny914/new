/* Unit tests for the scene engine's pure functions and the story data. Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, sceneAt, resolvePoses, poseAt, resolveLink, linkAt, cameraAt, copyAt, project, ease, clamp } from '../assets/story/engine.js';
import { SCENES, OBJECTS, LINKS, CAMERA, PACKET, BAND, heroAt, onSlab } from '../assets/story/story.js';
const CTX = { W: 1440, H: 800, mobile: false, pointer: { x: 0, y: 0 } };

const tl = buildTimeline(SCENES);

test('timeline covers 0..1 contiguously in scene order', () => {
  assert.equal(tl[0].start, 0);
  assert.ok(Math.abs(tl[tl.length - 1].end - 1) < 1e-9);
  for (let i = 1; i < tl.length; i++) assert.equal(tl[i].start, tl[i - 1].end);
});

test('sceneAt maps t to the right scene and local progress', () => {
  assert.deepEqual(sceneAt(tl, 0), { i: 0, u: 0 });
  const mid = (tl[3].start + tl[3].end) / 2;
  const r = sceneAt(tl, mid); assert.equal(r.i, 3); assert.ok(Math.abs(r.u - 0.5) < 1e-9);
  assert.equal(sceneAt(tl, 1).i, SCENES.length - 1); assert.equal(sceneAt(tl, 1).u, 1);
  assert.equal(sceneAt(tl, 5).i, SCENES.length - 1); // clamped
});

test('ease and clamp are bounded and monotonic', () => {
  assert.equal(ease(0), 0); assert.equal(ease(1), 1);
  let prev = 0; for (let k = 0; k <= 1; k += 0.05) { const e = ease(k); assert.ok(e >= prev - 1e-12); prev = e; }
  assert.equal(clamp(-1), 0); assert.equal(clamp(2), 1);
});

test('poses inherit forward when a scene defines nothing', () => {
  const r = resolvePoses(OBJECTS.api, SCENES, false);
  const iFr = SCENES.findIndex((s) => s.id === 'friction'), iUn = SCENES.findIndex((s) => s.id === 'understand');
  assert.equal(r[iFr].x, r[iUn].x); assert.equal(r[iFr].y, r[iUn].y);
  const p = poseAt(r, iFr, 0.9); assert.equal(p.k, 1);
});

test('a pose tweens across its window and holds after it', () => {
  const r = resolvePoses(OBJECTS.email, SCENES, false);
  const i = SCENES.findIndex((s) => s.id === 'understand');
  const before = poseAt(r, i, 0, BAND, CTX), during = poseAt(r, i, BAND / 2, BAND, CTX), after = poseAt(r, i, BAND + 0.01, BAND, CTX);
  assert.equal(before.x, poseAt(r, i - 1, 1, BAND, CTX).x);
  assert.ok(during.x !== before.x && during.x !== after.x);
  assert.equal(after.x, r[i].x); assert.equal(after.k, 1);
});

test('an explicit `at` window delays the tween into the hold', () => {
  const r = resolvePoses(OBJECTS.sheetGhost, SCENES, false);
  const i = SCENES.findIndex((s) => s.id === 'friction');
  assert.equal(poseAt(r, i, 0.1).o, 0);          // still hidden before its window
  assert.ok(poseAt(r, i, 0.29).o > 0 && poseAt(r, i, 0.29).o < 0.92);
  assert.equal(poseAt(r, i, 0.5).o, 0.92);
});

test('mobile geometry is used when present and never falls back to desktop x/y silently', () => {
  Object.entries(OBJECTS).forEach(([id, o]) => {
    Object.entries(o.poses).forEach(([sc, p]) => {
      if (typeof p.d === 'function') { assert.equal(typeof p.m, 'function', `${id}.${sc} has a desktop pose function but no mobile one`); return; }
      if (p.d && (p.d.x !== undefined)) assert.ok(p.m && p.m.x !== undefined, `${id}.${sc} has desktop geometry but no mobile geometry`);
    });
  });
  const d = resolvePoses(OBJECTS.sheet, SCENES, false), m = resolvePoses(OBJECTS.sheet, SCENES, true);
  assert.notEqual(d[1].x, m[1].x);
});

test('every object ends the story with a pose in the doors scene or fades out before it', () => {
  Object.entries(OBJECTS).forEach(([id, o]) => {
    const r = resolvePoses(o, SCENES, false);
    const last = r[r.length - 1];
    assert.ok(last.o === 0 || o.poses.doors, `${id} has no doors pose and is still visible`);
  });
});

test('scene 01 poses are functions of the hero orientation and lift off into flat 2D by scene 02', () => {
  const r = resolvePoses(OBJECTS.sheet, SCENES, false);
  const start = poseAt(r, 0, 0, BAND, CTX), end = poseAt(r, 0, 1, BAND, CTX);
  assert.ok(start.rx > 40 && start.ry < 0, 'lies on a tilted slab');
  assert.ok(Math.abs(start.z - end.z) > 20, 'the layers lift apart through the scene');
  const flat = poseAt(r, 1, 1, BAND, CTX);
  assert.equal(flat.rx, 0); assert.equal(flat.ry, 0); assert.equal(flat.z, 0);
  const mid = poseAt(r, 1, BAND / 2, BAND, CTX);
  assert.ok(mid.rx > 0 && mid.rx < end.rx, 'rotation tweens out, it does not snap');
});

test('hero orientation responds to progress and to the pointer', () => {
  const a = heroAt(0, false), b = heroAt(1, false), c = heroAt(1, false, { x: 1, y: 0 });
  assert.ok(b.gap > a.gap && b.ry > a.ry);
  assert.ok(c.ry > b.ry);
  const p = onSlab(0, 0, 0, 1, 1, CTX), q = onSlab(2, 0, 0, 1, 1, CTX);
  assert.ok(p.z > q.z, 'slab 0 sits above slab 2');
});

test('the interruption flings every artifact off the stage', () => {
  const iN = SCENES.findIndex((s) => s.id === 'nothing');
  ['email', 'sheet', 'human', 'approval', 'db', 'doc', 'api'].forEach((id) => {
    const p = poseAt(resolvePoses(OBJECTS[id], SCENES, false), iN, 1, BAND, CTX);
    assert.ok(Math.abs(p.x) > 60 || Math.abs(p.y) > 55, `${id} is still on stage`);
  });
});

test('links resolve, fade between states and draw progressively', () => {
  const link = LINKS.find((l) => l.id === 'email-sheet');
  const r = resolveLink(link, SCENES);
  const iU = SCENES.findIndex((s) => s.id === 'understand');
  assert.equal(r[0].state, 'hidden'); assert.equal(r[iU].state, 'draw');
  const early = linkAt(r, link.order, iU, 0.05), late = linkAt(r, link.order, iU, 0.6);
  assert.equal(early.style, 'draw'); assert.ok(early.draw === 0); assert.equal(late.style, 'draw'); assert.equal(late.draw, 1);
  const iP = SCENES.findIndex((s) => s.id === 'pressure');
  assert.equal(linkAt(r, link.order, iP, 0.9).opacity, 0);
  const iD = SCENES.findIndex((s) => s.id === 'doors');
  assert.equal(r[iD].state, 'hidden'); // inherited
});

test('links only join objects that exist and the packet path is a chain of existing objects', () => {
  LINKS.forEach((l) => { assert.ok(OBJECTS[l.from], l.from); assert.ok(OBJECTS[l.to], l.to); });
  PACKET.path.forEach((id) => assert.ok(OBJECTS[id]));
  Object.keys(PACKET.runs).forEach((sc) => assert.ok(SCENES.some((s) => s.id === sc)));
});

test('camera is locked across the lenticular scenes and depth projects near objects more', () => {
  const iF = SCENES.findIndex((s) => s.id === 'friction'), iI = SCENES.findIndex((s) => s.id === 'intervene');
  const endF = cameraAt(CAMERA, SCENES, iF, 1, false), startI = cameraAt(CAMERA, SCENES, iI, 0, false), endI = cameraAt(CAMERA, SCENES, iI, 1, false);
  assert.deepEqual(endF, startI); assert.deepEqual(startI, endI); // the lens plates must match the world at both swaps
  const near = project({ x: 10, y: 0, s: 1 }, { x: 0, y: 0, s: 1.2 }, 0.8), far = project({ x: 10, y: 0, s: 1 }, { x: 0, y: 0, s: 1.2 }, 0.3);
  assert.ok(near.x > far.x && near.s > far.s);
});

test('copy: first scene visible at rest, last scene never fades out, middle scenes fade', () => {
  assert.equal(copyAt(0, 0, 7).opacity, 1);
  assert.equal(copyAt(6, 1, 7).opacity, 1);
  assert.equal(copyAt(3, 0, 7).opacity, 0); assert.equal(copyAt(3, 0.5, 7).opacity, 1); assert.equal(copyAt(3, 1, 7).opacity, 0);
});
