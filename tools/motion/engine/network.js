// Operational network: modules (nodes) joined by wires (edges), built from the same particles as everything else.
// Gives every particle a slot (a cell inside a module, or a dot along a wire) and evaluates information flow:
// a wavefront that travels in flow order (node depth), lighting wires and modules as it passes.
import { clamp } from './math.js';

/**
 * nodes: [{id, x, y, depth}]  edges: [[fromId, toId], ...]
 * grid: cells per module side; cell: cell pitch; spacing: dot pitch along wires.
 */
export function network({ nodes, edges, grid = 5, cell = 18, spacing = 8, dotTotal }) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const half = (grid * cell) / 2, slots = [];
  for (const n of nodes) for (let gy = 0; gy < grid; gy++) for (let gx = 0; gx < grid; gx++)
    slots.push({ kind: 'cell', node: n.id, x: n.x - half + cell / 2 + gx * cell, y: n.y - half + cell / 2 + gy * cell, z: 0, flow: n.depth, ring: Math.max(Math.abs(gx - (grid - 1) / 2), Math.abs(gy - (grid - 1) / 2)) });
  // wires leave/enter at the module's border (square), not its centre
  const geo = edges.map(([a, b]) => { const A = byId[a], B = byId[b], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), gap = half / Math.max(Math.abs(dx), Math.abs(dy)) * len + 10; return { A, B, dx, dy, len, gap, run: len - 2 * gap }; });
  // dotTotal: spread exactly that many dots over all wires, proportional to length (so a fixed particle budget fills the system)
  const runSum = geo.reduce((s, g) => s + g.run, 0);
  let given = 0;
  const wires = edges.map(([a, b], e) => {
    const { A, B, dx, dy, len, gap, run } = geo[e], from = gap / len, to = 1 - gap / len;
    let count = dotTotal ? Math.round(dotTotal * run / runSum) : Math.floor(run / spacing);
    if (dotTotal && e === edges.length - 1) count = dotTotal - given;
    count = Math.max(2, count); given += count;
    for (let i = 0; i < count; i++) { const u = from + (to - from) * (i / (count - 1)); slots.push({ kind: 'dot', edge: e, u: (i / (count - 1)), x: A.x + dx * u, y: A.y + dy * u, z: 0, flow: A.depth + (B.depth - A.depth) * (i / (count - 1)) }); }
    return { a, b, e, A, B, from, to };
  });
  return { nodes, byId, edges: wires, slots, half, grid, cell };
}

/**
 * Flow intensity (0..1) at flow coordinate f, time t. Waves launch every `period` s from depth 0
 * and travel at `speed` depth units/s; `width` is the soft length of each packet.
 */
export function flowAt(f, t, { start = 0, speed = 3, period = 1.1, width = 0.35, waves = 99 } = {}) {
  if (t < start) return 0;
  let v = 0;
  for (let w = 0; w < waves; w++) {
    const front = (t - start - w * period) * speed;
    if (front < -width) break;
    const d = (f - front) / width;
    if (d > -1 && d < 3) v = Math.max(v, d < 0 ? 1 + d : Math.exp(-d * 1.6)); // sharp leading edge, soft decaying tail
  }
  return clamp(v);
}
