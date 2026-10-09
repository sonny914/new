import React from 'react';
import {z} from 'zod';
import {EaseZ, PosExprZ, TimeExprZ} from '../../engine/config/schema';
import {clamp01, ease, progress} from '../../engine/easing';
import {fontCss} from '../../engine/measure.browser';
import type {PresetDef, TextStyle} from '../../engine/types';
import {color} from '../../themes';
import {rng} from '../../utils/random';
import {box, BoxZ, DurZ} from '../shared';
import {durationOf} from '../typography/textcore';

const schema = z
  .object({
    seed: z.string().default('swarm'),
    area: BoxZ.default({}),
    /** Cards are not placed over this box (keep a face or headline clear). */
    avoid: BoxZ.optional(),
    count: z.number().int().positive().default(24),
    cardWidth: z.number().positive().default(220),
    build: z.object({at: TimeExprZ, until: TimeExprZ, curve: z.enum(['accelerate', 'even']).default('accelerate'), duration: DurZ.default('short')}).strict(),
    /** Collapse every card into one, at a point: many tools become the one you have. */
    collapse: z.object({at: TimeExprZ, duration: DurZ.default('long'), to: z.object({x: PosExprZ, y: PosExprZ}).strict(), ease: EaseZ.optional()}).strict().optional(),
    /** Hard stop: everything disappears on this frame (a pattern interrupt). */
    cut: TimeExprZ.optional(),
    /** The single card left after a collapse stays until this time. */
    keepUntil: TimeExprZ.optional(),
    color: z.string().default('ink'),
  })
  .strict();

type Card = {x: number; y: number; w: number; h: number; start: number; alpha: number; rows: number; tilt: number};
type Data = {cards: Card[]; dur: number; collapse?: {at: number; duration: number; x: number; y: number}; cut?: number; keepUntil?: number; ink: string; ground: string; label: TextStyle; family: string};

export const AppSwarm: PresetDef<typeof schema, Data> = {
  id: 'AppSwarm',
  category: 'geometry',
  summary: 'Generic app cards multiplying and overlapping with accelerating density; they can collapse into one card or vanish on a cut.',
  doc: {
    effect:
      'Market saturation without naming anyone: abstract interface cards (an icon tile marked "AI", text bars) pile up and compete for attention. A collapse folds them into a single card; a cut removes them on one frame.',
    timing: 'Arrivals between build.at and build.until (√ spacing when accelerating), each over `short` (10f). Collapse over `long` (24f).',
    easing: 'Arrivals ease out with a small rise; the collapse eases in-out.',
    supports: ['tool overload', 'feature lists', 'market noise'],
    performance: 'Up to ~40 cards of a few SVG shapes each.',
    covers: ['AppSwarm', 'ObjectDisassembly (collapse)'],
    limitations: ['Cards are deliberately generic: no real product names or logos.'],
  },
  schema,
  layout: (p, ctx) => {
    const r = rng(p.seed);
    const a = box(ctx, p.area);
    const av = p.avoid ? box(ctx, p.avoid) : undefined;
    const w = p.cardWidth * ctx.unit;
    const h = w * 0.62;
    const cards: Card[] = [];
    for (let i = 0, tries = 0; i < p.count && tries < p.count * 40; tries++) {
      const x = a.left + r() * Math.max(1, a.width - w);
      const y = a.top + r() * Math.max(1, a.height - h);
      if (av && x < av.right && x + w > av.left && y < av.bottom && y + h > av.top) continue;
      cards.push({x, y, w: w * r.range(0.8, 1.15), h: h * r.range(0.85, 1.1), start: 0, alpha: r.range(0.55, 1), rows: r.int(2, 3), tilt: r.range(-2.5, 2.5)});
      i++;
    }
    const at = ctx.t(p.build.at);
    const span = Math.max(1, ctx.t(p.build.until) - at);
    cards.forEach((c, i) => {
      const u = cards.length > 1 ? i / (cards.length - 1) : 0;
      c.start = Math.round(at + span * (p.build.curve === 'accelerate' ? Math.sqrt(u) : u));
    });
    return {
      data: {
        cards,
        dur: durationOf(ctx.theme, p.build.duration, ctx.fps),
        collapse: p.collapse ? {at: ctx.t(p.collapse.at), duration: durationOf(ctx.theme, p.collapse.duration, ctx.fps), x: ctx.x(p.collapse.to.x), y: ctx.y(p.collapse.to.y)} : undefined,
        cut: p.cut !== undefined ? ctx.t(p.cut) : undefined,
        keepUntil: p.keepUntil !== undefined ? ctx.t(p.keepUntil) : undefined,
        ink: color(ctx.theme, p.color),
        ground: color(ctx.theme, 'ground'),
        label: {family: ctx.theme.font.text.family, size: 0.14 * w, weight: 700, width: 100, tracking: 0.04},
        family: ctx.theme.font.text.fallback,
      },
    };
  },
  events: (p, ctx) => {
    const at = ctx.t(p.build.at);
    const span = Math.max(1, ctx.t(p.build.until) - at);
    return Array.from({length: p.count}, (_, i) => Math.round(at + span * (p.build.curve === 'accelerate' ? Math.sqrt(p.count > 1 ? i / (p.count - 1) : 0) : i / Math.max(1, p.count - 1))));
  },
  component: ({rt}) => {
    const d = rt.layout;
    const f = rt.frame;
    if (d.cut !== undefined && f >= d.cut) return null;
    const out = ease(rt.theme, 'out');
    const col = d.collapse ? progress(f, d.collapse.at, d.collapse.duration, ease(rt.theme, 'inOut')) : 0;
    if (d.keepUntil !== undefined && f >= d.keepUntil) return null;
    const {width: W, height: H} = rt.format;
    const n = d.cards.length;
    return (
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {d.cards.map((c, i) => {
          if (f < c.start) return null;
          const p = progress(f, c.start, d.dur, out);
          // In a collapse every card travels to the target and shrinks into the last one.
          const last = i === n - 1;
          const k = clamp01(col * (1 + (i / n) * 0.4));
          const cx = c.x + c.w / 2 + ((d.collapse?.x ?? 0) - c.x - c.w / 2) * k;
          const cy = c.y + c.h / 2 + ((d.collapse?.y ?? 0) - c.y - c.h / 2) * k;
          const vanish = last ? 0 : col > 0 ? clamp01((k - 0.65) / 0.35) : 0;
          const op = p * (last ? 1 : c.alpha) * (1 - vanish);
          if (op <= 0.01) return null;
          const s = (0.92 + 0.08 * p) * (last ? 1 : 1 - 0.3 * k);
          const t = `translate(${cx.toFixed(1)} ${(cy + (1 - p) * 18).toFixed(1)}) rotate(${(c.tilt * (1 - k)).toFixed(2)}) scale(${s.toFixed(3)})`;
          const hw = c.w / 2;
          const hh = c.h / 2;
          const icon = c.h * 0.34;
          return (
            <g key={i} transform={t} opacity={op}>
              <rect x={-hw} y={-hh} width={c.w} height={c.h} rx={c.h * 0.1} fill={d.ground} stroke={d.ink} strokeWidth={2} />
              <rect x={-hw + c.h * 0.12} y={-hh + c.h * 0.12} width={icon} height={icon} rx={icon * 0.22} fill={d.ink} />
              <text x={-hw + c.h * 0.12 + icon / 2} y={-hh + c.h * 0.12 + icon * 0.66} textAnchor="middle" fill={d.ground} style={{...fontCss({...d.label, size: icon * 0.42}, d.label.family, d.family)}}>
                AI
              </text>
              {Array.from({length: c.rows}, (_, r) => (
                <rect key={r} x={-hw + c.h * 0.12} y={-hh + c.h * (0.6 + r * 0.14)} width={c.w * (r === 0 ? 0.7 : 0.45)} height={c.h * 0.06} rx={c.h * 0.03} fill={d.ink} opacity={r === 0 ? 0.8 : 0.4} />
              ))}
              <rect x={hw - c.h * 0.42} y={-hh + c.h * 0.16} width={c.h * 0.3} height={c.h * 0.12} rx={c.h * 0.06} fill="none" stroke={d.ink} strokeWidth={1.5} opacity={0.6} />
            </g>
          );
        })}
      </svg>
    );
  },
  example: {duration: '3s', note: 'Twenty-four cards arrive faster and faster, then fold into one.', params: {build: {at: 0, until: '1.6s'}, collapse: {at: '2s', to: {x: 'center', y: 'safe.cy'}}}},
};
