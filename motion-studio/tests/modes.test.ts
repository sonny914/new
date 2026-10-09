// Input modes produce drafts that validate as written. The voice test synthesises speech locally
// with FFmpeg's flite voice (a test fixture only; never shipped in a video).
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {after, describe, it} from 'node:test';
import {alignLines, fromIdea, fromScript, fromVoice, speechSegments} from '../scripts/lib/modes';
import {prepareProject} from '../src/engine/config/prepare';
import {approximateMeasure, layoutProject} from '../src/engine/layout';
import type {Prepared} from '../src/engine/types';
import {PRESETS} from '../src/presets';

const valid = (raw: unknown) => {
  const r = prepareProject(raw, {presets: PRESETS});
  assert.deepEqual(r.issues.filter((i) => i.level === 'error'), [], JSON.stringify(r.issues, null, 1));
  assert.deepEqual(layoutProject(r as Prepared, PRESETS, approximateMeasure).issues, []);
  return r as Prepared;
};

describe('script mode', () => {
  it('turns blocks into timed scenes and ends on the brand', () => {
    const cfg = fromScript('AUTOMATE\nTHE COORDINATION.\n\nPRESERVE\nTHE HUMAN.', {id: 'zz-script-test', format: 'portrait'});
    const prep = valid(cfg);
    assert.deepEqual(prep.scenes.map((s) => s.id), ['b1', 'b2', 'sign']);
    assert.ok(prep.scenes[0].to - prep.scenes[0].from >= 60, 'two short lines still get at least 2 s');
    assert.match(cfg.assumptions!.join(' '), /estimated from reading speed/);
  });
  it('skips the lockup for themes without a logo', () => {
    const prep = valid(fromScript('ONE\n\nTWO', {id: 'zz-script-paper', theme: 'studio-paper'}));
    assert.ok(!prep.layers.some((l) => l.preset === 'BrandLockup'));
  });
});

describe('idea mode', () => {
  it('writes a narrative structure with TODO copy, not invented copy', () => {
    const cfg = fromIdea('meeting notes nobody reads', {id: 'zz-idea-test'});
    valid(cfg);
    assert.deepEqual(cfg.scenes.slice(0, 4).map((s) => s.title), ['HOOK', 'TENSION', 'TURN', 'REVEAL']);
    assert.ok(cfg.layers.filter((l) => l.preset === 'KineticHeadline').every((l) => (l.params as {text: string}).text === 'TODO'));
  });
});

describe('voice mode', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'qb-voice-'));
  after(() => rmSync(dir, {recursive: true, force: true}));
  const hasFlite = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'flite=text=x', '-t', '0.1', '-f', 'null', '-']).status === 0;

  it('cuts scenes at measured pauses', {skip: !hasFlite && 'ffmpeg without flite'}, () => {
    const parts = ['Automate the coordination.', 'Preserve the human.'].map((t, i) => {
      const f = path.join(dir, `p${i}.wav`);
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `flite=text='${t}':voice=slt`, '-ar', '48000', '-ac', '1', f]);
      return f;
    });
    const gap = path.join(dir, 'gap.wav');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '0.8', gap]);
    const voice = path.join(dir, 'voice.wav');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', parts[0], '-i', gap, '-i', parts[1], '-filter_complex', '[0][1][2]concat=n=3:v=0:a=1', voice]);
    const {segments, duration} = speechSegments(voice);
    assert.equal(segments.length, 2, JSON.stringify(segments));
    assert.ok(segments[1].start > segments[0].end + 0.5, 'the 0.8 s pause separates the phrases');
    const {config, asset} = fromVoice(voice, 'AUTOMATE THE COORDINATION.\nPRESERVE THE HUMAN.', {id: 'zz-voice-test'});
    const prep = prepareProject(config, {presets: PRESETS});
    assert.deepEqual(prep.issues.filter((i) => i.level === 'error'), []);
    assert.equal(asset.to, 'assets/voice.wav');
    const p2 = (prep as Prepared).scenes.find((s) => s.id === 'p2')!;
    assert.ok(Math.abs(p2.from / 30 - (segments[1].start - 0.1)) < 0.05, 'scene 2 starts 3 frames before its phrase');
    assert.ok(duration > 3);
    assert.match(config.assumptions!.join(' '), /no word-level timestamps/);
  });

  it('merges or splits phrases to fit the script, and says so', () => {
    const segs = [
      {start: 0, end: 1},
      {start: 1.1, end: 2},
      {start: 3, end: 4},
    ];
    const merged = alignLines(segs, 2);
    assert.deepEqual(merged.segments, [
      {start: 0, end: 2},
      {start: 3, end: 4},
    ]);
    assert.match(merged.note!, /merged/);
    const split = alignLines(segs.slice(0, 1), 2);
    assert.equal(split.segments.length, 2);
    assert.match(split.note!, /estimates, not measurements/);
  });
});
