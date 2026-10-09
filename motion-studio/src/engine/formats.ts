// Canvas formats and their safe areas. Safe areas keep type and key marks clear of the platform
// UI that sits over vertical and feed video (caption, buttons, progress bar).

export interface Safe {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Format {
  id: string;
  width: number;
  height: number;
  safe: Safe;
  label: string;
}

export const FORMATS: Record<string, Format> = {
  story: {
    id: 'story',
    label: '9:16 vertical (Reels, TikTok, Shorts)',
    width: 1080,
    height: 1920,
    // Bottom clears caption + action rail; top clears the account row.
    safe: {top: 240, right: 96, bottom: 400, left: 96},
  },
  square: {id: 'square', label: '1:1 feed', width: 1080, height: 1080, safe: {top: 80, right: 80, bottom: 80, left: 80}},
  portrait: {id: 'portrait', label: '4:5 feed', width: 1080, height: 1350, safe: {top: 96, right: 88, bottom: 120, left: 88}},
  landscape: {id: 'landscape', label: '16:9', width: 1920, height: 1080, safe: {top: 72, right: 120, bottom: 96, left: 120}},
};

export type FormatInput = string | {width: number; height: number; safe?: Partial<Safe>};

export function resolveFormat(input: FormatInput): Format {
  if (typeof input === 'string') {
    const f = FORMATS[input];
    if (!f) throw new Error(`Unknown format "${input}". Known: ${Object.keys(FORMATS).join(', ')}, or {width, height}.`);
    return f;
  }
  const m = Math.round(Math.min(input.width, input.height) * 0.07);
  return {
    id: 'custom',
    label: `${input.width}x${input.height}`,
    width: input.width,
    height: input.height,
    safe: {top: m, right: m, bottom: m, left: m, ...input.safe},
  };
}

/** The content rectangle inside the safe area. */
export function contentBox(f: Format) {
  const left = f.safe.left;
  const top = f.safe.top;
  const right = f.width - f.safe.right;
  const bottom = f.height - f.safe.bottom;
  return {left, top, right, bottom, width: right - left, height: bottom - top, cx: (left + right) / 2, cy: (top + bottom) / 2};
}
