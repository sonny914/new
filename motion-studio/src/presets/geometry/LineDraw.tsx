import React from 'react';
import {z} from 'zod';
import {EaseZ, TimeExprZ} from '../../engine/config/schema';
import {ease, progress} from '../../engine/easing';
import {samplePath, sampleTrack, type Point} from '../../engine/keyframes';
import type {PresetDef} from '../../engine/types';
import {color} from '../../themes';
import {durationOf} from '../typography/textcore';
import {DurZ, PointZ} from '../shared';

const schema = z
  .object({
    from: PointZ,
    to: PointZ,
    /** Draw on over time from one end, both ends, or the centre. */
    draw: z
      .object({at: TimeExprZ, duration: DurZ.default('long'), ease: EaseZ.optional(), origin: z.enum(['start', 'end', 'center']).default('start')})
      .strict()
      .optional(),
    /** Or let a motion path draw it: the line reaches as far as the path has travelled along it. */
    follow: z.string().optional(),
    retract: z
      .object({at: TimeExprZ, duration: DurZ.default('base'), ease: EaseZ.optional(), toward: z.enum(['start', 'end', 'center']).default('end')})
      .strict()
      .optional(),
    /** Re-place the endpoints later (continuity: a rule that slides to sit under the next line). */
    moves: z.array(z.object({at: TimeExprZ, from: PointZ.optional(), to: PointZ.optional(), duration: DurZ.default('long'), ease: EaseZ.optional()}).strict()).default([]),
    stroke: z.number().positive().default(2),
    color: z.string().default('ink'),
    cap: z.enum(['butt', 'round', 'square']).default('butt'),
  })
  .strict()
  .refine((p) => !(p.draw && p.follow), {message: 'Use "draw" or "follow", not both.'});

type Data = {
  a: {frame: number; value: {x: number; y: number}; ease?: string | [number, number, number, number]}[];
  b: {frame: number; value: {x: number; y: number}; ease?: string | [number, number, number, number]}[];
  draw?: {at: number; duration: number; origin: string; ease?: z.output<typeof EaseZ>};
  retract?: {at: number; duration: number; toward: string; ease?: z.output<typeof EaseZ>};
  stroke: number;
  color: string;
};

export const LineDraw: PresetDef<typeof schema, Data> = {
  id: 'LineDraw',
  category: 'geometry',
  summary: 'A rule that draws on, can be drawn by a moving accent, can slide to a new place, and retracts.',
  doc: {
    effect: 'Structure appearing as if ruled by hand: a hairline extends from an end or the centre, or trails a moving point so the point leaves the line behind.',
    timing: 'draw over `long` (24f); retract over `base` (16f); moves over `long`. follow: no timing of its own, it is exactly as far along as the path.',
    easing: 'Draw eases out, retract eases in, moves ease in-out.',
    supports: ['baselines and rules', 'connectors', 'underlines', 'structural grid lines'],
    performance: 'One <line> per frame.',
    covers: ['LineDraw'],
    limitations: ['Straight segments only; use paths in Accumulation for many lines.'],
  },
  schema,
  anchors: ['from', 'to', 'center'],
  refs: {paths: ['follow']},
  layout: (p, ctx) => {
    const pt = (q: z.output<typeof PointZ>): Point => ({x: ctx.x(q.x), y: ctx.y(q.y)});
    const a0 = pt(p.from);
    const b0 = pt(p.to);
    const a: Data['a'] = [{frame: -1, value: a0}];
    const b: Data['b'] = [{frame: -1, value: b0}];
    for (const m of p.moves) {
      const at = ctx.t(m.at);
      const end = at + durationOf(ctx.theme, m.duration, ctx.fps);
      if (m.from) a.push({frame: at, value: a[a.length - 1].value}, {frame: end, value: pt(m.from), ease: (m.ease as never) ?? 'inOut'});
      if (m.to) b.push({frame: at, value: b[b.length - 1].value}, {frame: end, value: pt(m.to), ease: (m.ease as never) ?? 'inOut'});
    }
    return {
      anchors: {from: a0, to: b0, center: {x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2}},
      data: {
        a,
        b,
        draw: p.draw ? {at: ctx.t(p.draw.at), duration: durationOf(ctx.theme, p.draw.duration, ctx.fps), origin: p.draw.origin, ease: p.draw.ease} : undefined,
        retract: p.retract ? {at: ctx.t(p.retract.at), duration: durationOf(ctx.theme, p.retract.duration, ctx.fps), toward: p.retract.toward, ease: p.retract.ease} : undefined,
        stroke: p.stroke * ctx.unit,
        color: color(ctx.theme, p.color),
      },
    };
  },
  component: ({params, rt}) => {
    const d = rt.layout;
    const A = sampleTrack(rt.theme, d.a, rt.frame);
    const B = sampleTrack(rt.theme, d.b, rt.frame);
    let s = 0;
    let e = 1;
    if (d.draw) {
      const p = progress(rt.frame, d.draw.at, d.draw.duration, ease(rt.theme, d.draw.ease, 'out'));
      if (d.draw.origin === 'start') e = p;
      else if (d.draw.origin === 'end') s = 1 - p;
      else {
        s = 0.5 - p / 2;
        e = 0.5 + p / 2;
      }
    } else if (params.follow) {
      const path = rt.path(params.follow);
      if (rt.absolute < path.keys[0].frame) e = 0;
      else {
        const P = samplePath(rt.theme, path.keys, rt.absolute);
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        e = ((P.x - A.x) * dx + (P.y - A.y) * dy) / (dx * dx + dy * dy || 1);
      }
    }
    if (d.retract) {
      const r = progress(rt.frame, d.retract.at, d.retract.duration, ease(rt.theme, d.retract.ease, 'in'));
      if (d.retract.toward === 'end') s = Math.max(s, r);
      else if (d.retract.toward === 'start') e = Math.min(e, 1 - r);
      else {
        s = Math.max(s, r / 2);
        e = Math.min(e, 1 - r / 2);
      }
    }
    s = Math.max(0, s);
    e = Math.min(1, e);
    if (e - s <= 1e-4) return null;
    const {width: W, height: H} = rt.format;
    return (
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <line
          x1={A.x + (B.x - A.x) * s}
          y1={A.y + (B.y - A.y) * s}
          x2={A.x + (B.x - A.x) * e}
          y2={A.y + (B.y - A.y) * e}
          stroke={d.color}
          strokeWidth={d.stroke}
          strokeLinecap={params.cap}
        />
      </svg>
    );
  },
  example: {
    duration: '2s',
    note: 'A content-width rule drawn on from the centre, then retracted to the right.',
    params: {from: {x: 'safe.left', y: 'safe.cy'}, to: {x: 'safe.right', y: 'safe.cy'}, draw: {at: 4, origin: 'center'}, retract: {at: '1.4s'}},
  },
};
