// Position expressions. A config places things in the unit that reads best, and can pin one
// element to another's measured geometry:
//   540            px
//   "50%"          of canvas width (for x) or height (for y)
//   "center"       canvas centre
//   "safe.left"    content-box edge: safe.left | safe.right | safe.top | safe.bottom | safe.cx | safe.cy
//   "@title.end"   an anchor another layer published after layout (here: where its text ends)
//   any of those + or - an offset: "safe.left+24", "@title.baseline-12", "center+10%"
import {contentBox, type Format} from './formats';
import type {Point} from './keyframes';

export type PosExpr = number | string;
export type Axis = 'x' | 'y';
export type Anchors = Record<string, Point>;

export class PositionError extends Error {}

export interface PositionContext {
  format: Format;
  anchors: Anchors;
}

const BASE = /^(@[a-z][a-z0-9-]*\.[a-zA-Z][a-zA-Z0-9]*|center|safe\.(?:left|right|top|bottom|cx|cy)|-?\d+(?:\.\d+)?%?)\s*(?:([+-])\s*(\d+(?:\.\d+)?)(%?))?$/;

function percent(n: number, axis: Axis, f: Format) {
  return (n / 100) * (axis === 'x' ? f.width : f.height);
}

export function resolvePos(expr: PosExpr, axis: Axis, ctx: PositionContext): number {
  if (typeof expr === 'number') return expr;
  const s = expr.trim();
  const m = s.match(BASE);
  if (!m) throw new PositionError(`Cannot read position "${expr}". Examples: 540, "50%", "safe.left+24", "@title.end".`);
  const [, base, sign, off, offPct] = m;
  let v: number;
  if (base.startsWith('@')) {
    const key = base.slice(1);
    const a = ctx.anchors[key];
    if (!a) {
      const [layer] = key.split('.');
      const known = Object.keys(ctx.anchors).filter((k) => k.startsWith(`${layer}.`));
      throw new PositionError(
        known.length
          ? `Anchor "${base}" does not exist. "${layer}" publishes: ${known.map((k) => '@' + k).join(', ')}.`
          : `Anchor "${base}" is not available: no layer "${layer}" has been laid out before this one (check the id, and that it is not a forward reference).`,
      );
    }
    v = a[axis];
  } else if (base === 'center') {
    v = axis === 'x' ? ctx.format.width / 2 : ctx.format.height / 2;
  } else if (base.startsWith('safe.')) {
    const box = contentBox(ctx.format);
    const k = base.slice(5) as 'left' | 'right' | 'top' | 'bottom' | 'cx' | 'cy';
    v = box[k];
  } else if (base.endsWith('%')) {
    v = percent(Number(base.slice(0, -1)), axis, ctx.format);
  } else {
    v = Number(base);
  }
  if (sign) {
    const n = offPct ? percent(Number(off), axis, ctx.format) : Number(off);
    v = sign === '+' ? v + n : v - n;
  }
  return v;
}

/** Layer ids an expression depends on (for ordering layout). */
export function anchorDeps(expr: unknown): string[] {
  if (typeof expr !== 'string') return [];
  const m = expr.trim().match(/^@([a-z][a-z0-9-]*)\./);
  return m ? [m[1]] : [];
}
