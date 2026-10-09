// Every preset ships an example. This turns one into a standalone project, so the same example
// is unit-tested, registered as a Studio composition, and rendered into the preset gallery.
import type {ProjectInput} from '../engine/config/schema';
import type {PresetDef} from '../engine/types';

/** A path the examples can ride: a confident left-to-right pass across the content box. */
export const EXAMPLE_PATH = {
  description: 'Example pass for presets that need a path.',
  keys: [
    {at: 6, x: -40, y: 'safe.cy+80'},
    {at: '1.4s', x: 'safe.right', y: 'safe.cy+80', ease: 'inOut'},
  ],
};

export function exampleProject(def: PresetDef, format = 'story'): ProjectInput {
  const id = `example-${def.id.replace(/[A-Z]/g, (c, i) => (i ? '-' : '') + c.toLowerCase())}`;
  return {
    id,
    title: `${def.id} — example`,
    description: def.example.note,
    mode: ['brand'],
    theme: 'quiet-bands',
    format,
    fps: 30,
    duration: def.example.duration,
    scenes: [{id: 's1', start: 0, end: 'end', title: def.id, purpose: def.summary, content: def.example.note}],
    paths: {'example-pass': EXAMPLE_PATH},
    layers: [
      // A reference rule so motion reads against something fixed.
      ...(def.id === 'Accent'
        ? [{id: 'guide', preset: 'LineDraw', params: {from: {x: 'safe.left', y: 'safe.cy+80'}, to: {x: 'safe.right', y: 'safe.cy+80'}, follow: 'example-pass', color: 'rule'}}]
        : []),
      {id: 'example', preset: def.id, from: def.example.from ?? 0, to: def.example.to ?? 'end', params: def.example.params},
    ],
    qa: {allowBlank: [{from: 0, to: 12}], maxBlankRun: 12, allowUnsafe: []},
  } as ProjectInput;
}
