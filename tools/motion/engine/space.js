// 2.5D world space. Units are metres; y is up, z runs away from the camera. A real pinhole camera with
// yaw and pitch, so the floor, its grid and its light pools recede correctly and a camera move gives true parallax.
// Upright artwork is drawn on "panels": rectangles in space whose 2D content is mapped through an affine fit.
export function cam3({ W, H, pos, yaw = 0, pitch = 0, f = 1700 }) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const view = (p) => {
    const x = p.x - pos.x, y = p.y - pos.y, z = p.z - pos.z;
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    return { x: x1, y: y * cp + z1 * sp, z: -y * sp + z1 * cp };
  };
  return {
    W, H, f, pos,
    view,
    /** world -> screen {x, y, s (px per metre at that depth), z (depth)}; null behind the camera */
    project(p) { const v = view(p); if (v.z < 0.05) return null; const s = f / v.z; return { x: W / 2 + v.x * s, y: H / 2 - v.y * s, s, z: v.z }; },
  };
}

/**
 * Draw 2D artwork onto a rectangle standing in space. c = centre of the panel's bottom edge, w/h in metres,
 * yaw turns it about its vertical axis (positive turns its face toward -x). draw(ctx, w, h) works in metres,
 * origin top-left, y down. Returns the projected scale, so line widths can be kept in screen pixels.
 */
export function panel(ctx, cam, c, w, h, yaw, draw) {
  const rx = Math.cos(yaw) * w, rz = Math.sin(yaw) * w;
  const tl = cam.project({ x: c.x - rx / 2, y: c.y + h, z: c.z - rz / 2 });
  const tr = cam.project({ x: c.x + rx / 2, y: c.y + h, z: c.z + rz / 2 });
  const bl = cam.project({ x: c.x - rx / 2, y: c.y, z: c.z - rz / 2 });
  if (!tl || !tr || !bl) return null;
  ctx.save();
  ctx.transform((tr.x - tl.x) / w, (tr.y - tl.y) / w, (bl.x - tl.x) / h, (bl.y - tl.y) / h, tl.x, tl.y);
  const s = Math.hypot(tr.x - tl.x, tr.y - tl.y) / w;
  draw(ctx, w, h, s);
  ctx.restore();
  return s;
}

/** Upright billboard facing the camera, anchored at its base point. draw(ctx, s) works in metres, y up = negative. */
export function billboard(ctx, cam, base, draw) {
  const p = cam.project(base); if (!p) return null;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s); draw(ctx, p.s, p); ctx.restore();
  return p;
}

/** A polyline on the floor (y = 0) or any 3D polyline, projected. */
export function path3(ctx, cam, pts) {
  ctx.beginPath(); let started = false;
  for (const q of pts) { const p = cam.project(q); if (!p) { started = false; continue; } if (started) ctx.lineTo(p.x, p.y); else { ctx.moveTo(p.x, p.y); started = true; } }
}
/** Circle on the floor at (cx, cz) radius r, as a projected polygon. */
export function floorCircle(ctx, cam, cx, cz, r, y = 0, n = 96) {
  path3(ctx, cam, Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * Math.PI * 2; return { x: cx + Math.cos(a) * r, y, z: cz + Math.sin(a) * r }; }));
}
