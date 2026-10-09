// Real glyph measurement in the browser. Text is measured with the same SVG text layout that
// draws it, so per-glyph positions (kerning included) match the render exactly. Results are
// cached per text + style: a project measures each string once per render tab.
import type {Measurer, TextMetrics, TextStyle} from './types';

const NS = 'http://www.w3.org/2000/svg';
const cache = new Map<string, TextMetrics>();
let host: SVGSVGElement | null = null;
let canvas: CanvasRenderingContext2D | null = null;

function svgHost(): SVGSVGElement {
  if (!host) {
    host = document.createElementNS(NS, 'svg');
    host.setAttribute('width', '8000');
    host.setAttribute('height', '2000');
    host.style.cssText = 'position:absolute;left:-20000px;top:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(host);
  }
  return host;
}

export function fontCss(style: TextStyle, family: string, fallback: string) {
  return {
    fontFamily: `"${family}", ${fallback}`,
    fontSize: `${style.size}px`,
    fontWeight: style.weight,
    fontStretch: `${style.width}%`,
    letterSpacing: `${style.tracking}em`,
    fontKerning: 'normal' as const,
  };
}

const STRETCH: [number, CanvasFontStretch][] = [
  [62.5, 'extra-condensed'],
  [75, 'condensed'],
  [87.5, 'semi-condensed'],
  [100, 'normal'],
  [112.5, 'semi-expanded'],
  [125, 'expanded'],
];

/** Ink metrics from canvas (cap height, side bearings), at the nearest keyword width. */
function ink(style: TextStyle, first: string, last: string) {
  if (!canvas) canvas = document.createElement('canvas').getContext('2d');
  const ctx = canvas!;
  ctx.font = `${style.weight} 200px "${style.family}"`;
  ctx.fontStretch = STRETCH.reduce((a, b) => (Math.abs(b[0] - style.width) < Math.abs(a[0] - style.width) ? b : a))[1];
  const k = style.size / 200;
  const f = ctx.measureText(first || 'H');
  const l = ctx.measureText(last || 'H');
  return {
    capHeight: ctx.measureText('H').actualBoundingBoxAscent * k,
    left: -f.actualBoundingBoxLeft * k,
    right: l.actualBoundingBoxRight * k,
  };
}

export const browserMeasure: Measurer = (text, style) => {
  const key = `${style.family}|${style.size}|${style.weight}|${style.width}|${style.tracking}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const el = document.createElementNS(NS, 'text');
  el.setAttribute('x', '0');
  el.setAttribute('y', '1000');
  Object.assign(el.style, fontCss(style, style.family, 'sans-serif'));
  el.textContent = text || ' ';
  svgHost().appendChild(el);
  const n = el.getNumberOfChars();
  const chars = [...text];
  const xs: number[] = [];
  for (let i = 0; i < n; i++) xs.push(el.getStartPositionOfChar(i).x);
  const total = el.getComputedTextLength();
  const trailing = style.tracking * style.size;
  const glyphs = chars.map((char, i) => {
    const next = i + 1 < xs.length ? xs[i + 1] : total;
    const advance = next - xs[i] - (i === chars.length - 1 ? trailing : 0);
    return {char, x: xs[i], advance};
  });
  const ext = n ? el.getExtentOfChar(0) : {y: 1000 - style.size, height: style.size * 1.2};
  const ascent = 1000 - ext.y;
  const descent = ext.height - ascent;
  el.remove();
  const last = glyphs[glyphs.length - 1];
  const inkM = ink(style, chars[0], chars[chars.length - 1]);
  const m: TextMetrics = {
    width: last ? last.x + last.advance : 0,
    glyphs,
    ascent,
    descent,
    capHeight: inkM.capHeight,
    inkLeft: inkM.left,
    inkRight: last ? last.x + inkM.right : 0,
  };
  cache.set(key, m);
  return m;
};
