import React from 'react';
import {z} from 'zod';
import {EaseZ, PosExprZ, TimeExprZ} from '../../engine/config/schema';
import {ease, progress} from '../../engine/easing';
import {fontCss} from '../../engine/measure.browser';
import type {PresetDef, TextStyle} from '../../engine/types';
import {color} from '../../themes';
import {DurZ} from '../shared';
import {durationOf, ExitZ, staggerOf} from './textcore';

const schema = z
  .object({
    words: z.array(z.string().min(1)).min(1),
    x: PosExprZ.default('safe.left'),
    /** Baseline of the newest line. */
    y: PosExprZ.default('safe.cy'),
    size: z.union([z.number().positive(), z.enum(['micro', 'caption', 'body', 'subhead', 'title'])]).default('title'),
    weight: z.union([z.number(), z.enum(['light', 'regular', 'medium', 'bold', 'heavy', 'black'])]).default('bold'),
    width: z.union([z.number(), z.enum(['condensed', 'normal', 'expanded'])]).default('condensed'),
    tracking: z.union([z.number(), z.enum(['tight', 'normal', 'label'])]).default('normal'),
    /** Line pitch in em. */
    leading: z.number().positive().default(1.0),
    at: TimeExprZ,
    /** Frames between words (a number) or a stagger token. */
    interval: z.union([z.number().positive(), z.enum(['tight', 'base', 'loose'])]).default(8),
    /** How many lines stay in view; older lines leave through the top of the stack. */
    visible: z.number().int().min(1).default(4),
    color: z.string().default('ink'),
    /** Older lines settle to this opacity so the newest reads first. */
    settle: z.number().min(0).max(1).default(0.45),
    /** Word index drawn in the accent colour (the one live item), if any. */
    highlight: z.number().int().nonnegative().optional(),
    duration: DurZ.default('short'),
    ease: EaseZ.optional(),
    exit: ExitZ.optional(),
  })
  .strict();

type Data = {
  style: TextStyle;
  family: string;
  fallback: string;
  x: number;
  y: number;
  pitch: number;
  capHeight: number;
  starts: number[];
  dur: number;
  ink: string;
  accent: string;
  exit?: {at: number; duration: number; stagger: number; style: string};
};

export const WordStack: PresetDef<typeof schema, Data> = {
  id: 'WordStack',
  category: 'typography',
  summary: 'A list that builds one word at a time: each new word rises in at the bottom and pushes the stack up.',
  doc: {
    effect: 'Accumulation in type: a growing pile of items (tasks, tools, steps). Older lines settle back and leave through the top once the stack is full.',
    timing: 'A word every `interval` frames (default 8); each rise and each push take `short` (10f).',
    easing: 'Out curve for rises and pushes; exit uses the in curve.',
    supports: ['lists of chores, tools, features', 'counting-up beats', 'before/after inventories'],
    performance: 'One <text> per word.',
    covers: ['WordStack'],
    limitations: ['Left-aligned; one column.'],
  },
  schema,
  layout: (p, ctx) => {
    const t = ctx.theme;
    const size = (typeof p.size === 'number' ? p.size : t.type[p.size]) * ctx.unit;
    const style: TextStyle = {
      family: t.font.display.family,
      size,
      weight: typeof p.weight === 'number' ? p.weight : t.weight[p.weight],
      width: typeof p.width === 'number' ? p.width : t.width[p.width],
      tracking: typeof p.tracking === 'number' ? p.tracking : t.tracking[p.tracking],
    };
    const m = ctx.measure('H', style);
    const at = ctx.t(p.at);
    const step = staggerOf(t, p.interval, ctx.fps);
    return {
      data: {
        style,
        family: style.family,
        fallback: t.font.display.fallback,
        x: ctx.x(p.x) - (m.inkLeft > 0 ? m.inkLeft : 0),
        y: ctx.y(p.y),
        pitch: size * p.leading,
        capHeight: m.capHeight,
        starts: p.words.map((_, i) => Math.round(at + i * step)),
        dur: durationOf(t, p.duration, ctx.fps),
        ink: color(t, p.color),
        accent: color(t, 'accent'),
        exit: p.exit ? {at: ctx.t(p.exit.at), duration: durationOf(t, p.exit.duration, ctx.fps), stagger: staggerOf(t, p.exit.stagger, ctx.fps), style: p.exit.style} : undefined,
      },
    };
  },
  events: (p, ctx) => {
    const at = ctx.t(p.at);
    const step = staggerOf(ctx.theme, p.interval, ctx.fps);
    return p.words.map((_, i) => Math.round(at + i * step));
  },
  component: ({params, rt}) => {
    const d = rt.layout;
    const f = rt.frame;
    const out = ease(rt.theme, params.ease, 'out');
    const pad = d.capHeight * 0.14;
    const top = d.y - (params.visible - 1) * d.pitch - d.capHeight - pad;
    const {width: W, height: H} = rt.format;
    const id = `${rt.layer.id}-stack`;
    const n = d.starts.length;
    const arrived = d.starts.filter((s) => f >= s).length;
    const rest = arrived === n && f >= d.starts[n - 1] + d.dur && !(d.exit && f >= d.exit.at);
    return (
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <clipPath id={id}>
            <rect x={-W} y={top} width={W * 3} height={d.y + pad - top} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          {params.words.map((w, i) => {
            if (f < d.starts[i]) return null;
            const rise = 1 - progress(f, d.starts[i], d.dur, out);
            // Each later word pushes this one up one line.
            let pushed = 0;
            for (let j = i + 1; j < n; j++) pushed += progress(f, d.starts[j], d.dur, out);
            const settle = Math.min(1, pushed);
            let y = d.y + rise * (d.capHeight + pad * 2) - pushed * d.pitch;
            let opacity = 1 - (1 - params.settle) * settle;
            if (d.exit && f >= d.exit.at) {
              const order = n - 1 - i;
              const q = progress(f, d.exit.at + order * d.exit.stagger, d.exit.duration, ease(rt.theme, 'in'));
              if (d.exit.style === 'fade') opacity *= 1 - q;
              // Each line travels exactly far enough to clear the stack's edge, wherever it sits.
              else if (d.exit.style === 'rise') y -= q * (y - top + pad);
              else y += q * (d.y + pad - (y - d.capHeight) + 2);
            }
            return (
              <text key={i} x={d.x} y={y} opacity={opacity} fill={params.highlight === i ? d.accent : d.ink} style={fontCss(d.style, d.family, d.fallback)}>
                {w}
              </text>
            );
          })}
        </g>
        <rect {...rt.qa('text', rest)} x={d.x} y={top + pad} width={1} height={d.y - top - pad} fill="none" />
      </svg>
    );
  },
  example: {
    duration: '3s',
    note: 'Coordination chores piling up, newest at the bottom.',
    params: {words: ['EMAIL', 'CALENDAR', 'FOLLOW-UP', 'STATUS', 'HANDOFF'], at: 4, interval: 9},
  },
};
