// Storyboard: the scene table a human reviews before anything renders. Built from the project's
// scene notes plus what the engine actually schedules (layers active per scene, their presets,
// transitions and audio cues), so the document cannot drift from the config.
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {timecode} from '../../src/engine/time';
import type {Prepared} from '../../src/engine/types';
import {restWindows, type TextLayout} from '../../src/presets/typography/textcore';
import {approximateMeasure, layoutProject} from '../../src/engine/layout';
import {PRESETS} from '../../src/presets';
import {resolveCues} from './sound';

export interface StoryboardScene {
  n: number;
  id: string;
  title: string;
  startFrame: number;
  endFrame: number;
  start: string;
  end: string;
  purpose: string;
  content: string;
  composition: string;
  presets: string[];
  layers: string[];
  transition: string;
  audioCue: string;
  cues: string[];
  dependencies: string[];
}

export interface Storyboard {
  id: string;
  title: string;
  format: string;
  fps: number;
  frames: number;
  seconds: number;
  scenes: StoryboardScene[];
  reading: {layer: string; text: string; seconds: number; needed: number; ok: boolean}[];
  assumptions: string[];
}

export function storyboard(prep: Prepared): Storyboard {
  const fps = prep.fps;
  const cues = Object.keys(prep.project.audio.synth).flatMap((id) => resolveCues(prep, id).map((c) => ({...c, sheet: id})));
  const scenes = prep.scenes.map((s, i) => {
    const active = prep.layers.filter((l) => l.from < s.to && l.to > s.from);
    const here = cues.filter((c) => c.time * fps >= s.from && c.time * fps < s.to);
    const counts = new Map<string, number>();
    here.forEach((c) => counts.set(c.sound, (counts.get(c.sound) ?? 0) + 1));
    return {
      n: i + 1,
      id: s.id,
      title: s.title,
      startFrame: s.from,
      endFrame: s.to,
      start: timecode(s.from, fps),
      end: timecode(s.to, fps),
      purpose: s.purpose,
      content: s.content,
      composition: s.composition,
      presets: [...new Set(active.map((l) => l.preset))],
      layers: active.map((l) => l.id),
      transition: s.transition,
      audioCue: s.audioCue,
      cues: [...counts].map(([k, v]) => `${v}× ${k}`),
      dependencies: s.dependencies,
    };
  });
  // Reading time: every text state must rest long enough to be read before it changes.
  const lay = layoutProject(prep, PRESETS, approximateMeasure);
  const reading: Storyboard['reading'] = [];
  for (const l of prep.layers) {
    if (l.preset !== 'KineticHeadline' && l.preset !== 'MaskedTextReveal') continue;
    const d = lay.data[l.id] as TextLayout | undefined;
    if (!d) continue;
    for (const w of restWindows(d, Math.min(l.to, prep.duration))) {
      const words = w.text.trim().split(/\s+/).length;
      const needed = prep.theme.motion.reading.minSeconds * (words > 1 ? 1 : 0.6) + prep.theme.motion.reading.perWord * words;
      const seconds = (w.to - w.from) / fps;
      reading.push({layer: l.id, text: w.text, seconds: Math.round(seconds * 100) / 100, needed: Math.round(needed * 100) / 100, ok: seconds >= needed});
    }
  }
  return {
    id: prep.project.id,
    title: prep.project.title,
    format: `${prep.format.width}×${prep.format.height} (${prep.format.label})`,
    fps,
    frames: prep.duration,
    seconds: prep.duration / fps,
    scenes,
    reading,
    assumptions: prep.project.assumptions,
  };
}

export function storyboardMarkdown(sb: Storyboard): string {
  const lines = [
    `# Storyboard — ${sb.title}`,
    '',
    `Generated from \`project.json\` by \`npm run storyboard\`. Edit the project file, not this page.`,
    '',
    `**${sb.format}** · ${sb.fps} fps · ${sb.frames} frames (${sb.seconds}s)`,
    '',
  ];
  for (const s of sb.scenes) {
    lines.push(
      `## ${s.n}. ${s.title} — ${s.start}–${s.end} (frames ${s.startFrame}–${s.endFrame - 1})`,
      '',
      `| | |`,
      `|---|---|`,
      `| Purpose | ${s.purpose} |`,
      `| Visible content | ${s.content} |`,
      `| Composition | ${s.composition} |`,
      `| Presets | ${s.presets.join(', ')} |`,
      `| Layers | ${s.layers.join(', ')} |`,
      `| Transition out | ${s.transition} |`,
      `| Audio | ${s.audioCue}${s.cues.length ? ` (${s.cues.join(', ')})` : ''} |`,
      `| Depends on | ${s.dependencies.join(', ')} |`,
      '',
    );
  }
  if (sb.reading.length) {
    lines.push('## Reading time', '', '| Layer | Text | Rests | Needs | |', '|---|---|---|---|---|');
    for (const r of sb.reading) lines.push(`| ${r.layer} | ${r.text} | ${r.seconds}s | ${r.needed}s | ${r.ok ? 'ok' : 'short'} |`);
    lines.push('', '_Rest is measured from when the text has fully arrived to when it starts to change or leave. Approximate metrics; the render is the reference._', '');
  }
  if (sb.assumptions.length) lines.push('## Assumptions', '', ...sb.assumptions.map((a) => `- ${a}`), '');
  return lines.join('\n');
}

export function writeStoryboard(prep: Prepared, dir: string) {
  const sb = storyboard(prep);
  writeFileSync(path.join(dir, 'storyboard.md'), storyboardMarkdown(sb));
  return sb;
}
