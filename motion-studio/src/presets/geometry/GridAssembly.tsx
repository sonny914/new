import React from 'react';
import {z} from 'zod';
import {EaseZ, TimeExprZ} from '../../engine/config/schema';
import {ease, progress} from '../../engine/easing';
import {closestApproach} from '../../engine/keyframes';
import type {PresetDef} from '../../engine/types';
import {color} from '../../themes';
import {rng} from '../../utils/random';
import {durationOf} from '../typography/textcore';
import {box, BoxZ, DurZ} from '../shared';

const schema = z
  .object({
    cols: z.number().int().min(1).default(6),
    rows: z.number().int().min(1).default(10),
    area: BoxZ.default({}),
    mark: z.enum(['cross', 'dot', 'tick', 'square']).default('cross'),
    size: z.number().positive().default(14),
    stroke: z.number().positive().default(2),
    color: z.string().default('inkDim'),
    assemble: z
      .object({
        at: TimeExprZ,
        order: z.enum(['center', 'rows', 'columns', 'diagonal', 'random']).default('center'),
        /** Frames over which the marks' start times spread. */
        spread: z.number().nonnegative().default(24),
        duration: DurZ.default('base'),
        ease: EaseZ.optional(),
        seed: z.string().default('grid'),
      })
      .strict()
      .optional(),
    /** ObjectDisassembly: marks leave as a motion path passes them, rippling outward from it. */
    disassemble: z
      .object({
        path: z.string(),
        window: z.object({from: TimeExprZ.optional(), to: TimeExprZ.optional()}).strict().optional(),
        ripple: z.number().positive().default(40),
        delay: z.number().default(0),
        duration: DurZ.default('short'),
        ease: EaseZ.optional(),
      })
      .strict()
      .optional(),
    /** Marks that survive disassembly (registration corners of the system). */
    keep: z.enum(['none', 'corners']).default('none'),
    /** When the kept marks finally leave. */
    keepExit: z.object({at: TimeExprZ, duration: DurZ.default('short'), ease: EaseZ.optional()}).strict().optional(),
  })
  .strict();

type Mark = {x: number; y: number; start: number; clear: number; kept: boolean};
type Data = {marks: Mark[]; size: number; stroke: number; color: string; dur: number; clearDur: number; keepExit?: {at: number; duration: number}};

export const GridAssembly: PresetDef<typeof schema, Data> = {
  id: 'GridAssembly',
  category: 'geometry',
  summary: 'A lattice of small marks that assembles into a visible system, and can be cleared by a passing accent.',
  doc: {
    effect: 'Registration-style marks snap in across a grid in a deliberate order (from the centre, by rows, diagonally), establishing structure before anything else arrives.',
    timing: 'Start times spread over `spread` frames in the chosen order; each mark takes `base` (16f). Disassembly: each mark leaves when the path passes closest, plus distance ÷ ripple frames.',
    easing: 'Marks turn in a quarter turn while scaling in (out curve); leave scaling down (in curve).',
    supports: ['opening structure', 'backgrounds for diagrams', 'registration frames'],
    performance: 'rows × cols small elements; 60 marks cost well under a millisecond per frame.',
    covers: ['GridAssembly', 'ObjectDisassembly (sweep)'],
    limitations: ['Uniform grids only.'],
  },
  schema,
  refs: {paths: ['disassemble.path']},
  layout: (p, ctx) => {
    const b = box(ctx, p.area);
    const marks: Mark[] = [];
    const r = rng(p.assemble?.seed ?? 'grid');
    const cx = (p.cols - 1) / 2;
    const cy = (p.rows - 1) / 2;
    const maxD = Math.hypot(cx, cy) || 1;
    const ords: number[] = [];
    for (let j = 0; j < p.rows; j++)
      for (let i = 0; i < p.cols; i++) {
        const x = p.cols === 1 ? b.left + b.width / 2 : b.left + (b.width * i) / (p.cols - 1);
        const y = p.rows === 1 ? b.top + b.height / 2 : b.top + (b.height * j) / (p.rows - 1);
        const order =
          p.assemble?.order === 'rows'
            ? (j * p.cols + i) / (p.rows * p.cols - 1 || 1)
            : p.assemble?.order === 'columns'
              ? (i * p.rows + j) / (p.rows * p.cols - 1 || 1)
              : p.assemble?.order === 'diagonal'
                ? (i + j) / (p.cols + p.rows - 2 || 1)
                : p.assemble?.order === 'random'
                  ? r()
                  : Math.hypot(i - cx, j - cy) / maxD;
        ords.push(order);
        const corner = (i === 0 || i === p.cols - 1) && (j === 0 || j === p.rows - 1);
        marks.push({x, y, start: 0, clear: Infinity, kept: p.keep === 'corners' && corner});
      }
    const at = p.assemble ? ctx.t(p.assemble.at) : -Infinity;
    marks.forEach((m, k) => (m.start = p.assemble ? at + Math.round(ords[k] * p.assemble.spread) : -Infinity));
    if (p.disassemble) {
      const path = ctx.path(p.disassemble.path);
      const w = p.disassemble.window;
      const near = closestApproach(ctx.theme, path.keys, marks, w ? {from: w.from !== undefined ? ctx.t(w.from) : undefined, to: w.to !== undefined ? ctx.t(w.to) : undefined} : undefined);
      marks.forEach((m, k) => {
        if (!m.kept) m.clear = near[k].frame + p.disassemble!.delay + near[k].distance / p.disassemble!.ripple;
      });
    }
    return {
      data: {
        marks,
        size: p.size * ctx.unit,
        stroke: p.stroke * ctx.unit,
        color: color(ctx.theme, p.color),
        dur: durationOf(ctx.theme, p.assemble?.duration ?? 'base', ctx.fps),
        clearDur: durationOf(ctx.theme, p.disassemble?.duration ?? 'short', ctx.fps),
        keepExit: p.keepExit ? {at: ctx.t(p.keepExit.at), duration: durationOf(ctx.theme, p.keepExit.duration, ctx.fps)} : undefined,
      },
    };
  },
  events: (p, ctx) => {
    if (!p.assemble) return [];
    const at = ctx.t(p.assemble.at);
    return [at, at + Math.round(p.assemble.spread / 2), at + p.assemble.spread];
  },
  component: ({params, rt}) => {
    const d = rt.layout;
    const inn = ease(rt.theme, params.assemble?.ease, 'out');
    const out = ease(rt.theme, params.disassemble?.ease, 'in');
    const {width: W, height: H} = rt.format;
    const h = d.size / 2;
    return (
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {d.marks.map((m, i) => {
          const p = Number.isFinite(m.start) ? progress(rt.frame, m.start, d.dur, inn) : 1;
          let q = Number.isFinite(m.clear) ? progress(rt.absolute, m.clear, d.clearDur, out) : 0;
          if (m.kept && d.keepExit) q = progress(rt.frame, d.keepExit.at, d.keepExit.duration, out);
          const s = p * (1 - q);
          if (s <= 0.001) return null;
          const rot = (1 - p) * 90 - q * 45;
          const t = `translate(${m.x} ${m.y}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(4)})`;
          if (params.mark === 'dot') return <circle key={i} transform={t} r={h} fill={d.color} />;
          if (params.mark === 'square') return <rect key={i} transform={t} x={-h} y={-h} width={d.size} height={d.size} fill="none" stroke={d.color} strokeWidth={d.stroke} />;
          if (params.mark === 'tick') return <line key={i} transform={t} x1={0} y1={-h} x2={0} y2={h} stroke={d.color} strokeWidth={d.stroke} />;
          return <path key={i} transform={t} d={`M${-h} 0H${h}M0 ${-h}V${h}`} stroke={d.color} strokeWidth={d.stroke} fill="none" />;
        })}
      </svg>
    );
  },
  example: {
    duration: '2s',
    note: 'A 6 × 10 lattice of crosses assembling from the centre outward.',
    params: {cols: 6, rows: 10, assemble: {at: 0, order: 'center', spread: 24}},
  },
};
