import React from 'react';
import {z} from 'zod';
import {EaseZ, TimeExprZ} from '../../engine/config/schema';
import {ease, progress} from '../../engine/easing';
import type {PresetDef} from '../../engine/types';
import {color} from '../../themes';
import {durationOf} from '../typography/textcore';
import {DurZ} from '../shared';

const schema = z
  .object({
    at: TimeExprZ,
    duration: DurZ.default('long'),
    /** The direction the panel travels. */
    direction: z.enum(['left', 'right', 'up', 'down']).default('up'),
    /**
     * through: crosses the whole frame (swap content at the midpoint). cover: ends covering.
     * uncover: starts covering and leaves. edge: only the travelling edge, a rule of `thickness` px;
     * pair it with layer reveal/conceal wipes using the same at, duration, direction and ease, and
     * the swap happens exactly at the rule.
     */
    mode: z.enum(['through', 'cover', 'uncover', 'edge']).default('through'),
    /** edge mode: rule thickness in px. */
    thickness: z.number().positive().default(6),
    color: z.string().default('ink'),
    /** Panel depth along the direction of travel, as a fraction of the frame (1 = full frame). */
    band: z.number().positive().max(1).default(1),
    ease: EaseZ.optional(),
  })
  .strict();

type Data = {at: number; duration: number; color: string};

export const DirectionalWipe: PresetDef<typeof schema, Data> = {
  id: 'DirectionalWipe',
  category: 'transition',
  summary: 'A solid panel that travels across the frame to hand one scene to the next.',
  doc: {
    effect: 'A deliberate hard edge replacing a cut. In "through" mode the frame is fully covered at the midpoint, which is where the outgoing layers should end and incoming ones start.',
    timing: 'Over `long` (24f). Midpoint = at + duration/2: time the swap there.',
    easing: 'In-out by default, so the panel accelerates through the cover and decelerates out.',
    supports: ['scene changes', 'section breaks', 'reveals of a new colour field'],
    performance: 'One rectangle.',
    covers: ['DirectionalWipe', 'MaskTransition (edge mode + layer reveal/conceal wipes)'],
    limitations: ['Straight edges only; for shaped masks use a layer "reveal" with shape "circle".'],
  },
  schema,
  layout: (p, ctx) => ({data: {at: ctx.t(p.at), duration: durationOf(ctx.theme, p.duration, ctx.fps), color: color(ctx.theme, p.color)}}),
  events: (p, ctx) => [ctx.t(p.at)],
  component: ({params, rt}) => {
    const d = rt.layout;
    const {width: W, height: H} = rt.format;
    const t = progress(rt.frame, d.at, d.duration, ease(rt.theme, params.ease, 'inOut'));
    if (rt.frame < d.at && params.mode !== 'uncover') return null;
    const horizontal = params.direction === 'left' || params.direction === 'right';
    const L = horizontal ? W : H;
    if (params.mode === 'edge') {
      if (t <= 0 || t >= 1) return null;
      // Same geometry as a layer wipe mask: the edge sits t·L from the side it starts on.
      const forward = params.direction === 'right' || params.direction === 'down';
      const at = forward ? t * L : L - t * L;
      const k = params.thickness * (W / 1080);
      const edge: React.CSSProperties = horizontal
        ? {position: 'absolute', top: 0, height: H, left: at - k / 2, width: k, background: d.color}
        : {position: 'absolute', left: 0, width: W, top: at - k / 2, height: k, background: d.color};
      return <div style={edge} />;
    }
    const band = L * params.band;
    // Leading-edge position along the travel axis, from the start side.
    let lead: number;
    if (params.mode === 'through') lead = t * (L + band);
    else if (params.mode === 'cover') lead = t * L;
    else lead = L + t * band;
    const trail = params.mode === 'cover' ? 0 : lead - band;
    const a = Math.max(0, trail);
    const b = Math.min(L, lead);
    if (b <= a) return null;
    const forward = params.direction === 'right' || params.direction === 'down';
    const start = forward ? a : L - b;
    const size = b - a;
    const style: React.CSSProperties = horizontal
      ? {position: 'absolute', top: 0, height: H, left: start, width: size, background: d.color}
      : {position: 'absolute', left: 0, width: W, top: start, height: size, background: d.color};
    return <div style={style} />;
  },
  example: {
    duration: '2s',
    note: 'A full-frame panel passing upward; the midpoint is fully covered.',
    params: {at: 10, direction: 'up'},
  },
};
