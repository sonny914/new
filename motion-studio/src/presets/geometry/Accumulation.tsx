import React from 'react';
import {z} from 'zod';
import {EaseZ, TimeExprZ} from '../../engine/config/schema';
import {ease, progress} from '../../engine/easing';
import {closestApproach, type Point} from '../../engine/keyframes';
import {fontCss} from '../../engine/measure.browser';
import type {LayoutContext, PresetDef, TextStyle} from '../../engine/types';
import {color} from '../../themes';
import {rng} from '../../utils/random';
import {durationOf, type TextLayout} from '../typography/textcore';
import {box, BoxZ, dashSegment, DurZ, rectPath} from '../shared';

const schema = z
  .object({
    seed: z.string().default('field'),
    area: BoxZ.default({}),
    /** Lattice every element snaps to, so the crowd stays a designed system. */
    cols: z.number().int().min(2).default(6),
    rows: z.number().int().min(2).default(10),
    lines: z.number().int().nonnegative().default(18),
    rects: z.number().int().nonnegative().default(8),
    circles: z.number().int().nonnegative().default(6),
    labels: z.array(z.string()).default([]),
    labelSize: z.union([z.number().positive(), z.enum(['micro', 'caption', 'body'])]).default('micro'),
    /** Outlined echoes of a headline layer, stacked above and below it. */
    echo: z
      .object({layer: z.string(), count: z.number().int().min(1).default(4), gap: z.number().default(0.16), outline: z.number().positive().default(1.5), color: z.string().default('inkDim')})
      .strict()
      .optional(),
    build: z
      .object({
        at: TimeExprZ,
        until: TimeExprZ,
        /** accelerate: arrivals get closer together, so density builds toward the end. */
        curve: z.enum(['accelerate', 'even']).default('accelerate'),
        duration: DurZ.default('base'),
        ease: EaseZ.optional(),
      })
      .strict(),
    /** ObjectDisassembly: elements leave as a motion path passes, rippling outward from it. */
    clear: z
      .object({
        path: z.string(),
        /** Only this stretch of the path clears (e.g. the pass, not where the accent later lands). Defaults to the whole path. */
        window: z.object({from: TimeExprZ.optional(), to: TimeExprZ.optional()}).strict().optional(),
        ripple: z.number().positive().default(36),
        delay: z.number().default(0),
        duration: DurZ.default('short'),
        ease: EaseZ.optional(),
      })
      .strict()
      .optional(),
    stroke: z.number().positive().default(2),
    color: z.string().default('ink'),
    dimColor: z.string().default('inkDim'),
    /** Share of shapes drawn in dimColor. */
    dim: z.number().min(0).max(1).default(0.5),
  })
  .strict();

interface Base {
  start: number;
  clear: number;
  dim: boolean;
}
type Line = Base & {kind: 'line'; d: string; len: number; c: Point};
type Rect = Base & {kind: 'rect'; d: string; len: number; c: Point};
type Circle = Base & {kind: 'circle'; cx: number; cy: number; r: number; rot: number; len: number; c: Point};
type Label = Base & {kind: 'label'; text: string; x: number; y: number; c: Point};
type Echo = Base & {kind: 'echo'; baseline: number; glyphs: {char: string; x: number; start: number; clear: number; c: Point}[]};
type El = Line | Rect | Circle | Label | Echo;

type Data = {
  els: El[];
  stroke: number;
  ink: string;
  dimInk: string;
  echoInk: string;
  echoStroke: number;
  dur: number;
  clearDur: number;
  label?: {style: TextStyle; capHeight: number; family: string; fallback: string};
  echo?: {style: TextStyle; capHeight: number; family: string; fallback: string};
  stagger: number;
};

function generate(p: z.output<typeof schema>, ctx: LayoutContext): Data {
  const r = rng(p.seed);
  const b = box(ctx, p.area);
  const P = (i: number, j: number): Point => ({x: b.left + (b.width * i) / (p.cols - 1), y: b.top + (b.height * j) / (p.rows - 1)});
  const cw = b.width / (p.cols - 1);
  const ch = b.height / (p.rows - 1);
  const els: El[] = [];
  const base = (): Base => ({start: 0, clear: Infinity, dim: r.chance(p.dim)});

  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let n = 0; n < p.lines; n++) {
    for (let tries = 0; tries < 20; tries++) {
      const i = r.int(0, p.cols - 1);
      const j = r.int(0, p.rows - 1);
      const [dx, dy] = r.pick(dirs);
      const k = r.int(1, 4);
      const i2 = Math.max(0, Math.min(p.cols - 1, i + dx * k));
      const j2 = Math.max(0, Math.min(p.rows - 1, j + dy * k));
      if (i2 === i && j2 === j) continue;
      const a = P(i, j);
      const c = P(i2, j2);
      els.push({...base(), kind: 'line', d: `M${a.x} ${a.y}L${c.x} ${c.y}`, len: Math.hypot(c.x - a.x, c.y - a.y), c: {x: (a.x + c.x) / 2, y: (a.y + c.y) / 2}});
      break;
    }
  }
  for (let n = 0; n < p.rects; n++) {
    const w = r.int(1, 2);
    const h = r.int(1, 3);
    const i = r.int(0, p.cols - 1 - w);
    const j = r.int(0, p.rows - 1 - h);
    const a = P(i, j);
    els.push({...base(), kind: 'rect', d: rectPath(a.x, a.y, w * cw, h * ch), len: 2 * (w * cw + h * ch), c: {x: a.x + (w * cw) / 2, y: a.y + (h * ch) / 2}});
  }
  for (let n = 0; n < p.circles; n++) {
    const c = P(r.int(0, p.cols - 1), r.int(0, p.rows - 1));
    const rad = Math.min(cw, ch) * r.pick([0.5, 1, 1.5]);
    els.push({...base(), kind: 'circle', cx: c.x, cy: c.y, r: rad, rot: r.int(0, 3) * 90, len: 2 * Math.PI * rad, c});
  }
  let label: Data['label'];
  if (p.labels.length) {
    const size = (typeof p.labelSize === 'number' ? p.labelSize : ctx.theme.type[p.labelSize]) * ctx.unit;
    const style: TextStyle = {family: ctx.theme.font.text.family, size, weight: ctx.theme.weight.medium, width: ctx.theme.width.normal, tracking: ctx.theme.tracking.label};
    const used = new Set<string>();
    for (const text of p.labels) {
      const m = ctx.measure(text, style);
      for (let tries = 0; tries < 30; tries++) {
        const i = r.int(0, p.cols - 2);
        const j = r.int(1, p.rows - 1);
        if (used.has(`${i},${j}`)) continue;
        used.add(`${i},${j}`);
        const a = P(i, j);
        const x = Math.min(a.x + 10 * ctx.unit, b.right - m.width);
        const y = a.y - 10 * ctx.unit;
        els.push({...base(), dim: false, kind: 'label', text, x, y, c: {x: x + m.width / 2, y: y - m.capHeight / 2}});
        break;
      }
    }
    label = {style, capHeight: ctx.measure('H', style).capHeight, family: style.family, fallback: ctx.theme.font.text.fallback};
  }

  // Shuffle the shapes and labels, then thread echoes through at even intervals.
  for (let i = els.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [els[i], els[j]] = [els[j], els[i]];
  }
  let echo: Data['echo'];
  if (p.echo) {
    const head = ctx.layoutOf<TextLayout>(p.echo.layer);
    if (!head?.states) throw new Error(`echo.layer "${p.echo.layer}" is not a type layer.`);
    const s0 = head.states[0];
    const step = head.capHeight + p.echo.gap * head.style.size;
    for (let k = 0; k < p.echo.count; k++) {
      const off = (Math.floor(k / 2) + 1) * step * (k % 2 === 0 ? -1 : 1);
      const baseline = head.baseline + off;
      const e: Echo = {
        ...base(),
        dim: true,
        kind: 'echo',
        baseline,
        glyphs: s0.glyphs.map((g, gi) => ({char: g.char, x: g.x, start: 0, clear: Infinity, c: {x: (g.x + (s0.glyphs[gi + 1]?.x ?? s0.inkRight)) / 2, y: baseline - head.capHeight / 2}})),
      };
      const at = Math.round(els.length * (0.2 + (0.7 * k) / Math.max(1, p.echo.count - 1 || 1)));
      els.splice(Math.min(at, els.length), 0, e);
    }
    echo = {style: head.style, capHeight: head.capHeight, family: head.family, fallback: head.fallback};
  }

  const at = ctx.t(p.build.at);
  const until = ctx.t(p.build.until);
  const span = Math.max(1, until - at);
  const N = els.length;
  const stagger = ctx.theme.motion.stagger.tight * (ctx.fps / 30);
  els.forEach((e, i) => {
    const u = N > 1 ? i / (N - 1) : 0;
    e.start = Math.round(at + span * (p.build.curve === 'accelerate' ? Math.sqrt(u) : u));
    if (e.kind === 'echo') e.glyphs.forEach((g, gi) => (g.start = e.start + gi * stagger));
  });

  if (p.clear) {
    const path = ctx.path(p.clear.path);
    const c = p.clear;
    const targets: Point[] = [];
    els.forEach((e) => (e.kind === 'echo' ? e.glyphs.forEach((g) => targets.push(g.c)) : targets.push(e.c)));
    const win = c.window ? {from: c.window.from !== undefined ? ctx.t(c.window.from) : undefined, to: c.window.to !== undefined ? ctx.t(c.window.to) : undefined} : undefined;
    const near = closestApproach(ctx.theme, path.keys, targets, win);
    let k = 0;
    const when = (n: {frame: number; distance: number}) => n.frame + c.delay + n.distance / c.ripple;
    els.forEach((e) => {
      if (e.kind === 'echo') {
        e.glyphs.forEach((g) => (g.clear = when(near[k++])));
        e.clear = Math.min(...e.glyphs.map((g) => g.clear));
      } else e.clear = when(near[k++]);
    });
  }

  return {
    els,
    stroke: p.stroke * ctx.unit,
    ink: color(ctx.theme, p.color),
    dimInk: color(ctx.theme, p.dimColor),
    echoInk: color(ctx.theme, p.echo?.color ?? 'inkDim'),
    echoStroke: (p.echo?.outline ?? 1.5) * ctx.unit,
    dur: durationOf(ctx.theme, p.build.duration, ctx.fps),
    clearDur: durationOf(ctx.theme, p.clear?.duration ?? 'short', ctx.fps),
    label,
    echo,
    stagger,
  };
}

export const Accumulation: PresetDef<typeof schema, Data> = {
  id: 'Accumulation',
  category: 'geometry',
  summary: 'Lines, shapes, labels and outlined echoes crowd in on a lattice with accelerating density; a passing path can clear them.',
  doc: {
    effect:
      'Controlled overload. Everything snaps to one lattice and is drawn on, so the crowd reads as a system choking on itself rather than noise. Paired with a group freeze it stops dead; paired with a path it is undone in a ripple that follows the accent.',
    timing: 'Arrivals between build.at and build.until; with "accelerate", the n-th of N arrives at at + span·√(n/N). Each draws over `base` (16f). Clearing: closest approach of the path + distance ÷ ripple (px/frame), over `short` (10f).',
    easing: 'Draw-on eases out; un-draw eases in.',
    supports: ['complexity / overload beats', 'busy diagrams that resolve', 'background texture with a payoff'],
    performance: '~60 elements; layout precomputes every start and clear frame, so a frame is only arithmetic. Measured in docs/benchmarks.json.',
    covers: ['Accumulation', 'ObjectDisassembly'],
    limitations: ['Shapes are lines, rectangles and circles on a uniform lattice.', 'Echoes copy the first state of a KineticHeadline.'],
  },
  schema,
  refs: {paths: ['clear.path'], layers: ['echo.layer']},
  layout: (p, ctx) => ({data: generate(p, ctx)}),
  events: (p, ctx) => {
    // Arrival frames without measuring type: the shapes count is enough to place the clicks.
    const at = ctx.t(p.build.at);
    const span = Math.max(1, ctx.t(p.build.until) - at);
    const N = p.lines + p.rects + p.circles + p.labels.length + (p.echo?.count ?? 0);
    return Array.from({length: N}, (_, i) => Math.round(at + span * (p.build.curve === 'accelerate' ? Math.sqrt(N > 1 ? i / (N - 1) : 0) : N > 1 ? i / (N - 1) : 0)));
  },
  component: ({params, rt}) => {
    const d = rt.layout;
    const inn = ease(rt.theme, params.build.ease, 'out');
    const out = ease(rt.theme, params.clear?.ease, 'in');
    const {width: W, height: H} = rt.format;
    const built = (start: number) => progress(rt.frame, start, d.dur, inn);
    const cleared = (at: number) => (Number.isFinite(at) ? progress(rt.absolute, at, d.clearDur, out) : 0);
    const pad = (cap: number) => cap * 0.12;
    return (
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          {d.els.map((e, i) =>
            e.kind === 'label' && d.label ? (
              <clipPath key={i} id={`${rt.layer.id}-l${i}`}>
                <rect x={e.x - 4} y={e.y - d.label.capHeight - pad(d.label.capHeight)} width={W} height={d.label.capHeight + 2 * pad(d.label.capHeight)} />
              </clipPath>
            ) : e.kind === 'echo' && d.echo ? (
              <clipPath key={i} id={`${rt.layer.id}-e${i}`}>
                <rect x={-W} y={e.baseline - d.echo.capHeight - pad(d.echo.capHeight)} width={W * 3} height={d.echo.capHeight + 2 * pad(d.echo.capHeight)} />
              </clipPath>
            ) : null,
          )}
        </defs>
        {d.els.map((e, i) => {
          if (rt.frame < e.start) return null;
          if (e.kind === 'line' || e.kind === 'rect') {
            const dash = dashSegment(e.len, cleared(e.clear), built(e.start));
            return <path key={i} d={e.d} fill="none" stroke={e.dim ? d.dimInk : d.ink} strokeWidth={d.stroke} {...dash} />;
          }
          if (e.kind === 'circle') {
            const dash = dashSegment(e.len, cleared(e.clear), built(e.start));
            return <circle key={i} cx={e.cx} cy={e.cy} r={e.r} transform={`rotate(${e.rot} ${e.cx} ${e.cy})`} fill="none" stroke={e.dim ? d.dimInk : d.ink} strokeWidth={d.stroke} {...dash} />;
          }
          if (e.kind === 'label' && d.label) {
            const dy = 1 - built(e.start) + cleared(e.clear);
            if (dy >= 1) return null;
            const rise = d.label.capHeight * 1.3;
            return (
              <g key={i} clipPath={`url(#${rt.layer.id}-l${i})`}>
                <text x={e.x} y={e.y} transform={`translate(0 ${(dy * rise).toFixed(2)})`} fill={d.ink} style={fontCss(d.label.style, d.label.family, d.label.fallback)}>
                  {e.text}
                </text>
              </g>
            );
          }
          if (e.kind === 'echo' && d.echo) {
            const rise = d.echo.capHeight * 1.3;
            return (
              <g key={i} clipPath={`url(#${rt.layer.id}-e${i})`}>
                {e.glyphs.map((g, gi) => {
                  const dy = 1 - built(g.start) + cleared(g.clear);
                  if (dy >= 1 || rt.frame < g.start) return null;
                  return (
                    <text
                      key={gi}
                      x={g.x}
                      y={e.baseline}
                      transform={`translate(0 ${(dy * rise).toFixed(2)})`}
                      fill="none"
                      stroke={d.echoInk}
                      strokeWidth={d.echoStroke}
                      style={{...fontCss(d.echo!.style, d.echo!.family, d.echo!.fallback), letterSpacing: 0}}
                    >
                      {g.char}
                    </text>
                  );
                })}
              </g>
            );
          }
          return null;
        })}
      </svg>
    );
  },
  example: {
    duration: '3s',
    note: 'A crowd builds with accelerating density over two seconds.',
    params: {seed: 'example', labels: ['FOLLOW-UP', 'STATUS?', 'RE: RE: FWD'], build: {at: 0, until: '2s'}},
  },
};
