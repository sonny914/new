import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';
import {prepareProject} from '../src/engine/config/prepare';
import {approximateMeasure, layoutProject} from '../src/engine/layout';
import type {Prepared} from '../src/engine/types';
import {PRESETS} from '../src/presets';

const ROOT = path.resolve(import.meta.dirname, '..');
const showcase = () => JSON.parse(readFileSync(path.join(ROOT, 'projects/simplicity-is-a-viewpoint/project.json'), 'utf8'));
const errors = (raw: unknown) => prepareProject(raw, {presets: PRESETS}).issues.filter((i) => i.level === 'error');
const prepared = (raw: unknown) => {
  const r = prepareProject(raw, {presets: PRESETS});
  assert.deepEqual(r.issues.filter((i) => i.level === 'error'), []);
  return r as Prepared;
};

describe('every project in projects/ validates and lays out', () => {
  for (const dir of readdirSync(path.join(ROOT, 'projects'))) {
    const file = path.join(ROOT, 'projects', dir, 'project.json');
    if (!existsSync(file)) continue;
    it(dir, () => {
      const raw = JSON.parse(readFileSync(file, 'utf8'));
      const r = prepareProject(raw, {presets: PRESETS, fileExists: (rel) => rel.startsWith('assets/generated/') || existsSync(path.join(ROOT, 'projects', dir, rel))});
      assert.deepEqual(r.issues.filter((i) => i.level === 'error'), []);
      const lay = layoutProject(r as Prepared, PRESETS, approximateMeasure);
      assert.deepEqual(lay.issues, []);
      assert.equal(raw.id, dir, 'folder name must equal project id');
    });
  }
});

describe('validation messages point at the problem', () => {
  it('suggests the closest preset name', () => {
    const raw = showcase();
    raw.layers[0].preset = 'GridAsembly';
    const e = errors(raw);
    assert.equal(e.length, 1);
    assert.match(e[0].where, /layers\[0 "lattice"\]\.preset/);
    assert.match(e[0].message, /Did you mean "GridAssembly"/);
  });
  it('checks params against the preset schema, with the path', () => {
    const raw = showcase();
    raw.layers[1].params.size = 'huge';
    const e = errors(raw);
    assert.ok(e.some((i) => /layers\[1 "headline"\]\.params\.size/.test(i.where)), JSON.stringify(e));
  });
  it('rejects unknown keys (typos do not pass silently)', () => {
    const raw = showcase();
    raw.layers[1].params.colour = 'accent';
    assert.ok(errors(raw).some((i) => /Unrecognized key.*colour/.test(i.message)));
  });
  it('reports unknown scene references in times', () => {
    const raw = showcase();
    raw.layers[3].from = 's9';
    assert.ok(errors(raw).some((i) => /scene/.test(i.message) && /s1, s2, s3, s4, s5/.test(i.message)));
  });
  it('reports unknown paths and groups', () => {
    const raw = showcase();
    raw.layers.find((l: {id: string}) => l.id === 'point').params.path = 'nowhere';
    raw.layers[0].group = 'nope';
    const e = errors(raw);
    assert.ok(e.some((i) => /Unknown path "nowhere"/.test(i.message)));
    assert.ok(e.some((i) => /Unknown group "nope"/.test(i.message)));
  });
  it('reports duplicate ids, inverted scenes and group loops', () => {
    const raw = showcase();
    raw.layers[2].id = raw.layers[1].id;
    raw.scenes[1].end = 10;
    raw.groups.world.parent = 'clutter';
    const e = errors(raw).map((i) => i.message).join('\n');
    assert.match(e, /Duplicate layer id/);
    assert.match(e, /ends .* before it starts/);
    assert.match(e, /loop/);
  });
  it('reports missing audio files when it can check the disk', () => {
    const raw = showcase();
    raw.audio.tracks.push({id: 'voice', src: 'assets/voice.wav'});
    const r = prepareProject(raw, {presets: PRESETS, fileExists: () => false});
    assert.ok(r.issues.some((i) => /Missing audio file "assets\/voice.wav"/.test(i.message)));
  });
  it('brand presets need a theme with a logo', () => {
    const raw = showcase();
    raw.theme = 'studio-paper';
    assert.ok(errors(raw).some((i) => /BrandLockup draws the brand logo/.test(i.message)));
  });
});

describe('layout', () => {
  it('resolves anchors across layers and paths (the point lands after VIEWPOINT)', () => {
    const prep = prepared(showcase());
    const lay = layoutProject(prep, PRESETS, approximateMeasure);
    assert.deepEqual(lay.issues, []);
    const end = lay.anchors['viewpoint.inkEnd'];
    const key = lay.paths['accent-pass'].keys[3];
    assert.equal(key.x, end.x + 26);
    assert.equal(key.y, end.y - 16);
    assert.ok(lay.anchors['lockup.markCenter']);
  });
  it('detects circular anchor references', () => {
    const raw = showcase();
    const head = raw.layers.find((l: {id: string}) => l.id === 'headline');
    head.params.y = '@viewpoint.top-40';
    const lay = layoutProject(prepared(raw), PRESETS, approximateMeasure);
    assert.ok(lay.issues.some((i) => /Circular references/.test(i.message)), JSON.stringify(lay.issues));
  });
});
