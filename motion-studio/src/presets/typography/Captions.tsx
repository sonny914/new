import React from 'react';
import {z} from 'zod';
import {PosExprZ, TimeExprZ} from '../../engine/config/schema';
import {ease, progress} from '../../engine/easing';
import type {PresetDef} from '../../engine/types';
import {color} from '../../themes';

export const WordZ = z.object({w: z.string(), s: z.number().nonnegative(), e: z.number().nonnegative()}).strict();

const schema = z
  .object({
    /** Spoken words with start/end seconds (from alignment or a transcript tool). */
    words: z.array(WordZ).min(1),
    x: PosExprZ.default('center'),
    /** Baseline of the (single) caption line. */
    y: PosExprZ.default('safe.bottom-40'),
    size: z.number().positive().default(46),
    maxChars: z.number().int().positive().default(24),
    /** A pause longer than this (s) starts a new caption. */
    gap: z.number().positive().default(0.28),
    color: z.string().default('ink'),
    /** Words not yet spoken show at this opacity. */
    upcoming: z.number().min(0).max(1).default(0.42),
    /** Words (case-insensitive, punctuation ignored) that turn the accent colour as they are said. */
    emphasis: z.array(z.string()).default([]),
    /** Stretches where on-screen type already says the words: captions step aside. */
    hide: z.array(z.object({from: TimeExprZ, to: TimeExprZ}).strict()).default([]),
    /** Frames a caption leads its first word. */
    lead: z.number().int().nonnegative().default(2),
  })
  .strict();

interface Group {
  words: {w: string; s: number; e: number; hot: boolean}[];
  from: number;
  to: number;
}
type Data = {groups: Group[]; hide: [number, number][]; x: number; y: number; half: number; ink: string; accent: string; family: string};

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

/** Group words into caption lines: break at pauses, sentence ends, and a character budget. */
export function groupWords(words: z.output<typeof WordZ>[], maxChars: number, gap: number) {
  const out: z.output<typeof WordZ>[][] = [];
  let cur: z.output<typeof WordZ>[] = [];
  for (const w of words) {
    const len = cur.reduce((n, x) => n + x.w.length + 1, 0) + w.w.length;
    const prev = cur[cur.length - 1];
    if (cur.length && (len > maxChars || w.s - prev.e > gap || /[.?!]$/.test(prev.w))) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out;
}

export const Captions: PresetDef<typeof schema, Data> = {
  id: 'Captions',
  category: 'typography',
  summary: 'Word-timed captions from the actual recording: one short line at a time, words brightening as they are said.',
  doc: {
    effect: 'Readable, quiet captions that follow the speaker exactly. Upcoming words wait at low opacity, so the eye reads ahead; emphasis words turn the accent colour as they land. Not karaoke-sized.',
    timing: 'Lines break at pauses (> gap s), sentence ends, or the character budget; each line leads its first word by `lead` frames and holds until the next.',
    easing: 'Lines rise in over 6 frames (out curve); words brighten over 3 frames.',
    supports: ['talking heads', 'voice-over', 'any aligned transcript'],
    performance: 'One line of HTML text per frame.',
    covers: ['Captions'],
    limitations: ['Timing is only as good as the alignment it is given.', 'One line, centred.'],
  },
  schema,
  layout: (p, ctx) => {
    const fps = ctx.fps;
    const hot = new Set(p.emphasis.map(norm));
    const raw = groupWords(p.words, p.maxChars, p.gap);
    const groups: Group[] = raw.map((g, i) => ({
      words: g.map((w) => ({...w, hot: hot.has(norm(w.w))})),
      from: Math.round(g[0].s * fps) - p.lead,
      to: i + 1 < raw.length ? Math.round(raw[i + 1][0].s * fps) - p.lead : Math.round(g[g.length - 1].e * fps) + Math.round(0.6 * fps),
    }));
    return {
      data: {
        groups,
        hide: p.hide.map((h) => [ctx.t(h.from), ctx.t(h.to)] as [number, number]),
        x: ctx.x(p.x),
        y: ctx.y(p.y),
        // The line box spans the safe content width, centred on x.
        half: (ctx.format.width - ctx.format.safe.left - ctx.format.safe.right) / 2,
        ink: color(ctx.theme, p.color),
        accent: color(ctx.theme, 'accent'),
        family: `"${ctx.theme.font.text.family}", ${ctx.theme.font.text.fallback}`,
      },
    };
  },
  component: ({params, rt}) => {
    const d = rt.layout;
    const f = rt.absolute;
    if (d.hide.some(([a, b]) => f >= a && f < b)) return null;
    const g = d.groups.find((x) => f >= x.from && f < x.to);
    if (!g) return null;
    const t = f / rt.fps;
    const rise = 1 - progress(f, g.from, 6, ease(rt.theme, 'out'));
    return (
      <div
        {...rt.qa('text', rise === 0)}
        style={{
          position: 'absolute',
          left: d.x - d.half,
          width: d.half * 2,
          top: d.y - params.size,
          textAlign: 'center',
          fontFamily: d.family,
          fontSize: params.size,
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: '-0.005em',
          transform: `translateY(${(rise * params.size * 0.5).toFixed(2)}px)`,
          opacity: 1 - rise,
          whiteSpace: 'nowrap',
        }}
      >
        {g.words.map((w, i) => {
          const said = progress(t, w.s, 3 / rt.fps);
          return (
            <span key={i} style={{color: w.hot && said > 0 ? d.accent : d.ink, opacity: params.upcoming + (1 - params.upcoming) * said}}>
              {w.w}
              {i < g.words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    );
  },
  example: {
    duration: '3s',
    note: 'Three aligned words; "rich" is emphasised.',
    params: {
      words: [
        {w: 'get', s: 0.3, e: 0.5},
        {w: 'rich', s: 0.55, e: 0.9},
        {w: 'quick', s: 1.0, e: 1.4},
      ],
      emphasis: ['rich'],
    },
  },
};
