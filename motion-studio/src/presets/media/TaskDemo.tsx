import React from 'react';
import {z} from 'zod';
import {PosExprZ, TimeExprZ} from '../../engine/config/schema';
import {ease, progress} from '../../engine/easing';
import {sampleTrack} from '../../engine/keyframes';
import type {PresetDef} from '../../engine/types';
import {color} from '../../themes';

const schema = z
  .object({
    x: PosExprZ.default('safe.left'),
    y: PosExprZ.default('safe.top+120'),
    width: z.number().positive().default(888),
    /** Small label above the panel. */
    label: z.string().default(''),
    /** Window title inside the panel. */
    title: z.string(),
    /** Steps, each completed at its time: the guide points, the box ticks. */
    steps: z.array(z.object({text: z.string(), at: TimeExprZ}).strict()).min(1),
    at: TimeExprZ,
    exit: TimeExprZ.optional(),
  })
  .strict();

type Data = {x: number; y: number; at: number; exit?: number; steps: {text: string; at: number}[]; ink: string; dim: string; rule: string; accent: string; ground: string; family: string};

const ROW = 112;

export const TaskDemo: PresetDef<typeof schema, Data> = {
  id: 'TaskDemo',
  category: 'media',
  summary: 'An original, code-built demonstration: a guide (the accent) walks someone through a real task, step by step, in a tool they already have.',
  doc: {
    effect: 'Teaching made visible. A plain window lists the steps; the accent moves to each one as it is explained and the box ticks. No real product UI is imitated.',
    timing: 'Panel rises at `at`; each step resolves at its own time (sync them to the voice); the guide travels between steps over 8 frames.',
    easing: 'Out on arrival, in-out for the guide.',
    supports: ['how-to beats', 'process explanations', 'B-roll substitutes when no footage exists'],
    performance: 'A few dozen SVG/HTML elements.',
    covers: ['TaskDemo', 'animated demonstration (B-roll substitute)'],
    limitations: ['Steps are one line each.'],
  },
  schema,
  layout: (p, ctx) => ({
    data: {
      x: ctx.x(p.x),
      y: ctx.y(p.y),
      at: ctx.t(p.at),
      exit: p.exit !== undefined ? ctx.t(p.exit) : undefined,
      steps: p.steps.map((s) => ({text: s.text, at: ctx.t(s.at)})),
      ink: color(ctx.theme, 'ink'),
      dim: color(ctx.theme, 'inkDim'),
      rule: color(ctx.theme, 'rule'),
      accent: color(ctx.theme, 'accent'),
      ground: color(ctx.theme, 'ground'),
      family: `"${ctx.theme.font.text.family}", ${ctx.theme.font.text.fallback}`,
    },
  }),
  events: (p, ctx) => p.steps.map((s) => ctx.t(s.at)),
  component: ({params, rt}) => {
    const d = rt.layout;
    const f = rt.frame;
    const out = ease(rt.theme, 'out');
    const inn = ease(rt.theme, 'in');
    const enter = progress(f, d.at, 14, out);
    const leave = d.exit !== undefined ? progress(f, d.exit, 10, inn) : 0;
    if (enter <= 0) return null;
    const W = params.width;
    const head = 120;
    const H = head + d.steps.length * ROW + 40;
    // The guide sits beside the active step; it moves as each one is explained.
    const keys = [{frame: d.at, value: 0}, ...d.steps.map((s, i) => ({frame: s.at - 8, value: i})), ...d.steps.map((s, i) => ({frame: s.at, value: i}))].sort((a, b) => a.frame - b.frame);
    const idx = sampleTrack(rt.theme, keys, f);
    const gy = head + idx * ROW + ROW / 2;
    return (
      <div style={{position: 'absolute', left: d.x, top: d.y + (1 - enter) * 40 + leave * 40, width: W, opacity: enter * (1 - leave), fontFamily: d.family}}>
        {params.label ? <div style={{color: d.dim, fontSize: 26, fontWeight: 600, letterSpacing: '0.14em', marginBottom: 22}}>{params.label}</div> : null}
        <div style={{position: 'relative', height: H, border: `2px solid ${d.rule}`, borderRadius: 26, background: d.ground}}>
          <div style={{height: head, display: 'flex', alignItems: 'center', gap: 14, padding: '0 34px', borderBottom: `2px solid ${d.rule}`}}>
            {[0, 1, 2].map((k) => (
              <div key={k} style={{width: 14, height: 14, borderRadius: 7, border: `2px solid ${d.dim}`}} />
            ))}
            <div style={{color: d.ink, fontSize: 34, fontWeight: 600, marginLeft: 16}}>{params.title}</div>
          </div>
          {d.steps.map((s, i) => {
            const show = progress(f, d.at + 6 + i * 3, 10, out);
            const done = progress(f, s.at, 8, out);
            const active = Math.round(idx) === i && f < s.at + 18;
            return (
              <div key={i} {...rt.qa('text', done >= 1)} style={{position: 'absolute', left: 34, right: 34, top: head + i * ROW + 20, height: ROW - 40, display: 'flex', alignItems: 'center', gap: 26, opacity: show, transform: `translateY(${(1 - show) * 12}px)`}}>
                <svg width={44} height={44} style={{flex: 'none'}}>
                  <rect x={2} y={2} width={40} height={40} rx={9} fill={done >= 1 ? d.accent : 'none'} stroke={done > 0 ? d.accent : d.dim} strokeWidth={3} />
                  <path d="M11 23 L19 31 L33 14" fill="none" stroke={d.ground} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={34} strokeDashoffset={34 * (1 - done)} />
                </svg>
                <div style={{color: done > 0 || active ? d.ink : d.dim, fontSize: 40, fontWeight: 600, letterSpacing: '-0.005em'}}>{s.text}</div>
              </div>
            );
          })}
          <div style={{position: 'absolute', left: -13, top: gy - 13, width: 26, height: 26, borderRadius: 13, background: d.accent}} />
        </div>
      </div>
    );
  },
  example: {
    duration: '3s',
    note: 'A three-step task, ticked off as it is explained.',
    params: {title: 'Follow-up email', label: 'THE TOOL YOU ALREADY HAVE', at: 0, steps: [{text: 'Paste the meeting notes', at: 20}, {text: 'Ask for a first draft', at: 40}, {text: 'Make it sound like you', at: 60}]},
  },
};
