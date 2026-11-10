// 2.5D camera. World units are pixels at zoom 1 on the z = 0 plane. Points with z > 0 sit further away and
// shrink toward the vanishing point; a moving camera then gives true parallax instead of a flat pan.
export function camera({ W, H, x = 0, y = 0, zoom = 1, focal = 1400, rot = 0 }) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const scaleAt = (z = 0) => zoom * focal / Math.max(80, focal + z);
  return {
    W, H, x, y, zoom, focal, rot, scaleAt,
    /** world -> screen; returns {x, y, s} where s is the on-screen scale of a unit at that depth. */
    project(p) {
      const s = scaleAt(p.z ?? 0), dx = (p.x - x) * s, dy = (p.y - y) * s;
      return { x: W / 2 + dx * cs - dy * sn, y: H / 2 + dx * sn + dy * cs, s };
    },
  };
}
