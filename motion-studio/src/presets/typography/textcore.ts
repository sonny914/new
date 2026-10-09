// Typography engine core: layout and per-frame evaluation for glyph-, word- and line-level
// motion. Pure functions, so timing is unit-tested without a browser; the components only draw.
import {z} from 'zod';
import {EaseZ, PosExprZ, TimeExprZ} from '../../engine/config/schema';
import {ease, lerp, progress, type EaseSpec} from '../../engine/easing';
import type {LayoutContext, ResolvedLayer, TextStyle} from '../../engine/types';
import {color} from '../../themes';
import type {Theme} from '../../themes/types';

const SIZE_TOKENS = ['micro', 'caption', 'body', 'subhead', 'title'] as const;
const DUR = z.union([z.number().nonnegative(), z.enum(['micro', 'short', 'base', 'long', 'hold'])]);
const STAG = z.union([z.number().nonnegative(), z.enum(['tight', 'base', 'loose'])]);

export const EnterZ = z
  .object({
    style: z.enum(['rise', 'track', 'fade', 'cut']).default('rise'),
    stagger: STAG.default('tight'),
    duration: DUR.default('base'),
    ease: EaseZ.optional(),
    /** track: how far apart glyphs start, in em per glyph from centre. */
    spread: z.number().default(0.5),
  })
  .strict();

export const ChangeZ = z
  .object({
    /** swap: glyphs shared by both words slide into place while the others roll through the slot. rise: the whole word rolls. */
    style: z.enum(['swap', 'rise']).default('swap'),
    stagger: STAG.default('base'),
    duration: DUR.default('base'),
    /** Frames for shared glyphs to slide to their new positions. */
    slide: DUR.default('long'),
    ease: EaseZ.optional(),
  })
  .strict();

export const ExitZ = z
  .object({
    at: TimeExprZ,
    style: z.enum(['drop', 'rise', 'fade', 'cut']).default('drop'),
    stagger: STAG.default('tight'),
    duration: DUR.default('short'),
    ease: EaseZ.optional(),
  })
  .strict();

export function textParams(defaults: {size: number | 'fit' | (typeof SIZE_TOKENS)[number]; weight: string | number; width: string | number; tracking: string | number; by: 'glyph' | 'word' | 'line'}) {
  return z
    .object({
      /** A single line of text. Use `states` instead for a word that changes. */
      text: z.string().min(1).optional(),
      /** Successive texts for one typographic object; each takes over at `at` through `change`. */
      states: z.array(z.object({text: z.string().min(1), at: TimeExprZ}).strict()).min(1).optional(),
      /** When the first text enters (defaults to the layer's `from`). */
      at: TimeExprZ.optional(),
      x: PosExprZ.default('safe.left'),
      /** Baseline. */
      y: PosExprZ.default('safe.cy'),
      align: z.enum(['left', 'center', 'right']).default('left'),
      /** Align the ink, not the side bearing, to x. Matters at display sizes. */
      optical: z.boolean().default(true),
      size: z.union([z.number().positive(), z.enum(['fit', ...SIZE_TOKENS])]).default(defaults.size),
      /** fit: width in px to fill (defaults to the safe content width). */
      fitWidth: z.number().positive().optional(),
      /** fit: which text sets the size. */
      fitTo: z.enum(['first', 'widest']).default('widest'),
      maxSize: z.number().positive().optional(),
      weight: z.union([z.number(), z.enum(['light', 'regular', 'medium', 'bold', 'heavy', 'black'])]).default(defaults.weight as never),
      width: z.union([z.number().min(50).max(150), z.enum(['condensed', 'normal', 'expanded'])]).default(defaults.width as never),
      tracking: z.union([z.number(), z.enum(['tight', 'normal', 'label'])]).default(defaults.tracking as never),
      /** Copy size, weight, width and tracking from another type layer, so lines set as one. */
      like: z.string().optional(),
      color: z.string().default('ink'),
      /** Stroke width for outlined type; 0 draws solid. */
      outline: z.number().nonnegative().default(0),
      by: z.enum(['glyph', 'word', 'line']).default(defaults.by),
      enter: EnterZ.default({}),
      change: ChangeZ.default({}),
      exit: ExitZ.optional(),
    })
    .strict()
    .refine((p) => Boolean(p.text) !== Boolean(p.states), {message: 'Give either "text" or "states", not both.'});
}

export type TextParams = z.output<ReturnType<typeof textParams>>;

export const durationOf = (theme: Theme, v: number | string, fps: number) =>
  typeof v === 'number' ? v : (theme.motion.duration as Record<string, number>)[v] * (fps / 30);
export const staggerOf = (theme: Theme, v: number | string, fps: number) =>
  typeof v === 'number' ? v : (theme.motion.stagger as Record<string, number>)[v] * (fps / 30);

export interface PlacedGlyph {
  char: string;
  /** Absolute x of the glyph origin. */
  x: number;
  unit: number;
}

export interface TextState {
  text: string;
  at: number;
  x0: number;
  width: number;
  glyphs: PlacedGlyph[];
  inkLeft: number;
  inkRight: number;
}

export interface Mapping {
  /** Same character in both words: slides to its new place. */
  pairs: [number, number][];
  /** Different characters sharing a slot: roll through it together, old above new, like an odometer. */
  swaps: [number, number][];
  /** Leftovers when the words differ in length. */
  outs: number[];
  ins: number[];
}

export interface TextLayout {
  family: string;
  fallback: string;
  style: TextStyle;
  color: string;
  outline: number;
  baseline: number;
  capHeight: number;
  ascent: number;
  descent: number;
  clip: {top: number; bottom: number};
  rise: number;
  states: TextState[];
  changes: Mapping[];
  enter: {style: string; stagger: number; duration: number; ease: EaseSpec; spread: number};
  change: {style: string; stagger: number; duration: number; slide: number; ease: EaseSpec};
  exit?: {at: number; style: string; stagger: number; duration: number; ease: EaseSpec};
  by: 'glyph' | 'word' | 'line';
}

/**
 * Match glyphs between two words: the longest common subsequence, preferring pairs that keep
 * their index, so COMPLEXITY → SIMPLICITY keeps M P L I T Y in place and swaps only C O E X.
 */
export function matchGlyphs(a: string[], b: string[]): Mapping {
  const n = a.length;
  const m = b.length;
  // dp[i][j] = [length, -cost] for a[i..], b[j..]
  const len: number[][] = Array.from({length: n + 1}, () => Array(m + 1).fill(0));
  const cost: number[][] = Array.from({length: n + 1}, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) {
      let bl = len[i + 1][j];
      let bc = cost[i + 1][j];
      if (len[i][j + 1] > bl || (len[i][j + 1] === bl && cost[i][j + 1] < bc)) {
        bl = len[i][j + 1];
        bc = cost[i][j + 1];
      }
      if (a[i] === b[j] && a[i] !== ' ') {
        const l = len[i + 1][j + 1] + 1;
        const c = cost[i + 1][j + 1] + Math.abs(i - j);
        if (l > bl || (l === bl && c < bc)) {
          bl = l;
          bc = c;
        }
      }
      len[i][j] = bl;
      cost[i][j] = bc;
    }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j] && a[i] !== ' ' && len[i][j] === len[i + 1][j + 1] + 1 && cost[i][j] === cost[i + 1][j + 1] + Math.abs(i - j)) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (len[i + 1][j] === len[i][j] && cost[i + 1][j] === cost[i][j]) i++;
    else j++;
  }
  // Between consecutive matched pairs, zip the unmatched glyphs of each word into rolling slots.
  const swaps: [number, number][] = [];
  const outs: number[] = [];
  const ins: number[] = [];
  const bounds: [number, number][] = [[-1, -1], ...pairs, [n, m]];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const ga = [];
    const gb = [];
    for (let x = bounds[k][0] + 1; x < bounds[k + 1][0]; x++) if (a[x] !== ' ') ga.push(x);
    for (let y = bounds[k][1] + 1; y < bounds[k + 1][1]; y++) if (b[y] !== ' ') gb.push(y);
    const z = Math.min(ga.length, gb.length);
    for (let q = 0; q < z; q++) swaps.push([ga[q], gb[q]]);
    outs.push(...ga.slice(z));
    ins.push(...gb.slice(z));
  }
  return {pairs, swaps, outs, ins};
}

const isCaps = (texts: string[]) => texts.every((t) => !/[a-z,;]/.test(t));

function unitsFor(text: string, by: TextLayout['by']): number[] {
  let w = 0;
  return [...text].map((c, i) => {
    if (by === 'line') return 0;
    if (by === 'glyph') return i;
    const u = w;
    if (c === ' ') w++;
    return u;
  });
}

export function resolveTextStyle(p: TextParams, ctx: LayoutContext): {style: TextStyle; fit: boolean} {
  const {theme} = ctx;
  if (p.like) {
    const other = ctx.layoutOf<TextLayout>(p.like);
    if (!other?.style) throw new Error(`"like": layer "${p.like}" is not a type layer.`);
    return {style: {...other.style}, fit: false};
  }
  const weight = typeof p.weight === 'number' ? p.weight : theme.weight[p.weight];
  const width = typeof p.width === 'number' ? p.width : theme.width[p.width];
  const tracking = typeof p.tracking === 'number' ? p.tracking : theme.tracking[p.tracking];
  const fit = p.size === 'fit';
  const size = typeof p.size === 'number' ? p.size : p.size === 'fit' ? 100 : theme.type[p.size] * ctx.unit;
  return {style: {family: theme.font.display.family, size, weight, width, tracking}, fit};
}

export function layoutText(p: TextParams, ctx: LayoutContext, layer: ResolvedLayer): TextLayout {
  const {theme, fps} = ctx;
  const statesIn = p.states ?? [{text: p.text!, at: p.at ?? layer.from}];
  const texts = statesIn.map((s) => s.text);
  const {style, fit} = resolveTextStyle(p, ctx);
  if (fit) {
    const target = p.fitWidth ?? ctx.format.width - ctx.format.safe.left - ctx.format.safe.right;
    const widths = texts.map((t) => {
      const m = ctx.measure(t, {...style, size: 100});
      return m.inkRight - m.inkLeft;
    });
    const ref = p.fitTo === 'first' ? widths[0] : Math.max(...widths);
    style.size = Math.round(((target / ref) * 100) * 100) / 100;
    if (p.maxSize) style.size = Math.min(style.size, p.maxSize);
  }
  const x = ctx.x(p.x);
  const baseline = ctx.y(p.y);
  let capHeight = 0;
  let ascent = 0;
  let descent = 0;
  const states: TextState[] = statesIn.map((s, i) => {
    const m = ctx.measure(s.text, style);
    capHeight = m.capHeight;
    ascent = m.ascent;
    descent = m.descent;
    const inkW = m.inkRight - m.inkLeft;
    const left = p.optical ? m.inkLeft : 0;
    const w = p.optical ? inkW : m.width;
    const x0 = (p.align === 'left' ? x : p.align === 'center' ? x - w / 2 : x - w) - left;
    const units = unitsFor(s.text, p.by);
    return {
      text: s.text,
      at: ctx.t(i === 0 && !p.states ? (p.at ?? layer.from) : s.at),
      x0,
      width: m.width,
      inkLeft: x0 + m.inkLeft,
      inkRight: x0 + m.inkRight,
      glyphs: m.glyphs.map((g, k) => ({char: g.char, x: x0 + g.x, unit: units[k]})),
    };
  });
  for (let i = 1; i < states.length; i++)
    if (states[i].at <= states[i - 1].at) throw new Error(`states[${i}] starts at ${states[i].at}, not after states[${i - 1}] (${states[i - 1].at}).`);
  const caps = isCaps(texts);
  const pad = style.size * 0.07;
  const clip = caps
    ? {top: baseline - capHeight - pad, bottom: baseline + (texts.some((t) => /Q/.test(t)) ? descent * 0.6 : pad)}
    : {top: baseline - ascent, bottom: baseline + descent};
  return {
    family: style.family,
    fallback: theme.font.display.fallback,
    style,
    color: color(theme, p.color),
    outline: p.outline,
    baseline,
    capHeight,
    ascent,
    descent,
    clip,
    rise: clip.bottom - clip.top + 2,
    states,
    changes: states.slice(1).map((s, i) => matchGlyphs([...states[i].text], [...s.text])),
    enter: {
      style: p.enter.style,
      stagger: staggerOf(theme, p.enter.stagger, fps),
      duration: durationOf(theme, p.enter.duration, fps),
      ease: p.enter.ease,
      spread: p.enter.spread,
    },
    change: {
      style: p.change.style,
      stagger: staggerOf(theme, p.change.stagger, fps),
      duration: durationOf(theme, p.change.duration, fps),
      slide: durationOf(theme, p.change.slide, fps),
      ease: p.change.ease,
    },
    exit: p.exit
      ? {
          at: ctx.t(p.exit.at),
          style: p.exit.style,
          stagger: staggerOf(theme, p.exit.stagger, fps),
          duration: durationOf(theme, p.exit.duration, fps),
          ease: p.exit.ease,
        }
      : undefined,
    by: p.by,
  };
}

export interface GlyphFrame {
  key: string;
  char: string;
  x: number;
  /** -1 = fully above the slot, 0 = at rest, 1 = fully below. */
  dy: number;
  opacity: number;
}

/** When a text state has fully arrived (for reading-time checks and rest detection). */
export function arrivedAt(d: TextLayout, stateIndex: number): number {
  const s = d.states[stateIndex];
  if (stateIndex === 0) {
    const units = Math.max(...s.glyphs.map((g) => g.unit), 0);
    return s.at + units * d.enter.stagger + (d.enter.style === 'cut' ? 0 : d.enter.duration);
  }
  const map = d.changes[stateIndex - 1];
  const inDelay = Math.round(d.change.duration * 0.35);
  const rolls = map.swaps.length ? (map.swaps.length - 1) * d.change.stagger + d.change.duration : 0;
  const lastIn = map.ins.length ? (map.ins.length - 1) * d.change.stagger + inDelay + d.change.duration : 0;
  return s.at + Math.max(rolls, lastIn, map.pairs.length || map.swaps.length ? d.change.slide : 0);
}

export function evaluateText(d: TextLayout, frame: number, theme: Theme): {glyphs: GlyphFrame[]; rest: boolean; state: number} {
  const easeOut = ease(theme, d.enter.ease, 'out');
  let k = -1;
  for (let i = 0; i < d.states.length; i++) if (frame >= d.states[i].at) k = i;
  if (k < 0) return {glyphs: [], rest: false, state: -1};
  const s = d.states[k];
  let glyphs: GlyphFrame[];
  if (k === 0) {
    const n = s.glyphs.length;
    const mid = (s.glyphs[0].x + s.glyphs[n - 1].x) / 2;
    glyphs = s.glyphs.map((g, i) => {
      const p = d.enter.style === 'cut' ? (frame >= s.at ? 1 : 0) : progress(frame, s.at + g.unit * d.enter.stagger, d.enter.duration, easeOut);
      if (d.enter.style === 'track')
        return {key: `0-${i}`, char: g.char, x: g.x + (g.x - mid) * d.enter.spread * (1 - p), dy: 0, opacity: p};
      if (d.enter.style === 'fade') return {key: `0-${i}`, char: g.char, x: g.x, dy: 0, opacity: p};
      return {key: `0-${i}`, char: g.char, x: g.x, dy: 1 - p, opacity: p > 0 ? 1 : 0};
    });
  } else {
    const prev = d.states[k - 1];
    const map = d.changes[k - 1];
    const ch = d.change;
    const out = ease(theme, ch.ease, 'in');
    const inn = ease(theme, ch.ease, 'out');
    const slide = ease(theme, undefined, 'inOut');
    const inDelay = Math.round(ch.duration * 0.35);
    glyphs = [];
    if (ch.style === 'swap') {
      const roll = ease(theme, ch.ease, 'inOut');
      const sp = progress(frame, s.at, ch.slide, slide);
      map.swaps.forEach(([i, j], order) => {
        // Old and new travel as one strip: the new glyph is exactly one slot below the old.
        const p = progress(frame, s.at + order * ch.stagger, ch.duration, roll);
        const x = lerp(prev.glyphs[i].x, s.glyphs[j].x, sp);
        if (p < 1) glyphs.push({key: `${k - 1}-${i}`, char: prev.glyphs[i].char, x, dy: -p, opacity: 1});
        if (p > 0) glyphs.push({key: `${k}-${j}`, char: s.glyphs[j].char, x, dy: 1 - p, opacity: 1});
      });
      map.outs.forEach((i, order) => {
        const p = progress(frame, s.at + order * ch.stagger, ch.duration, out);
        if (p < 1) glyphs.push({key: `${k - 1}-${i}`, char: prev.glyphs[i].char, x: prev.glyphs[i].x, dy: -p, opacity: 1});
      });
      map.pairs.forEach(([i, j]) => {
        glyphs.push({key: `${k}-${j}`, char: s.glyphs[j].char, x: lerp(prev.glyphs[i].x, s.glyphs[j].x, sp), dy: 0, opacity: 1});
      });
      map.ins.forEach((j, order) => {
        const p = progress(frame, s.at + inDelay + order * ch.stagger, ch.duration, inn);
        glyphs.push({key: `${k}-${j}`, char: s.glyphs[j].char, x: s.glyphs[j].x, dy: 1 - p, opacity: p > 0 ? 1 : 0});
      });
    } else {
      prev.glyphs.forEach((g, i) => {
        const p = progress(frame, s.at + g.unit * ch.stagger, ch.duration, out);
        if (p < 1) glyphs.push({key: `${k - 1}-${i}`, char: g.char, x: g.x, dy: -p, opacity: 1});
      });
      s.glyphs.forEach((g, j) => {
        const p = progress(frame, s.at + inDelay + g.unit * ch.stagger, ch.duration, inn);
        glyphs.push({key: `${k}-${j}`, char: g.char, x: g.x, dy: 1 - p, opacity: p > 0 ? 1 : 0});
      });
    }
  }
  let rest = frame >= arrivedAt(d, k);
  if (d.exit && frame >= d.exit.at) {
    rest = false;
    const x = d.exit;
    const fn = ease(theme, x.ease, 'in');
    const units = new Map<string, number>();
    const cur = d.states[k];
    cur.glyphs.forEach((g, j) => units.set(`${k}-${j}`, g.unit));
    glyphs = glyphs.map((g, idx) => {
      const unit = units.get(g.key) ?? idx;
      const p = x.style === 'cut' ? 1 : progress(frame, x.at + unit * x.stagger, x.duration, fn);
      if (x.style === 'fade') return {...g, opacity: g.opacity * (1 - p)};
      if (x.style === 'cut') return {...g, opacity: 0};
      return {...g, dy: g.dy + (x.style === 'drop' ? p : -p)};
    });
  }
  // Reading order (left to right, outgoing before incoming in a shared slot).
  const visible = glyphs.filter((g) => g.opacity > 0 && Math.abs(g.dy) < 1).sort((a, b) => a.x - b.x || a.dy - b.dy);
  return {glyphs: visible, rest, state: k};
}

/** Text rest windows for reading-time checks: [arrived, leaves) per state. */
export function restWindows(d: TextLayout, end: number): {text: string; from: number; to: number}[] {
  return d.states.map((s, i) => ({
    text: s.text,
    from: arrivedAt(d, i),
    to: i + 1 < d.states.length ? d.states[i + 1].at : (d.exit?.at ?? end),
  }));
}
