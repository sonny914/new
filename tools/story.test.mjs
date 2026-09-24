/* Unit tests for the scene engine's pure functions and the story data. Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, sceneAt, resolvePoses, poseAt, resolveLink, linkAt, cameraAt, copyAt, project, ease, clamp } from '../assets/story/engine.js';
import { SCENES, OBJECTS, LINKS, CAMERA, PACKET, BAND } from '../assets/story/story.js';

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
  const before = poseAt(r, i, 0), during = poseAt(r, i, BAND / 2), after = poseAt(r, i, BAND + 0.01);
  assert.equal(before.x, r[i - 1].x);
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

test('links resolve, fade between states and draw progressively', () => {
  const link = LINKS.find((l) => l.id === 'email-sheet');
  const r = resolveLink(link, SCENES);
  const iU = SCENES.findIndex((s) => s.id === 'understand');
  assert.equal(r[0].state, 'faint'); assert.equal(r[iU].state, 'draw');
  const early = linkAt(r, link.order, iU, 0.05), late = linkAt(r, link.order, iU, 0.6);
  assert.equal(early.style, 'faint'); assert.equal(late.style, 'draw'); assert.equal(late.draw, 1);
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

test('camera pulls back in the interruption and depth projects near objects more', () => {
  const iN = SCENES.findIndex((s) => s.id === 'nothing');
  const cam = cameraAt(CAMERA, SCENES, iN, 1, false);
  assert.ok(cam.s < 1);
  const near = project({ x: 10, y: 0, s: 1 }, { x: 0, y: 0, s: 1.2 }, 0.8), far = project({ x: 10, y: 0, s: 1 }, { x: 0, y: 0, s: 1.2 }, 0.3);
  assert.ok(near.x > far.x && near.s > far.s);
});

test('copy: first scene visible at rest, last scene never fades out, middle scenes fade', () => {
  assert.equal(copyAt(0, 0, 7).opacity, 1);
  assert.equal(copyAt(6, 1, 7).opacity, 1);
  assert.equal(copyAt(3, 0, 7).opacity, 0); assert.equal(copyAt(3, 0.5, 7).opacity, 1); assert.equal(copyAt(3, 1, 7).opacity, 0);
});
