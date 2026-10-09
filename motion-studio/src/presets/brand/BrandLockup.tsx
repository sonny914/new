import React from 'react';
import {z} from 'zod';
import {EaseZ, PosExprZ, TimeExprZ} from '../../engine/config/schema';
import {ease, progress} from '../../engine/easing';
import {samplePath} from '../../engine/keyframes';
import type {PresetDef} from '../../engine/types';
import {color} from '../../themes';
import {durationOf} from '../typography/textcore';
import {DurZ, PointZ} from '../shared';

// Mark and wordmark positions inside lockup.svg (845 × 690), from its transforms.
const MARK_BOX = {x: 98.1, y: 0, w: 823 * 0.7874, h: 658 * 0.7874};
const WORD_BOX = {x: 0, y: 535.1, w: 845, h: 155};

const schema = z
  .object({
    /** Centre of the lockup. */
    x: PosExprZ.default('center'),
    y: PosExprZ.default('safe.cy'),
    /** Lockup width in px (the wordmark's width). */
    width: z.number().positive().default(420),
    color: z.string().default('ink'),
    mark: z
      .object({
        at: TimeExprZ,
        /** iris: opens from a point (a position, or a path id: where that path is at `at`). */
        style: z.enum(['iris', 'rise', 'fade', 'cut']).default('iris'),
        duration: DurZ.default('long'),
        ease: EaseZ.optional(),
        origin: z.union([PointZ, z.string()]).optional(),
      })
      .strict(),
    wordmark: z.object({at: TimeExprZ, style: z.enum(['rise', 'fade', 'cut']).default('rise'), duration: DurZ.default('base'), ease: EaseZ.optional()}).strict(),
    exit: z.object({at: TimeExprZ, duration: DurZ.default('short')}).strict().optional(),
  })
  .strict();

type Data = {
  left: number;
  top: number;
  k: number;
  color: string;
  /** Iris centre: a fixed point, or a path sampled at render time (a path may itself pin to this lockup). */
  mark: {at: number; duration: number; origin: {x: number; y: number} | {path: string}};
  word: {at: number; duration: number};
  exit?: {at: number; duration: number};
};

export const BrandLockup: PresetDef<typeof schema, Data> = {
  id: 'BrandLockup',
  category: 'brand',
  summary: 'The verified Quiet Bands lockup (mark over wordmark) drawn from assets/brand, revealed without distorting it.',
  doc: {
    effect:
      'Resolves to the identity. The mark opens through an iris from a chosen point (often where the accent comes to rest) or rises into place; the wordmark rises through its own baseline. The mark is never split, outlined, stretched or recoloured per part.',
    timing: 'mark over `long` (24f), wordmark over `base` (16f); start them a few frames apart so the eye lands on the mark first.',
    easing: 'Out curves on both.',
    supports: ['end cards', 'openers', 'any brand-mode composition'],
    performance: 'Two filled paths and two clip shapes per frame; nothing measured.',
    covers: ['BrandLockup', 'ShapeReveal (iris)', 'CircleExpansion'],
    limitations: ['Needs a theme with a logo (quiet-bands).', 'Uses lockup.svg proportions; for other arrangements add a variant here, do not re-typeset the wordmark.'],
  },
  schema,
  requiresLogo: true,
  refs: {renderPaths: ['mark.origin']},
  anchors: ['center', 'top', 'bottom', 'markCenter'],
  layout: (p, ctx) => {
    const k = p.width / 845;
    const cx = ctx.x(p.x);
    const cy = ctx.y(p.y);
    const left = cx - (845 * k) / 2;
    const top = cy - (690 * k) / 2;
    const markCenter = {x: left + (MARK_BOX.x + MARK_BOX.w / 2) * k, y: top + (MARK_BOX.y + MARK_BOX.h / 2) * k};
    const mAt = ctx.t(p.mark.at);
    let origin: Data['mark']['origin'] = markCenter;
    if (typeof p.mark.origin === 'string') origin = {path: p.mark.origin};
    else if (p.mark.origin) origin = {x: ctx.x(p.mark.origin.x), y: ctx.y(p.mark.origin.y)};
    return {
      anchors: {center: {x: cx, y: cy}, top: {x: cx, y: top}, bottom: {x: cx, y: top + 690 * k}, markCenter},
      data: {
        left,
        top,
        k,
        color: color(ctx.theme, p.color),
        mark: {at: mAt, duration: durationOf(ctx.theme, p.mark.duration, ctx.fps), origin},
        word: {at: ctx.t(p.wordmark.at), duration: durationOf(ctx.theme, p.wordmark.duration, ctx.fps)},
        exit: p.exit ? {at: ctx.t(p.exit.at), duration: durationOf(ctx.theme, p.exit.duration, ctx.fps)} : undefined,
      },
    };
  },
  component: ({params, rt}) => {
    const d = rt.layout;
    const logo = rt.theme.logo!;
    const lock = logo.lockup;
    const markPath = lock.paths[0];
    const wordPath = lock.paths[1];
    const {width: W, height: H} = rt.format;
    const f = rt.frame;
    const mp = params.mark.style === 'cut' ? (f >= d.mark.at ? 1 : 0) : progress(f, d.mark.at, d.mark.duration, ease(rt.theme, params.mark.ease, 'out'));
    const wp = params.wordmark.style === 'cut' ? (f >= d.word.at ? 1 : 0) : progress(f, d.word.at, d.word.duration, ease(rt.theme, params.wordmark.ease, 'out'));
    const xp = d.exit ? progress(f, d.exit.at, d.exit.duration, ease(rt.theme, 'in')) : 0;
    const id = rt.layer.id;
    const o = 'path' in d.mark.origin ? samplePath(rt.theme, rt.path(d.mark.origin.path).keys, d.mark.at) : d.mark.origin;
    // Iris radius that just covers the mark from the origin.
    const corners = [
      [d.left + MARK_BOX.x * d.k, d.top + MARK_BOX.y * d.k],
      [d.left + (MARK_BOX.x + MARK_BOX.w) * d.k, d.top + MARK_BOX.y * d.k],
      [d.left + MARK_BOX.x * d.k, d.top + (MARK_BOX.y + MARK_BOX.h) * d.k],
      [d.left + (MARK_BOX.x + MARK_BOX.w) * d.k, d.top + (MARK_BOX.y + MARK_BOX.h) * d.k],
    ];
    const R = Math.max(...corners.map(([x, y]) => Math.hypot(x - o.x, y - o.y)));
    const rest = mp >= 1 && wp >= 1 && xp === 0;
    const markRise = params.mark.style === 'rise' ? (1 - mp) * MARK_BOX.h * 1.05 : 0;
    const wordRise = params.wordmark.style === 'rise' ? (1 - wp) * WORD_BOX.h * 1.1 : 0;
    return (
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}} opacity={1 - xp}>
        <defs>
          <clipPath id={`${id}-iris`}>
            {params.mark.style === 'iris' ? (
              <circle cx={o.x} cy={o.y} r={Math.max(0, R * mp)} />
            ) : (
              <rect x={d.left + MARK_BOX.x * d.k - 2} y={d.top - 2} width={MARK_BOX.w * d.k + 4} height={MARK_BOX.h * d.k + 4} />
            )}
          </clipPath>
          <clipPath id={`${id}-word`} clipPathUnits="userSpaceOnUse">
            <rect x={d.left - 4} y={d.top + WORD_BOX.y * d.k - 2} width={WORD_BOX.w * d.k + 8} height={WORD_BOX.h * d.k + 4} />
          </clipPath>
        </defs>
        {mp > 0 ? (
          <g clipPath={`url(#${id}-iris)`} opacity={params.mark.style === 'fade' ? mp : 1}>
            <g transform={`translate(${d.left} ${d.top + markRise * d.k}) scale(${d.k})`}>
              <path d={markPath.d} transform={markPath.transform} fill={d.color} />
            </g>
          </g>
        ) : null}
        {wp > 0 ? (
          <g clipPath={`url(#${id}-word)`} opacity={params.wordmark.style === 'fade' ? wp : 1}>
            <g transform={`translate(${d.left} ${d.top + wordRise * d.k}) scale(${d.k})`}>
              <path d={wordPath.d} transform={wordPath.transform} fill={d.color} />
            </g>
          </g>
        ) : null}
        <rect {...rt.qa('mark', rest)} x={d.left} y={d.top} width={845 * d.k} height={690 * d.k} fill="none" />
      </svg>
    );
  },
  example: {
    duration: '2.5s',
    note: 'The lockup resolves: mark through an iris from its centre, wordmark rising after it.',
    params: {mark: {at: 4}, wordmark: {at: 16}},
  },
};
