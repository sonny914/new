import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {remap} from '../src/engine/remap';
import {cubicBezier, ease, progress} from '../src/engine/easing';
import {resolveFormat, contentBox} from '../src/engine/formats';
import {closestApproach, samplePath, sampleTrack} from '../src/engine/keyframes';
import {resolvePos} from '../src/engine/position';
import {resolveTime, timecode} from '../src/engine/time';
import {quietBands} from '../src/themes/quiet-bands/tokens';
import {rng} from '../src/utils/random';

const ctx = {fps: 30, duration: 450, scenes: {s1: {start: 0, end: 90}, s3: {start: 180, end: 270}, 'intro-a': {start: 10, end: 20}}};

describe('easing', () => {
  it('matches CSS cubic-bezier endpoints and is monotonic for the brand curves', () => {
    for (const curve of Object.values(quietBands.motion.easing)) {
      const f = cubicBezier(...curve);
      assert.equal(f(0), 0);
      assert.equal(f(1), 1);
      let prev = 0;
      for (let t = 0.01; t <= 1; t += 0.01) {
        const v = f(t);
        assert.ok(v >= prev - 1e-9, `not monotonic at ${t}`);
        prev = v;
      }
    }
  });
  it('ease-out (.23,1,.32,1) is front-loaded; the derived ease-in mirrors it', () => {
    const out = ease(quietBands, 'out');
    const inn = ease(quietBands, 'in');
    assert.ok(out(0.5) > 0.9, `out(0.5) = ${out(0.5)}`);
    for (const t of [0.1, 0.3, 0.5, 0.8]) assert.ok(Math.abs(inn(t) - (1 - out(1 - t))) < 1e-4);
  });
  it('accepts cubic-bezier() strings and step; rejects unknown names', () => {
    assert.ok(Math.abs(ease(quietBands, 'cubic-bezier(0,0,1,1)')(0.37) - 0.37) < 1e-6);
    assert.equal(ease(quietBands, 'step')(0.99), 0);
    assert.throws(() => ease(quietBands, 'bouncy'), /Unknown easing/);
  });
  it('progress clamps and handles zero duration', () => {
    assert.equal(progress(5, 10, 10), 0);
    assert.equal(progress(25, 10, 10), 1);
    assert.equal(progress(10, 10, 0), 1);
  });
});

describe('time expressions', () => {
  const cases: [string | number, number][] = [
    [48, 48],
    ['48', 48],
    ['12f', 12],
    ['1.6s', 48],
    ['s3', 180],
    ['s3.end', 270],
    ['s3+8', 188],
    ['s3-8', 172],
    ['s3+0.5s', 195],
    ['s3.end-0.25s', 263],
    ['intro-a+4', 14],
    ['start-8', -8],
    ['end', 450],
    ['end-1s', 420],
  ];
  for (const [expr, want] of cases) it(`${JSON.stringify(expr)} → ${want}`, () => assert.equal(resolveTime(expr, ctx), want));
  it('names the scenes when a reference is unknown', () => {
    assert.throws(() => resolveTime('s9+2', ctx), /known scene.*s1, s3, intro-a/);
    assert.throws(() => resolveTime('1.5m', ctx), /offset/);
  });
  it('formats timecode', () => assert.equal(timecode(195, 30), '0:06.15'));
});

describe('positions', () => {
  const f = resolveFormat('story');
  const anchors = {'title.end': {x: 700, y: 820}};
  const pc = {format: f, anchors};
  it('resolves px, percent, centre, safe edges, anchors and offsets', () => {
    assert.equal(resolvePos(540, 'x', pc), 540);
    assert.equal(resolvePos('50%', 'y', pc), 960);
    assert.equal(resolvePos('center', 'x', pc), 540);
    assert.equal(resolvePos('safe.left+24', 'x', pc), 120);
    assert.equal(resolvePos('safe.bottom', 'y', pc), 1520);
    assert.equal(resolvePos('safe.cy', 'y', pc), contentBox(f).cy);
    assert.equal(resolvePos('@title.end+26', 'x', pc), 726);
    assert.equal(resolvePos('@title.end-16', 'y', pc), 804);
    assert.equal(resolvePos('center+10%', 'x', pc), 648);
  });
  it('explains a missing anchor, listing what the layer does publish', () => {
    assert.throws(() => resolvePos('@title.start', 'x', pc), /publishes: @title\.end/);
    assert.throws(() => resolvePos('@nobody.end', 'x', pc), /not available/);
  });
});

describe('keyframes and paths', () => {
  it('holds before the first and after the last key', () => {
    const keys = [
      {frame: 10, value: 1},
      {frame: 20, value: 2, ease: 'linear' as const},
    ];
    assert.equal(sampleTrack(quietBands, keys, 0), 1);
    assert.equal(sampleTrack(quietBands, keys, 15), 1.5);
    assert.equal(sampleTrack(quietBands, keys, 99), 2);
  });
  it('bends through a control point', () => {
    const keys = [
      {frame: 0, x: 0, y: 0},
      {frame: 10, x: 100, y: 0, via: {x: 50, y: 100}, ease: 'linear' as const},
    ];
    const mid = samplePath(quietBands, keys, 5);
    assert.equal(mid.x, 50);
    assert.equal(mid.y, 50);
  });
  it('finds when a path passes closest to each target, within a window', () => {
    const keys = [
      {frame: 0, x: 0, y: 0},
      {frame: 100, x: 1000, y: 0, ease: 'linear' as const},
      {frame: 200, x: 0, y: 0, ease: 'linear' as const},
    ];
    const [a] = closestApproach(quietBands, keys, [{x: 300, y: 40}], {to: 100});
    assert.equal(a.frame, 30);
    assert.equal(a.distance, 40);
    const [b] = closestApproach(quietBands, keys, [{x: 300, y: 40}], {from: 100});
    assert.equal(b.frame, 170);
  });
});

describe('group time remap', () => {
  it('freezes, then resumes from where it stopped', () => {
    const t = {freezeAt: 100, resumeAt: 130};
    assert.equal(remap(90, t), 90);
    assert.equal(remap(115, t), 100);
    assert.equal(remap(140, t), 110);
    assert.equal(remap(500, {freezeAt: 100}), 100);
  });
});

describe('seeded randomness', () => {
  it('is deterministic per seed', () => {
    const a = rng('x');
    const b = rng('x');
    for (let i = 0; i < 20; i++) assert.equal(a(), b());
    assert.notEqual(rng('x')(), rng('y')());
  });
});
