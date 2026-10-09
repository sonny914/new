// Reference analysis on a synthetic clip with known structure: three one-second shots joined by
// hard cuts, the middle one moving, the last one still.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdtempSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {after, describe, it} from 'node:test';
import {analyse} from '../scripts/lib/reference';

describe('reference analysis', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'qb-ref-'));
  after(() => rmSync(dir, {recursive: true, force: true}));
  it('finds the cuts, the still shot and writes the three-part report', () => {
    const clip = path.join(dir, 'clip.mp4');
    execFileSync('ffmpeg', [
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', 'color=c=black:s=320x568:r=30:d=1',
      '-f', 'lavfi', '-i', 'testsrc2=s=320x568:r=30:d=1',
      '-f', 'lavfi', '-i', 'color=c=0xF2EEE5:s=320x568:r=30:d=1',
      '-filter_complex', '[0][1][2]concat=n=3:v=1:a=0,format=yuv420p', '-c:v', 'libx264', '-crf', '18', clip,
    ]);
    const r = analyse(clip, path.join(dir, 'out'));
    assert.equal(r.meta.frames, 90);
    assert.deepEqual(r.cuts, [30, 60]);
    assert.equal(r.shots.length, 3);
    assert.ok(r.holds.some((h) => h.from <= 62 && h.to >= 88), JSON.stringify(r.holds));
    for (const f of ['reference.md', 'reference.json', 'shots.png', 'timeline.png', 'energy.svg']) assert.ok(existsSync(path.join(dir, 'out', f)), f);
  });
});
