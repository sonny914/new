// The logo as particle targets, sampled from the brand's own vector (assets/brand/mark.svg by default).
// The SVG's path is filled into an alpha mask at its native viewBox size; most points land uniformly inside that mask
// (so the fill and the negative space keep the mark's exact proportions) and the rest on the path's outline (so the
// silhouette reads crisp). One uniform scale maps the viewBox into world units: never stretched, never redrawn.
import { rng } from './timeline.js';

/** Fetch and parse the SVG. Throws if it is missing or has no path: a reel never substitutes another shape. */
export async function loadLogo(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`logo: cannot load ${src} (${res.status})`);
  const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
  const svg = doc.querySelector('svg'), paths = [...doc.querySelectorAll('path')];
  if (!svg || !paths.length) throw new Error(`logo: ${src} has no <path> to sample`);
  const vb = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some(Number.isNaN)) throw new Error(`logo: ${src} needs a viewBox`);
  return { src, d: paths.map((p) => p.getAttribute('d')).join(' '), x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
}

/**
 * Sample n target points: { x, y, z } Float32Arrays in world units, centred on the mark, y up.
 * width: world width of the mark · depth: extrusion thickness · edge: share of points on the outline.
 */
export function sampleLogo(logo, n, { width = 2.4, depth = 0.12, edge = 0.25, seed = 7 } = {}) {
  const rnd = rng(seed);
  const W = Math.round(logo.w), H = Math.round(logo.h);
  const mask = Object.assign(document.createElement('canvas'), { width: W, height: H }).getContext('2d', { willReadFrequently: true });
  mask.translate(-logo.x, -logo.y);
  const path = new Path2D(logo.d);
  mask.fill(path);
  const alpha = mask.getImageData(0, 0, W, H).data;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && alpha[((y | 0) * W + (x | 0)) * 4 + 3] > 127;

  // the outline, measured along the real path
  const ns = 'http://www.w3.org/2000/svg', host = document.createElementNS(ns, 'svg'), el = document.createElementNS(ns, 'path');
  host.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden'); el.setAttribute('d', logo.d);
  host.appendChild(el); document.body.appendChild(host);
  const total = el.getTotalLength();

  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
  const ne = Math.round(n * edge);
  for (let j = 0; j < ne; j++) {
    const p = el.getPointAtLength((total * (j + rnd())) / ne);
    px[j] = p.x - logo.x; py[j] = p.y - logo.y; pz[j] = (rnd() - 0.5) * depth;
  }
  host.remove();
  let tries = 0;
  for (let j = ne; j < n; j++) {
    let x, y;
    do { x = rnd() * W; y = rnd() * H; if (++tries > n * 200) throw new Error('logo: mask is empty'); } while (!inside(x, y));
    px[j] = x; py[j] = y; pz[j] = (rnd() - 0.5) * depth;
  }
  const s = width / logo.w, x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n);
  for (let j = 0; j < n; j++) { x[j] = (px[j] - W / 2) * s; y[j] = -(py[j] - H / 2) * s; z[j] = pz[j]; }
  return { x, y, z, mask: { W, H, alpha }, scale: s };
}
