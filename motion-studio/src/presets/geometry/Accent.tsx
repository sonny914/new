import React from 'react';
import {z} from 'zod';
import {EaseZ, TimeExprZ} from '../../engine/config/schema';
import {ease, progress} from '../../engine/easing';
import {samplePath, sampleTrack} from '../../engine/keyframes';
import type {PresetDef} from '../../engine/types';
import {color} from '../../themes';
import {durationOf} from '../typography/textcore';
import {DurZ} from '../shared';

const schema = z
  .object({
    /** The motion path it rides (defined under "paths"). */
    path: z.string(),
    /** Diameter in px. */
    size: z.number().positive().default(28),
    shape: z.enum(['dot', 'square']).default('dot'),
    color: z.string().default('accent'),
    appear: z.object({at: TimeExprZ, style: z.enum(['scale', 'cut']).default('cut'), duration: DurZ.default('short')}).strict().optional(),
    vanish: z.object({at: TimeExprZ, style: z.enum(['scale', 'cut']).default('scale'), duration: DurZ.default('short'), ease: EaseZ.optional()}).strict().optional(),
    /** Size changes over time, e.g. growing into an iris or settling as a full stop. */
    sizes: z.array(z.object({at: TimeExprZ, size: z.number().positive(), ease: EaseZ.optional()}).strict()).default([]),
    /** Stretch along the direction of travel at speed (0 = rigid). Keeps fast moves legible. */
    stretch: z.number().min(0).max(1).default(0.3),
  })
  .strict();

type Data = {
  appear: number;
  appearDur: number;
  vanish?: {at: number; duration: number};
  sizes: {frame: number; value: number; ease?: z.output<typeof EaseZ>}[];
  color: string;
};

export const Accent: PresetDef<typeof schema, Data> = {
  id: 'Accent',
  category: 'geometry',
  summary: 'The one live element: a point that rides a motion path, can drive other layers, and lands with intent.',
  doc: {
    effect:
      'A single accent-coloured point moving through the composition. Other layers key off its path (lines it draws, elements it clears, irises it opens), so the accent visibly causes change instead of decorating it.',
    timing: 'Entirely from its path keys; appear/vanish over `short` (10f).',
    easing: 'Per path key (default in-out). A slight stretch along velocity at speed, never a bounce.',
    supports: ['a point of view / cursor / agent', 'a full stop that lands', 'transition origins'],
    performance: 'One element; path sampled twice per frame for velocity.',
    covers: ['Accent (path follow)', 'FocusTransition (as an iris origin)'],
    limitations: ['Dot or square only. One accent per theme by design: the brand allows one live colour.'],
  },
  schema,
  refs: {paths: ['path']},
  layout: (p, ctx) => {
    const path = ctx.path(p.path);
    return {
      data: {
        appear: p.appear ? ctx.t(p.appear.at) : path.keys[0].frame,
        appearDur: p.appear?.style === 'scale' ? durationOf(ctx.theme, p.appear.duration, ctx.fps) : 0,
        vanish: p.vanish ? {at: ctx.t(p.vanish.at), duration: p.vanish.style === 'cut' ? 0 : durationOf(ctx.theme, p.vanish.duration, ctx.fps)} : undefined,
        sizes: [{frame: -1, value: p.size * ctx.unit}, ...p.sizes.map((s) => ({frame: ctx.t(s.at), value: s.size * ctx.unit, ease: s.ease}))],
        color: color(ctx.theme, p.color),
      },
    };
  },
  component: ({params, rt}) => {
    const d = rt.layout;
    const keys = rt.path(params.path).keys;
    const f = rt.absolute;
    if (f < d.appear) return null;
    let s = d.appearDur ? progress(f, d.appear, d.appearDur, ease(rt.theme, 'out')) : 1;
    if (d.vanish) s *= 1 - (d.vanish.duration ? progress(f, d.vanish.at, d.vanish.duration, ease(rt.theme, params.vanish?.ease, 'in')) : f >= d.vanish.at ? 1 : 0);
    if (s <= 0.001) return null;
    const size = sampleTrack(rt.theme, d.sizes, f) * s;
    const p = samplePath(rt.theme, keys, f);
    const a = samplePath(rt.theme, keys, f - 0.5);
    const b = samplePath(rt.theme, keys, f + 0.5);
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const speed = Math.hypot(vx, vy);
    const k = params.stretch * Math.min(1, speed / Math.max(1, size));
    const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
    const {width: W, height: H} = rt.format;
    const t = `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${(1 + k).toFixed(4)} ${(1 / (1 + k)).toFixed(4)})`;
    const qa = rt.qa('mark', speed < 0.05);
    return (
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {params.shape === 'square' ? (
          <rect {...qa} transform={t} x={-size / 2} y={-size / 2} width={size} height={size} fill={d.color} />
        ) : (
          <circle {...qa} transform={t} r={size / 2} fill={d.color} />
        )}
      </svg>
    );
  },
  example: {
    duration: '2s',
    note: 'The accent crosses the frame left to right and settles.',
    params: {path: 'example-pass', size: 28},
  },
};
