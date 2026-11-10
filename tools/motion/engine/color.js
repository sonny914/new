// Colour: palette tokens and exact mixing in sRGB (fine at these small blends; keeps brand hexes exact at 0 and 1).
// Accepts and returns #rrggbb, so mixes can be chained (mix(mix(a, b, .4), c, k)).
const rgb = (h) => (h[0] === '#' ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : h.match(/\d+/g).slice(0, 3).map(Number));
const hex = (v) => '#' + v.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
export function mix(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const A = rgb(a), B = rgb(b);
  return hex(A.map((v, i) => v + (B[i] - v) * k));
}
/** Quiet Bands palettes. `brief` = the palette named in the video brief; `brand` = assets/brand + qb-identity (current site). */
export const PALETTES = {
  // Motion Lab spec v2: five tones. ink = primary illustration, ink2 = secondary, tech = technical lines.
  film: { bg: '#08090B', ink: '#F6F4EE', ink2: '#B8B9B7', tech: '#62666B', live: '#FF6A21' },
  brief: { bg: '#0E0F10', ink: '#F6F4EE', live: '#FF6A21' },
  // brand = assets/brand + qb-identity. ink2/tech are the cream at 72% / 40% over black (secondary, technical).
  brand: { bg: '#000000', ink: '#F2EEE5', ink2: '#AEABA5', tech: '#615F5C', live: '#FF5A00' },
};
