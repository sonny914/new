// Small pieces several presets share: duration/stagger tokens, boxes, and dash maths for drawing
// a segment of any SVG path.
import {z} from 'zod';
import {PosExprZ} from '../engine/config/schema';
import type {LayoutContext} from '../engine/types';

export const DurZ = z.union([z.number().nonnegative(), z.enum(['micro', 'short', 'base', 'long', 'hold'])]);
export const PointZ = z.object({x: PosExprZ, y: PosExprZ}).strict();
export const BoxZ = z
  .object({left: PosExprZ.default('safe.left'), top: PosExprZ.default('safe.top'), right: PosExprZ.default('safe.right'), bottom: PosExprZ.default('safe.bottom')})
  .strict();

export function box(ctx: LayoutContext, b: z.output<typeof BoxZ>) {
  const left = ctx.x(b.left);
  const top = ctx.y(b.top);
  const right = ctx.x(b.right);
  const bottom = ctx.y(b.bottom);
  if (right <= left || bottom <= top) throw new Error(`Box is empty: ${left},${top} → ${right},${bottom}.`);
  return {left, top, right, bottom, width: right - left, height: bottom - top};
}

/** Dash props that show only the [s, e] fraction (0..1) of a path of length `len`. */
export function dashSegment(len: number, s: number, e: number): {strokeDasharray: string; strokeDashoffset: number} | {visibility: 'hidden'} {
  const a = Math.max(0, Math.min(1, s));
  const b = Math.max(0, Math.min(1, e));
  if (b - a <= 1e-4) return {visibility: 'hidden'};
  return {strokeDasharray: `${((b - a) * len).toFixed(2)} ${(len * 2).toFixed(2)}`, strokeDashoffset: -a * len};
}

export const rectPath = (x: number, y: number, w: number, h: number) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
