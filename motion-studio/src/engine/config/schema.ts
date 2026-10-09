// The project file format. One JSON file describes a whole video: identity, theme, canvas,
// timing, scenes (the storyboard), layers (preset instances on a shared timeline), motion paths,
// camera groups, audio and export targets. Preset params are validated separately against each
// preset's own schema (see engine/config/prepare.ts), so adding a preset never touches this file.
import {z} from 'zod';

const ID = /^[a-z][a-z0-9-]*$/;
const id = (what: string) =>
  z.string().regex(ID, `${what} ids are lowercase letters, digits and hyphens, starting with a letter (e.g. "s1", "headline")`);

export const TimeExprZ = z.union([z.number().nonnegative(), z.string().min(1)], {
  errorMap: () => ({message: 'Expected a time: frames (48), seconds ("1.6s"), or a scene reference ("s3+8", "s3.end-0.5s", "end")'}),
});
export const PosExprZ = z.union([z.number(), z.string().min(1)], {
  errorMap: () => ({message: 'Expected a position: px (540), "50%", "safe.left+24", "center" or an anchor ("@title.end")'}),
});
export const EaseZ = z.union([z.string(), z.tuple([z.number(), z.number(), z.number(), z.number()])]);
export const ColorZ = z.string().min(1);

export const SceneZ = z
  .object({
    id: id('Scene'),
    start: TimeExprZ,
    end: TimeExprZ,
    title: z.string(),
    /** Why the scene exists in the story. */
    purpose: z.string(),
    /** What the viewer sees and reads. */
    content: z.string().default(''),
    /** How the frame is arranged. */
    composition: z.string().default(''),
    /** How this scene hands over to the next. */
    transition: z.string().default(''),
    audioCue: z.string().default(''),
    dependencies: z.array(z.string()).default([]),
  })
  .strict();

export const PathKeyZ = z
  .object({
    at: TimeExprZ,
    x: PosExprZ,
    y: PosExprZ,
    via: z.object({x: PosExprZ, y: PosExprZ}).strict().optional(),
    ease: EaseZ.optional(),
  })
  .strict();

export const PathZ = z.object({description: z.string().default(''), keys: z.array(PathKeyZ).min(1)}).strict();

export const CameraKeyZ = z
  .object({
    at: TimeExprZ,
    scale: z.number().positive().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    rotate: z.number().optional(),
    ease: EaseZ.optional(),
  })
  .strict();

export const GroupZ = z
  .object({
    /** Groups nest: a child inherits its parent's camera and time. */
    parent: z.string().optional(),
    /** Virtual camera: scale (push/pull), x/y (pan), rotate, keyed on the absolute timeline. */
    camera: z.array(CameraKeyZ).optional(),
    /** Point the camera scales about. Defaults to the canvas centre. */
    origin: z.object({x: PosExprZ, y: PosExprZ}).strict().optional(),
    /** Time remap: everything in the group stops at freezeAt and, if resumeAt is set, carries on from where it stopped. */
    time: z.object({freezeAt: TimeExprZ, resumeAt: TimeExprZ.optional()}).strict().optional(),
  })
  .strict();

export const MaskZ = z
  .object({
    shape: z.enum(['circle', 'wipe']),
    at: TimeExprZ,
    duration: z.number().nonnegative().default(16),
    ease: EaseZ.optional(),
    /** circle: centre of the iris. Either a position or a path id (the path's position at `at`). */
    origin: z.union([z.object({x: PosExprZ, y: PosExprZ}).strict(), z.string()]).optional(),
    /** wipe: the direction the edge travels. */
    direction: z.enum(['left', 'right', 'up', 'down']).default('right'),
  })
  .strict();

export const LayerZ = z
  .object({
    id: id('Layer'),
    preset: z.string(),
    /** Mount window. The preset still times its own motion from its params. */
    from: TimeExprZ.default(0),
    to: TimeExprZ.default('end'),
    group: z.string().optional(),
    /** Stacking order; later layers draw on top when equal. */
    z: z.number().default(0),
    /** Parallax: how strongly the group camera's pan and push move this layer (1 = fully). */
    depth: z.number().default(1),
    /** Reveal through a shape (ShapeReveal / MaskTransition) and/or conceal through one. */
    reveal: MaskZ.optional(),
    conceal: MaskZ.optional(),
    note: z.string().default(''),
    params: z.record(z.unknown()).default({}),
  })
  .strict();

export const SynthCueZ = z
  .object({
    at: TimeExprZ,
    sound: z.enum(['tick', 'thump', 'tone', 'air', 'riser']),
    gain: z.number().min(0).max(1).optional(),
    /** Hz for tone/thump, filter cutoff for tick/air. */
    pitch: z.number().positive().optional(),
    /** Length in frames (air, riser, tone tail). */
    duration: z.number().positive().optional(),
    /** For riser: hard stop time (the cut). */
    until: TimeExprZ.optional(),
    pan: z.number().min(-1).max(1).optional(),
    /** Repeat this cue at every event a layer publishes (e.g. each spawn of an Accumulation). */
    sync: z.object({layer: z.string(), every: z.number().int().positive().default(1), max: z.number().int().positive().optional()}).strict().optional(),
  })
  .strict();

export const AudioTrackZ = z
  .object({
    id: id('Audio track'),
    /** A file inside the project folder, e.g. "assets/voice.wav". */
    src: z.string().optional(),
    /** Or a synthesised cue sheet defined under audio.synth. */
    synth: z.string().optional(),
    from: TimeExprZ.default(0),
    to: TimeExprZ.default('end'),
    /** Seconds to skip at the head of the file. */
    trimBefore: z.number().nonnegative().default(0),
    volume: z.number().min(0).max(2).default(1),
    fadeIn: z.number().nonnegative().default(0),
    fadeOut: z.number().nonnegative().default(0),
  })
  .strict()
  .refine((t) => Boolean(t.src) !== Boolean(t.synth), {message: 'An audio track needs exactly one of "src" (a file) or "synth" (a cue sheet id).'});

export const ExportZ = z
  .object({
    /** Delivery file must come in under this size. */
    targetMB: z.number().positive().default(30),
    audioKbps: z.number().positive().default(192),
    /** Quality ceiling for flat-colour motion graphics, in bits per pixel per frame. */
    bitsPerPixel: z.number().positive().default(0.12),
    masterCrf: z.number().min(0).max(51).default(12),
    previewScale: z.number().positive().max(1).default(0.5),
  })
  .strict();

export const QaZ = z
  .object({
    /** Frame ranges where a blank (single-colour) frame is intended. */
    allowBlank: z.array(z.object({from: TimeExprZ, to: TimeExprZ}).strict()).default([]),
    /** Longest run of blank frames tolerated outside allowBlank, in frames. */
    maxBlankRun: z.number().int().nonnegative().default(3),
    /** Deliberate safe-area crossings (a camera push, a bleed). Each needs a reason; QA reports it as intended. */
    allowUnsafe: z.array(z.object({layer: z.string(), from: TimeExprZ, to: TimeExprZ, reason: z.string().min(3)}).strict()).default([]),
  })
  .strict();

export const InputModeZ = z.enum(['idea', 'script', 'reference', 'voice', 'brand', 'hybrid']);

export const ProjectZ = z
  .object({
    $schema: z.string().optional(),
    id: id('Project'),
    title: z.string(),
    description: z.string().default(''),
    mode: z.array(InputModeZ).default(['brand']),
    theme: z.string().default('quiet-bands'),
    format: z
      .union([
        z.string(),
        z.object({width: z.number().int().positive(), height: z.number().int().positive(), safe: z.record(z.number()).optional()}).strict(),
      ])
      .default('story'),
    fps: z.number().int().min(1).max(120).default(30),
    duration: TimeExprZ,
    background: ColorZ.default('ground'),
    scenes: z.array(SceneZ).min(1),
    paths: z.record(PathZ).default({}),
    groups: z.record(GroupZ).default({}),
    layers: z.array(LayerZ).min(1),
    audio: z
      .object({
        tracks: z.array(AudioTrackZ).default([]),
        synth: z.record(z.object({description: z.string().default(''), cues: z.array(SynthCueZ)}).strict()).default({}),
      })
      .strict()
      .default({}),
    export: ExportZ.default({}),
    qa: QaZ.default({}),
    /** Anything the timing or content rests on that was not measured: say it here so it is visible. */
    assumptions: z.array(z.string()).default([]),
  })
  .strict();

export type ProjectInput = z.input<typeof ProjectZ>;
export type Project = z.output<typeof ProjectZ>;
export type Scene = z.output<typeof SceneZ>;
export type Layer = z.output<typeof LayerZ>;
export type Mask = z.output<typeof MaskZ>;
export type PathDef = z.output<typeof PathZ>;
export type GroupDef = z.output<typeof GroupZ>;
export type SynthCue = z.output<typeof SynthCueZ>;
export type AudioTrack = z.output<typeof AudioTrackZ>;

/** Render a zod issue path like layers[3].params.size, naming the layer id when known. */
export function issuePath(pathParts: (string | number)[], raw?: unknown): string {
  let out = '';
  let node: unknown = raw;
  for (const p of pathParts) {
    if (typeof p === 'number') {
      const item = Array.isArray(node) ? node[p] : undefined;
      const label = item && typeof item === 'object' && 'id' in item ? ` "${String((item as {id: unknown}).id)}"` : '';
      out += `[${p}${label}]`;
      node = item;
    } else {
      out += out ? `.${p}` : p;
      node = node && typeof node === 'object' ? (node as Record<string, unknown>)[p] : undefined;
    }
  }
  return out || '(root)';
}
