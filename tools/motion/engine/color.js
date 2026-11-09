// Colour: palette tokens and exact mixing in sRGB (fine at these small blends; keeps brand hexes exact at 0 and 1).
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}
/** Quiet Bands palettes. `brief` = the palette named in the video brief; `brand` = assets/brand + qb-identity (current site). */
export const PALETTES = {
  brief: { bg: '#0E0F10', ink: '#F6F4EE', live: '#FF6A21' },
  brand: { bg: '#000000', ink: '#F2EEE5', live: '#FF5A00' },
};
