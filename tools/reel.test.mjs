// The reel system: the config resolves with every preset, time references land where they say, and the score is
// exactly the reel's length. Rendering itself is checked by eye (npm run reel:preview).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import config from './reel/reel.config.js';
import { PRESETS, resolveConfig } from './reel/engine/presets.js';
import { plan } from './reel/engine/timeline.js';
import { score } from './reel/engine/score.mjs';

test('the approved design is the default', () => {
  assert.equal(config.preset, 'one-idea');
  const p = plan(resolveConfig(config));
  assert.deepEqual(p.steps.map((s) => [s.to, s.morph, s.at, +s.land.toFixed(2)]), [
    ['core', 'converge', 0, 0.95], ['sphere', 'bloom', 2.4, 3.25], ['torus', 'stretch', 3.9, 5.1], ['logo', 'scatter', 6, 7.15]]);
});

for (const name of Object.keys(PRESETS)) test(`preset ${name}: the logo turns, then holds front-on for at least a second`, () => {
  const cfg = resolveConfig({ ...config, preset: name }), p = plan(cfg);
  assert.equal(p.steps[3].to, 'logo');
  assert.equal(cfg.logo.src, '/assets/brand/mark.svg');
  assert.ok(p.time(cfg.logo.front) > p.steps[3].land, 'front comes after the logo lands');
  assert.ok(cfg.duration - p.time(cfg.logo.front) >= 1, 'hold is under a second');
  for (const k of ['pitch', 'roll']) assert.equal(p.keys(cfg.camera.keys[k]).at(-1)[1], 0, `${k} must be 0 for the front-on hold`);
});

test('time references resolve against the sequence', () => {
  const p = plan(resolveConfig(config));
  assert.equal(p.time(1.5), 1.5);
  assert.equal(p.time('s2'), 2.4);
  assert.equal(+p.time('s3.land-0.4').toFixed(2), 4.7);
  assert.equal(p.time('end'), config.duration);
  assert.equal(+p.time('settle').toFixed(2), 8.75); // the logo's front-on moment
  assert.equal(+p.time('settle-0.15').toFixed(2), 8.6); // the approved end-title timing, unchanged
  assert.throws(() => p.time('s9'), /4 steps/);
  assert.throws(() => p.time('soon'), /bad time reference/);
});

for (const name of Object.keys(PRESETS)) {
  test(`preset ${name}: four steps in order, copy inside the reel, score exactly ${config.duration} s`, () => {
    const cfg = resolveConfig({ ...config, preset: name });
    const p = plan(cfg);
    assert.equal(p.steps.length, 4);
    p.steps.forEach((s, j) => j && assert.ok(s.at >= p.steps[j - 1].land, `step ${j + 1} starts before step ${j} lands`));
    for (const c of cfg.copy) assert.ok(p.time(c.in) < p.time(c.out) && p.time(c.out) <= cfg.duration, c.text);
    assert.ok(p.time(cfg.end.in) < cfg.duration - 1, 'end title gets at least a second');
    const wav = score(cfg, 8000);
    assert.equal((wav.length - 44) / 4, cfg.duration * 8000);
  });
}
