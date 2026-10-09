import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';
import {plan} from '../scripts/lib/encode';
import {locate} from '../scripts/lib/project';
import {resolveCues} from '../scripts/lib/sound';
import {storyboard, storyboardMarkdown} from '../scripts/lib/storyboard';
import {readBrand} from '../scripts/sync-brand';
import {synthesize, wav} from '../src/engine/audio/synth';
import {prepareProject} from '../src/engine/config/prepare';
import type {Prepared} from '../src/engine/types';
import {PRESETS} from '../src/presets';
import {BRAND} from '../src/themes/quiet-bands/brand.generated';
import {quietBands} from '../src/themes/quiet-bands/tokens';

describe('brand', () => {
  it('the generated vectors match assets/brand/*.svg exactly', () => {
    const fresh = readBrand();
    assert.deepEqual(JSON.parse(JSON.stringify(BRAND)), JSON.parse(JSON.stringify(fresh)), 'run `npm run sync:brand`');
  });
  it('the Quiet Bands theme carries the verified colours and one accent', () => {
    assert.equal(quietBands.color.ground, '#000000');
    assert.equal(quietBands.color.ink, '#F2EEE5');
    assert.equal(quietBands.color.accent, '#FF5A00');
    const css = readFileSync(path.resolve(import.meta.dirname, '../../assets/bulb/entry.css'), 'utf8');
    assert.match(css, /--ease-out:cubic-bezier\(\.23,1,\.32,1\)/);
    assert.match(css, /--live:#FF5A00/);
  });
});

describe('delivery bitrate plan', () => {
  const base = {width: 1080, height: 1920, fps: 30, targetMB: 30, audioKbps: 192, bitsPerPixel: 0.12, hasAudio: true};
  it('short pieces are limited by picture quality, not by the size target', () => {
    const p = plan({...base, durationSec: 15});
    assert.equal(p.videoKbps, p.qualityKbps);
    assert.ok((p.videoKbps + p.audioKbps) * 15 * 125 < 30e6);
  });
  it('long pieces are limited by the size target', () => {
    const p = plan({...base, durationSec: 90});
    assert.equal(p.videoKbps, p.ceilingKbps);
    assert.ok(((p.videoKbps + p.audioKbps) * 90 * 1000) / 8 <= 30e6);
  });
});

describe('audio', () => {
  const cues = [
    {time: 0.1, sound: 'tick' as const, gain: 0.5, pitch: 4000, duration: 0.03, pan: 0},
    {time: 0.2, sound: 'riser' as const, gain: 1, pitch: 800, duration: 1, until: 0.6, pan: 0},
    {time: 0.7, sound: 'tone' as const, gain: 1, pitch: 220, duration: 0.5, pan: 0.3},
  ];
  it('is deterministic and normalised to -1.5 dBFS peak', () => {
    const a = synthesize(cues, 1.5);
    const b = synthesize(cues, 1.5);
    assert.deepEqual(a.left.slice(0, 4800), b.left.slice(0, 4800));
    assert.ok(Math.abs(a.peak - 0.8414) < 1e-6);
  });
  it('the riser stops dead at its cut', () => {
    const r = synthesize(cues.slice(1, 2), 1);
    const after = r.left.slice(Math.round(0.601 * 48000), Math.round(0.69 * 48000));
    assert.ok(after.every((v) => v === 0));
  });
  it('writes a valid 16-bit stereo WAV', () => {
    const buf = wav(synthesize(cues, 0.5));
    assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
    assert.equal(buf.readUInt16LE(22), 2);
    assert.equal(buf.readUInt32LE(24), 48000);
    assert.equal(buf.length, 44 + 24000 * 4);
  });
  it('synced cues land on the layer’s own events', () => {
    const p = locate('simplicity-is-a-viewpoint');
    const prep = prepareProject(p.raw, {presets: PRESETS}) as Prepared;
    const ticks = resolveCues(prep, 'sound').filter((c) => c.sound === 'tick' && c.time >= 70 / 30 && c.time < 168 / 30);
    const events = PRESETS.Accumulation.events!(prep.layers.find((l) => l.id === 'clutter')!.params as never, {t: () => 0, fps: 30, theme: quietBands}, prep.layers[0]);
    assert.ok(ticks.length >= events.length - 1, `${ticks.length} ticks for ${events.length} arrivals`);
  });
});

describe('storyboard', () => {
  it('has every scene with frames, presets and audio, and passes reading time', () => {
    const p = locate('simplicity-is-a-viewpoint');
    const prep = prepareProject(p.raw, {presets: PRESETS}) as Prepared;
    const sb = storyboard(prep);
    assert.deepEqual(
      sb.scenes.map((s) => [s.startFrame, s.endFrame]),
      [
        [0, 90],
        [90, 180],
        [180, 270],
        [270, 360],
        [360, 450],
      ],
    );
    assert.ok(sb.scenes.every((s) => s.presets.length && s.purpose && s.transition));
    assert.ok(sb.reading.length >= 4);
    assert.deepEqual(sb.reading.filter((r) => !r.ok), []);
    assert.match(storyboardMarkdown(sb), /## 4\. The viewpoint — 0:09\.00–0:12\.00/);
  });
});
