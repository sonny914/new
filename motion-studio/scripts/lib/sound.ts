// Resolve a project's cue sheets to timed cues (expanding synced cues from layer events) and
// write each as a WAV next to the project, where the audio track picks it up.
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {DEFAULTS, synthesize, wav, type Cue} from '../../src/engine/audio/synth';
import {resolveTime} from '../../src/engine/time';
import type {Prepared} from '../../src/engine/types';
import {PRESETS} from '../../src/presets';
import {rng} from '../../src/utils/random';
import type {LoadedProject} from './project';

export function resolveCues(prep: Prepared, sheetId: string): Cue[] {
  const sheet = prep.project.audio.synth[sheetId];
  const fps = prep.fps;
  const vary = rng(`${prep.project.id}:${sheetId}`);
  const cues: Cue[] = [];
  for (const c of sheet.cues) {
    const d = DEFAULTS[c.sound];
    const at = resolveTime(c.at, prep.time);
    const base: Cue = {
      time: at / fps,
      sound: c.sound,
      gain: c.gain ?? d.gain,
      pitch: c.pitch ?? d.pitch,
      duration: (c.duration ?? d.duration * fps) / fps,
      until: c.until !== undefined ? resolveTime(c.until, prep.time) / fps : undefined,
      pan: c.pan ?? 0,
    };
    if (!c.sync) {
      cues.push(base);
      continue;
    }
    const layer = prep.layers.find((l) => l.id === c.sync!.layer)!;
    const def = PRESETS[layer.preset];
    const events = (def.events?.(layer.params as never, {t: (e) => resolveTime(e, prep.time), fps, theme: prep.theme}, layer) ?? [])
      .filter((f) => f >= at)
      .sort((a, b) => a - b)
      .filter((_, i) => i % c.sync!.every === 0)
      .slice(0, c.sync.max ?? Infinity);
    // Small seeded variation keeps a run of synced clicks from sounding like a machine gun.
    for (const f of events) cues.push({...base, time: f / fps, pitch: base.pitch * (0.85 + vary() * 0.3), gain: base.gain * (0.8 + vary() * 0.4), pan: base.pan + (vary() - 0.5) * 0.6});
  }
  return cues.sort((a, b) => a.time - b.time);
}

export function writeSounds(p: LoadedProject, prep: Prepared): {file: string; cues: number; peak: number}[] {
  const used = new Set(prep.project.audio.tracks.map((t) => t.synth).filter(Boolean) as string[]);
  const out: {file: string; cues: number; peak: number}[] = [];
  for (const id of used) {
    const cues = resolveCues(prep, id);
    const r = synthesize(cues, prep.duration / prep.fps + 0.5, 48000, `${prep.project.id}:${id}`);
    const file = path.join(p.dir, 'assets', 'generated', `${id}.wav`);
    mkdirSync(path.dirname(file), {recursive: true});
    writeFileSync(file, wav(r));
    out.push({file, cues: cues.length, peak: r.peak});
  }
  return out;
}
