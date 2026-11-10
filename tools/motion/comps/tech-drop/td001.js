// QUIET BANDS TECH DROP 001: CLAUDE CODE JUST LEVELED UP. A narrated news reel in the Film 001-003 language.
// One miniature lab: the creator's desk, a cloud environment that assembles beside it, and a row of diagram panels
// the camera travels along. Every diagram is an original illustration of a capability, not a product screenshot.
//
//  S1  the upgrade   headline; Fable 5.2 vs 5.1: output speed bars ("up to 30% faster" vs 5.1, as announced)
//  S2  the cloud     the environment builds itself: a missing dependency is found and installed; network access waits
//                    for YOUR approval; an API key goes in through a secure field, never through the chat
//  S3  housekeeping  /usage: what's eating usage, and the fix. /storage: unused worktrees and sessions cleared
//  S4  thinking      ultrathink: one turn, extra reasoning. Models: Opus 5.5 for most coding; Fable 5.2 for bigger, open-ended work
//  S5  anywhere      he closes the laptop; the session keeps running; he picks it up on another device.
//                    Idea -> finished product, with more of the work between carried. Quiet Bands
import { clamp, lerp, seg, ease, smoothstep, hash } from '../../engine/math.js';
import { panel, billboard, path3, floorCircle } from '../../engine/space.js';
import { makeLayers, halo, glow, vignette, grain } from '../../engine/light.js';
import { human, chair, deskSeated, bulb } from '../../engine/humans.js';
import { thing } from '../../engine/environments.js';
import { PALETTES, mix } from '../../engine/color.js';
import { setPalette, P, mono, floorDots } from '../everybody-can-build/film-keys.js';
import { cameraKeys, walker, headline, kicker, endCard, brandPath, brk } from '../shared/story.js';
import { v3, lerp3, track, at, part, arc3, line3, pulse, solid, wire } from '../../engine/world.js';

const W = 1080, H = 1920, FPS = 30;
let L, TL, B, MARK, WORD, camAt;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');

/* ======================= the lab ======================= */
const X0 = -2.0, SEAT = { x: X0 - 0.33, z: 0 }, SCREEN = v3(X0 + 0.7, 1.06, 0.07), BULB = v3(X0 - 0.26, 1.64, 0);
const E = { x: 1.55, z: 1.4, w: 2.0, d: 1.3, h: 1.15, y0: 0.95 };                 // the cloud environment (floating)
const MODS = [{ k: 'RUNTIME', x: 0.88 }, { k: 'DEPENDENCY', x: 1.33 }, { k: 'NETWORK', x: 1.78 }, { k: 'SECRETS', x: 2.23 }].map((m) => ({ ...m, y: E.y0 + 0.08, z: E.z - E.d / 2 + 0.25 }));
const LINK = track(arc3(v3(SCREEN.x + 0.2, 1.25, 0.1), v3(E.x - E.w / 2, E.y0 + 0.55, E.z - 0.3), 0.35, 30));     // the session link (and the chat)
const VAULT = track([v3(X0 + 0.9, 0.78, -0.1), v3(-0.2, 0.62, 0.35), v3(MODS[3].x - 0.1, 0.62, MODS[3].z - 0.1), v3(MODS[3].x, E.y0 + 0.05, MODS[3].z)]);  // the secure field's own pipe
const OUT = v3(3.95, 2.75, 3.4), NET = track([v3(E.x + E.w / 2, E.y0 + 0.75, E.z), v3(3.1, 2.2, 2.4), OUT]);
const PANX = { usage: 4.7, storage: 7.7, think: 10.7, models: 13.7 }, PY = 0.75, PZ = 1.3, PW = 2.5, PH = 2.55;
const PRODUCT = v3(3.6, 0, -0.4), IDEA = track([v3(BULB.x + 0.3, 0, -0.5), v3(-0.6, 0, -0.9), v3(1.2, 0, -1.0), v3(PRODUCT.x - 0.4, 0, PRODUCT.z - 0.1)]);

/* ======================= drawing helpers ======================= */
/** a diagram panel standing in the lab: a dark card with a hairline frame; fn draws in metres (origin top-left) */
function card(e, cam, x, y, z, w, h, a, fn) {
  if (a <= 0.01) return;
  e.save(); e.globalAlpha *= a;
  panel(e, cam, v3(x, y, z), w, h, 0, (c, cw, ch, s) => {
    c.fillStyle = '#050506'; c.beginPath(); c.roundRect(0, 0, cw, ch, 0.04); c.fill();
    c.strokeStyle = mix(P.bg, P.ink2, 0.45); c.lineWidth = 1.2 / s; c.stroke();
    fn(c, cw, ch, s);
  });
  e.restore();
}
const font = (c, s, px, w = 800, fam = 'Inter Display') => { c.font = `${w} ${px / s}px "${fam}"`; };
function txt(c, s, str, x, y, { px = 20, w = 800, fam = 'Inter Display', color, align = 'left', a = 1, track: tr = 0 } = {}) {
  c.save(); c.globalAlpha *= a; font(c, s, px, w, fam); c.letterSpacing = `${tr / s}px`; c.fillStyle = color ?? P.ink; c.textAlign = align; c.fillText(str, x, y); c.restore();
}
function tag3(ctx, cam, p3, text, a, { color, dy = -18, size = 18, align = 'center' } = {}) {
  const p = cam.project(p3); if (!p || a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = `500 ${size}px "JetBrains Mono"`; ctx.letterSpacing = '3px';
  const tw = ctx.measureText(text).width, x = clamp(align === 'center' ? p.x - tw / 2 : align === 'left' ? p.x : p.x - tw, 40, W - 40 - tw), y = p.y + dy;
  ctx.fillStyle = P.bg; ctx.globalAlpha = a * 0.82; ctx.beginPath(); ctx.roundRect(x - 9, y - size - 2, tw + 18, size + 14, 4); ctx.fill(); ctx.globalAlpha = a;
  ctx.fillStyle = color ?? P.ink; ctx.fillText(text, x, y); ctx.restore();
}
function keyIcon(c, x, y, r, col) { c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = r * 0.28; c.lineCap = 'round'; c.beginPath(); c.arc(x - r * 0.7, y, r * 0.5, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x - r * 0.2, y); c.lineTo(x + r, y); c.moveTo(x + r * 0.6, y); c.lineTo(x + r * 0.6, y + r * 0.45); c.moveTo(x + r * 0.95, y); c.lineTo(x + r * 0.95, y + r * 0.35); c.stroke(); c.restore(); }
function lockIcon(c, x, y, r, col) { c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = r * 0.22; c.beginPath(); c.arc(x, y - r * 0.35, r * 0.42, Math.PI, 0); c.stroke(); c.beginPath(); c.roundRect(x - r * 0.62, y - r * 0.35, r * 1.24, r * 0.95, r * 0.12); c.fill(); c.restore(); }

/* ======================= the frame ======================= */
function draw(ctx, t) {
  setPalette(PALETTES.brand);
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H); e.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000'); g.addColorStop(0.55, '#08080A'); g.addColorStop(1, '#000'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cam = camAt(t), tm = t, fin = B.fin, world = 1 - smoothstep(seg(t, fin + 0.1, fin + 1.0));

  /* ---- story state ---- */
  const envK = ease.out3(seg(t, B.env, B.env + 1.4));                  // the environment assembles
  const missing = smoothstep(seg(t, B.dep - 0.2, B.dep + 0.2)), found = smoothstep(seg(t, B.found, B.found + 0.3)), installK = ease.inOut3(seg(t, B.found + 0.1, B.found + 0.9));
  const askK = smoothstep(seg(t, B.net, B.net + 0.3)), approved = smoothstep(seg(t, B.approve, B.approve + 0.25)), askOut = smoothstep(seg(t, B.approve + 0.9, B.approve + 1.3));
  const keyK = seg(t, B.keyIn, B.keyIn + 1.4), keyDone = smoothstep(seg(t, B.keyIn + 1.3, B.keyIn + 1.6));
  const away = smoothstep(seg(t, B.away, B.away + 0.6));               // he gets up; the laptop closes
  const running = t > B.env + 1.2 ? 1 : 0;
  const stand = smoothstep(seg(t, B.away + 0.1, B.away + 0.5)), walkK = ease.inOut3(seg(t, B.away + 0.4, B.away + 2.0)), phoneK = smoothstep(seg(t, B.phone, B.phone + 0.4));
  const bpos = { x: lerp(SEAT.x + 0.4, -0.55, walkK), z: lerp(-0.25, -1.1, walkK) };

  /* ---- atmosphere ---- */
  const sp = cam.project(SCREEN); if (sp) glow(ctx, sp.x - 30, sp.y, 320 * (sp.s / 480), 260 * (sp.s / 480), { alpha: 0.12 * world * (1 - 0.8 * away) });
  const ep = cam.project(v3(E.x, E.y0 + 0.5, E.z)); if (ep && envK > 0) glow(ctx, ep.x, ep.y, 520 * (ep.s / 420), 420 * (ep.s / 420), { alpha: 0.09 * envK * world });

  /* ---- floor ---- */
  floorDots(e, cam, { cx: 0, cz: 0.4, r: 4.5, base: 0.08 * world, pool: 0.4 * world, x0: -6, x1: 17, z0: -3, z1: 8, step: 0.32 });
  if (envK > 0) { e.save(); e.globalAlpha = 0.6 * envK * world; e.strokeStyle = P.tech; e.lineWidth = 1.2; e.setLineDash([3, 5]); floorCircle(e, cam, E.x, E.z, 1.0); e.stroke(); e.setLineDash([2, 6]); path3(e, cam, [v3(E.x, 0, E.z), v3(E.x, E.y0, E.z)]); e.stroke(); e.restore(); }
  // idea -> finished product (S5): the work between, carried along
  { const k = ease.inOut3(seg(t, B.shift, B.shift + 1.4)); if (k > 0) {
    line3(e, cam, part(IDEA, 0, k), { color: P.ink2, width: 2, alpha: world, dash: [4, 6] });
    for (let i = 0; i < 9; i++) { const u = ((tm - B.shift) * 0.22 + i / 9) % 1; if (u > k) continue; const q = at(IDEA, u); const p = cam.project(v3(q.x, 0.08, q.z)); if (p) { e.save(); e.globalAlpha = world * Math.sin(Math.PI * u); e.fillStyle = P.ink; e.fillRect(p.x - 4, p.y - 4, 8, 8); e.restore(); } } } }

  /* ---- things that stand, far to near ---- */
  const D = []; const dep = (x, y, z) => cam.view(v3(x, y, z)).z, push = (d, fn) => D.push({ d, fn });
  // the desk, chair, and him
  push(dep(X0 + 0.5, 0.8, 0), () => {
    e.save(); e.globalAlpha = world;
    billboard(e, cam, v3(SEAT.x, 0, 0.04), (c, s) => chair(c, s, { P }));
    deskSeated(e, cam, { P, x0: X0, z0: 0, screen: 1 - 0.85 * away, lines: Math.floor(3 + 2 * Math.abs(Math.sin(tm * 1.7))) * (1 - away) });
    if (stand < 1) { e.globalAlpha = world * (1 - stand); billboard(e, cam, v3(SEAT.x, 0, 0), (c, s) => human(c, s, { P, pose: 'sit', reach: 1, lean: 0.08 + 0.02 * Math.sin(tm * 8) * 0.3 })); }
    e.globalAlpha = world; billboard(e, cam, BULB, (c, s) => bulb(c, s, { P, glow: 0.6 + 0.3 * smoothstep(seg(t, B.shift + 0.3, B.shift + 1.0)) }));
    e.restore();
  });
  // him, standing, with the other device
  if (stand > 0) push(dep(bpos.x, 0.9, bpos.z), () => {
    e.save(); e.globalAlpha = stand * world;
    billboard(e, cam, v3(bpos.x, 0, bpos.z), (c, s) => { walker(c, s, P, { step: walkK > 0 && walkK < 1 ? tm * 2.3 : 0, look: -0.25 * phoneK, reach: 0.15 + 0.55 * phoneK, lean: 0.02 });
      if (phoneK > 0.01) { c.globalAlpha *= phoneK; c.fillStyle = P.ink; c.beginPath(); c.roundRect(0.3, -1.2, 0.09, 0.16, 0.015); c.fill(); c.fillStyle = P.bg; c.fillRect(0.31, -1.19, 0.07, 0.12); c.fillStyle = mix(P.bg, P.ink, 0.6 + 0.4 * Math.sin(tm * 3)); c.fillRect(0.32, -1.17, 0.05, 0.02); } });
    e.restore();
  });
  // the cloud environment
  if (envK > 0.01) push(dep(E.x, 1.4, E.z), () => {
    const b = { ...E, h: E.h * envK };
    solid(e, cam, b, { top: '#09090B', side: '#060607', end: '#070708', alpha: world * 0.95 });
    wire(e, cam, b, { color: mix(P.tech, P.ink2, 0.6), width: 1.3, alpha: world, rungs: 1 });
    // its modules: runtime, the missing dependency (until found), network, secrets
    MODS.forEach((m, i) => {
      const r = ease.out5(seg(t, B.env + 0.5 + i * 0.15, B.env + 0.9 + i * 0.15)); if (r <= 0) return;
      const box = { x: m.x, z: m.z, w: 0.34, d: 0.34, h: 0.3 * r, y0: m.y };
      if (i === 1) { // the dependency: an empty dashed slot, then the part flies in
        if (installK < 1) wire(e, cam, { ...box, h: 0.3 }, { color: P.ink, width: 1.4, alpha: world * (0.4 + 0.6 * missing) * (1 - installK) });
        if (installK > 0) { const p = lerp3(v3(m.x + 1.4, m.y + 1.6, m.z - 0.6), v3(m.x, m.y, m.z), installK); solid(e, cam, { ...box, x: p.x, y0: p.y, z: p.z, h: 0.3 }, { top: P.ink, side: mix(P.bg, P.ink, 0.5), end: mix(P.bg, P.ink, 0.68), alpha: world }); }
        return;
      }
      const lit = i === 2 ? approved : i === 3 ? keyDone : 1;
      solid(e, cam, box, { top: mix(mix(P.bg, P.ink2, 0.55), P.ink, lit * 0.6), side: mix(P.bg, P.ink2, 0.25), end: mix(P.bg, P.ink2, 0.35 + 0.35 * lit), edge: P.ink2, alpha: world });
    });
  });
  // the outside: what network access reaches
  if (askK > 0.01 || approved > 0) push(dep(OUT.x, OUT.y, OUT.z), () => { const p = cam.project(OUT); if (!p) return; e.save(); e.globalAlpha = world * Math.max(askK, approved); e.strokeStyle = P.ink2; e.lineWidth = 1.5; const r = p.s * 0.28; e.beginPath(); e.arc(p.x, p.y, r, 0, Math.PI * 2); e.ellipse(p.x, p.y, r * 0.45, r, 0, 0, Math.PI * 2); e.moveTo(p.x - r, p.y); e.lineTo(p.x + r, p.y); e.stroke(); e.restore(); });
  // the diagram panels along the bench
  const pa = (a, b) => smoothstep(seg(t, a - 0.6, a)) * (1 - smoothstep(seg(t, b, b + 0.6)));
  push(dep(PANX.usage, 2, PZ), () => card(e, cam, PANX.usage, PY, PZ, PW, PH, pa(B.usage, B.storage + 0.8) * world, (c, w, h, s) => {
    txt(c, s, '/usage', 0.16, 0.36, { px: 64, fam: 'JetBrains Mono', w: 600 });
    txt(c, s, 'WHAT’S USING IT', 0.16, 0.6, { px: 18, fam: 'JetBrains Mono', w: 500, color: P.ink2, track: 4 });
    const seg5 = [0.44, 0.17, 0.14, 0.13, 0.12], shrink = ease.inOut3(seg(t, B.fix, B.fix + 0.9)), hl = smoothstep(seg(t, B.eat, B.eat + 0.3));
    let x = 0.16; const bw = w - 0.32, y = 0.95, bh = 0.32;
    seg5.forEach((v, i) => { const ww = bw * v * (i === 0 ? lerp(1, 0.32, shrink) : 1) * smoothstep(seg(t, B.usage + i * 0.12, B.usage + 0.5 + i * 0.12)); c.fillStyle = i === 0 ? mix(P.ink2, P.ink, hl) : mix(P.bg, P.ink2, 0.75 - i * 0.1); c.fillRect(x, y, Math.max(0, ww - 0.015), bh);
      if (i === 0 && hl > 0.01) { c.save(); c.globalAlpha *= hl; c.strokeStyle = P.live; c.lineWidth = 2.5 / s; c.strokeRect(x - 0.02, y - 0.02, ww + 0.025, bh + 0.04); c.restore(); } x += ww; });
    txt(c, s, 'THE BIG ONE', 0.16, y + bh + 0.22, { px: 20, fam: 'JetBrains Mono', w: 500, color: P.live, track: 3, a: hl * (1 - shrink * 0.6) });
    const fk = smoothstep(seg(t, B.fix - 0.3, B.fix)); txt(c, s, 'SUGGESTED FIX', 0.16, 1.85, { px: 20, fam: 'JetBrains Mono', w: 500, color: P.ink2, track: 4, a: fk });
    txt(c, s, 'DIAGNOSE → FIX', 0.16, 2.2, { px: 40, a: fk });
  }));
  push(dep(PANX.storage, 2, PZ), () => card(e, cam, PANX.storage, PY, PZ, PW, PH, pa(B.storage, B.think) * world, (c, w, h, s) => {
    txt(c, s, '/storage', 0.16, 0.36, { px: 64, fam: 'JetBrains Mono', w: 600 });
    txt(c, s, 'WORKTREES + SESSIONS', 0.16, 0.6, { px: 18, fam: 'JetBrains Mono', w: 500, color: P.ink2, track: 4 });
    const rows = [['WORKTREE', 1], ['SESSION', 0], ['WORKTREE', 0], ['SESSION', 1], ['WORKTREE', 0], ['SESSION', 0]], sweep = seg(t, B.clear, B.clear + 1.2);
    rows.forEach(([n, used], i) => { const y = 0.82 + i * 0.2, out = used ? 0 : ease.in3(clamp(sweep * 1.6 - i * 0.12)), a = (1 - out) * smoothstep(seg(t, B.storage + i * 0.1, B.storage + 0.4 + i * 0.1)); if (a <= 0.01) return;
      c.save(); c.globalAlpha *= a; c.translate(out * 0.8, 0); c.fillStyle = used ? P.ink : mix(P.bg, P.ink2, 0.6); c.beginPath(); c.roundRect(0.16, y, 0.16, 0.12, 0.015); c.fill();
      txt(c, s, n, 0.42, y + 0.1, { px: 20, fam: 'JetBrains Mono', w: 500, color: used ? P.ink : P.ink2, track: 3 }); if (!used) txt(c, s, 'UNUSED', w - 0.16, y + 0.1, { px: 18, fam: 'JetBrains Mono', w: 500, color: P.tech, track: 3, align: 'right' }); c.restore(); });
    const disk = lerp(0.86, 0.38, ease.inOut3(sweep)); txt(c, s, 'DISK', 0.16, 2.14, { px: 18, fam: 'JetBrains Mono', w: 500, color: P.ink2, track: 4 });
    c.fillStyle = mix(P.bg, P.ink2, 0.3); c.fillRect(0.16, 2.2, w - 0.32, 0.12); c.fillStyle = P.ink; c.fillRect(0.16, 2.2, (w - 0.32) * disk, 0.12);
    txt(c, s, 'SPACE BACK', w - 0.16, 2.14, { px: 18, fam: 'JetBrains Mono', w: 500, color: P.ink, track: 3, align: 'right', a: smoothstep(seg(sweep, 0.7, 1)) });
  }));
  push(dep(PANX.think, 2, PZ), () => card(e, cam, PANX.think, PY, PZ, PW, PH, pa(B.think, B.models) * world, (c, w, h, s) => {
    txt(c, s, 'ULTRATHINK', 0.16, 0.36, { px: 56 });
    txt(c, s, 'ONE TURN · EXTRA REASONING', 0.16, 0.6, { px: 18, fam: 'JetBrains Mono', w: 500, color: P.ink2, track: 4 });
    const q = { x: 0.3, y: 2.15 }, a = { x: w - 0.3, y: 2.15 };
    c.strokeStyle = P.tech; c.lineWidth = 1.5 / s; c.setLineDash([4 / s, 5 / s]); c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(a.x, a.y); c.stroke(); c.setLineDash([]);
    txt(c, s, 'A NORMAL TURN', w / 2, 2.32, { px: 16, fam: 'JetBrains Mono', w: 500, color: P.tech, track: 3, align: 'center' });
    // the same turn, thought through further: it branches out, explores, and comes back to one answer
    const grow = ease.inOut3(seg(t, B.think + 0.2, B.think + 2.4));
    const tree = (x0, y0, x1, y1, depth, k, key) => { if (depth === 0 || k <= 0) return; const mx = lerp(x0, x1, 0.5), spread = 0.26 * depth;
      for (const sgn of [-1, 1]) { const my = lerp(y0, y1, 0.5) - 0.55 * (4 - depth) * 0.12 + sgn * spread * 0.5, kk = clamp(k * 4 - (4 - depth));
        c.strokeStyle = mix(P.ink2, P.ink, depth / 4); c.lineWidth = (1 + depth * 0.4) / s; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(lerp(x0, mx, 0.5), my, lerp(x0, mx, kk), lerp(y0, my, kk)); c.stroke();
        tree(mx, my, x1, y1, depth - 1, k, key * 2 + (sgn > 0)); } };
    tree(q.x, 1.55, a.x, 1.55, 4, grow, 1);
    c.strokeStyle = P.ink; c.lineWidth = 2 / s; c.beginPath(); c.moveTo(lerp(q.x, a.x, 0.82), 1.55 - 0.05); c.lineTo(a.x, 1.55); c.stroke();
    for (const [p0, lab] of [[q, 'ASK'], [a, 'ANSWER']]) { c.fillStyle = P.ink; c.beginPath(); c.arc(p0.x, 1.55, 0.05, 0, Math.PI * 2); c.fill(); txt(c, s, lab, p0.x, 1.4, { px: 16, fam: 'JetBrains Mono', w: 500, color: P.ink2, track: 3, align: 'center' }); }
  }));
  push(dep(PANX.models, 2, PZ), () => card(e, cam, PANX.models, PY, PZ, PW, PH, pa(B.models, B.away - 0.2) * world, (c, w, h, s) => {
    txt(c, s, 'PICK THE MODEL', 0.16, 0.36, { px: 44 });
    txt(c, s, 'PER THE ANNOUNCEMENT', 0.16, 0.6, { px: 16, fam: 'JetBrains Mono', w: 500, color: P.ink2, track: 4 });
    const colW = (w - 0.48) / 2, ok = smoothstep(seg(t, B.opus, B.opus + 0.3)), fb = smoothstep(seg(t, B.fable, B.fable + 0.3)), test = smoothstep(seg(t, B.test, B.test + 0.3));
    [[0.16, 'OPUS 5.5', 'MOST CODING', ok], [0.32 + colW, 'FABLE 5.2', 'BIGGER, OPEN-ENDED', fb]].forEach(([x, name, use, k], j) => {
      c.save(); c.globalAlpha *= 0.3 + 0.7 * k; c.strokeStyle = mix(P.ink2, P.ink, k); c.lineWidth = 1.4 / s; c.beginPath(); c.roundRect(x, 0.82, colW, 1.6, 0.03); c.stroke();
      txt(c, s, name, x + 0.12, 1.08, { px: 30 }); txt(c, s, use, x + 0.12, 1.3, { px: 15, fam: 'JetBrains Mono', w: 500, color: P.ink2, track: 2 });
      if (j === 0) { for (let r = 0; r < 5; r++) { c.fillStyle = mix(P.bg, P.ink, 0.35 + 0.1 * r); c.fillRect(x + 0.14, 1.5 + r * 0.14, colW * (0.45 + 0.4 * hash(r, 3)), 0.06); } txt(c, s, 'START HERE', x + 0.12, 2.33, { px: 15, fam: 'JetBrains Mono', w: 500, color: P.ink, track: 2, a: ok }); }
      else { // a bigger, less defined problem: an open network of pieces
        const pts = Array.from({ length: 9 }, (_, i) => ({ x: x + 0.18 + (colW - 0.36) * hash(i, 61), y: 1.5 + 0.7 * hash(i, 62) }));
        c.strokeStyle = P.ink2; c.lineWidth = 1 / s; pts.forEach((p, i) => { const q = pts[(i * 3 + 2) % 9]; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke(); });
        pts.forEach((p) => { c.fillStyle = P.ink; c.beginPath(); c.arc(p.x, p.y, 0.03, 0, Math.PI * 2); c.fill(); });
        txt(c, s, 'WORTH TESTING', x + 0.12, 2.33, { px: 15, fam: 'JetBrains Mono', w: 500, color: P.live, track: 2, a: test }); }
      c.restore(); });
  }));
  // the finished product (S5)
  { const k = ease.out5(seg(t, B.shift + 1.2, B.shift + 1.8)); if (k > 0) push(dep(PRODUCT.x, 0.4, PRODUCT.z), () => { e.save(); e.globalAlpha = world; panel(e, cam, v3(PRODUCT.x, 0, PRODUCT.z), 0.6 * k, 0.66 * k, 0, (c, w, h, s) => thing(c, 'product', w, h, s, { P, tone: 1 })); e.restore(); }); }
  D.sort((a, b) => b.d - a.d).forEach((x) => x.fn());

  /* ---- links in the air ---- */
  if (envK > 0.3) {
    const la = world * smoothstep(seg(envK, 0.3, 0.9));
    line3(e, cam, LINK.pts, { color: P.ink2, width: 1.6, alpha: la * (1 - 0.5 * away), dash: [4, 6] });
    if (running) pulse(e, cam, LINK, ((tm - B.env) * 0.45) % 1.2, { color: P.ink, len: 0.15, width: 2.5, alpha: la * (1 - away), head: 4 });
    // network access: the path out is closed until approved
    if (askK > 0.01) { const k = approved; line3(e, cam, NET.pts, { color: mix(P.tech, P.ink, k), width: 1.5 + k, alpha: world * askK, dash: k > 0.5 ? null : [3, 6] });
      if (k > 0.5) pulse(e, cam, NET, ((tm - B.approve) * 0.7) % 1.2, { color: P.ink, len: 0.2, width: 3, alpha: world, head: 4 });
      const gp = cam.project(at(NET, 0.42)); if (gp) { const gw = 16 * (1 - 0.8 * k); e.save(); e.globalAlpha = world * askK; e.strokeStyle = P.ink; e.lineWidth = 3; e.beginPath(); e.moveTo(gp.x - 10, gp.y - gw); e.lineTo(gp.x - 10, gp.y + gw); e.moveTo(gp.x + 10, gp.y - gw); e.lineTo(gp.x + 10, gp.y + gw); e.stroke(); e.restore(); } }
    // the key's own sealed pipe (never the chat)
    const vk = smoothstep(seg(t, B.key - 0.2, B.key + 0.4)) * (1 - smoothstep(seg(t, B.key2 + 2.6, B.key2 + 3.4)));
    if (vk > 0.01) { line3(e, cam, VAULT.pts, { color: P.ink, width: 2.4, alpha: world * vk }); line3(e, cam, VAULT.pts, { color: P.bg, width: 0.9, alpha: world * vk }); }
    if (away > 0.1) for (let i = 0; i < 3; i++) { const p = cam.project(v3(E.x, E.y0 + E.h + 0.25 + i * 0.12, E.z)); }
  }
  // the session follows him to the other device
  if (phoneK > 0.01) { const tr = track(arc3(v3(bpos.x + 0.34, 1.12, bpos.z), v3(E.x - E.w / 2, E.y0 + 0.55, E.z - 0.3), 0.5, 30)), k = ease.inOut3(seg(t, B.phone + 0.2, B.phone + 1.0));
    line3(e, cam, part(tr, 0, k), { color: P.ink, width: 2, alpha: world * phoneK, dash: [4, 6] }); if (k >= 1) pulse(e, cam, tr, ((tm - B.phone) * 0.6) % 1.2, { color: P.ink, len: 0.15, width: 3, alpha: world, head: 4 }); }

  halo(ctx, L);

  /* ---- crisp: cards, tags, type ---- */
  // the environment's labels
  { const a = smoothstep(seg(t, B.env + 0.8, B.env + 1.2)) * world * (1 - smoothstep(seg(t, B.usage - 0.8, B.usage - 0.3))) + (t > B.away ? smoothstep(seg(t, B.away + 0.3, B.away + 0.8)) * world * (1 - smoothstep(seg(t, B.shift + 0.6, B.shift + 1.2))) : 0);
    tag3(ctx, cam, v3(E.x, E.y0 + E.h + 0.12, E.z - E.d / 2), t > B.away ? 'CLOUD SESSION · STILL RUNNING' : 'CLOUD ENVIRONMENT', a, { dy: -14 }); }
  { const ma = smoothstep(seg(t, B.dep, B.dep + 0.25)) * (1 - smoothstep(seg(t, B.found + 1.4, B.found + 1.8))) * world; tag3(ctx, cam, v3(MODS[1].x, MODS[1].y + 0.36, MODS[1].z), found > 0.5 ? 'DEPENDENCY · FOUND' : 'MISSING DEPENDENCY', ma, { color: found > 0.5 ? P.ink : P.live, dy: -60 }); }
  // the approval request: a plain diagram card at his screen (an illustration, not a product screenshot)
  { const a = askK * (1 - askOut) * world, p = cam.project(v3(SCREEN.x, 1.62, SCREEN.z)); if (p && a > 0.01) {
    const cw = 470, ch = 230, x = clamp(p.x - cw / 2, 60, W - 60 - cw), y = p.y - ch - 20, k = ease.spring(seg(t, B.net, B.net + 0.4), 0.7, 12);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x + cw / 2, y + ch); ctx.scale(lerp(0.9, 1, k), lerp(0.9, 1, k)); ctx.translate(-(x + cw / 2), -(y + ch));
    ctx.fillStyle = '#0B0B0D'; ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 14); ctx.fill(); ctx.stroke();
    ctx.font = '500 17px "JetBrains Mono"'; ctx.letterSpacing = '4px'; ctx.fillStyle = P.ink2; ctx.fillText('APPROVAL NEEDED', x + 28, y + 44);
    ctx.font = '800 34px "Inter Display"'; ctx.letterSpacing = '0px'; ctx.fillStyle = P.ink; ctx.fillText('Allow network access?', x + 28, y + 96);
    const bx = x + 28, by = y + 140, bw2 = (cw - 76) / 2;
    ctx.strokeStyle = P.ink2; ctx.beginPath(); ctx.roundRect(bx, by, bw2, 58, 10); ctx.stroke(); ctx.font = '600 20px "JetBrains Mono"'; ctx.letterSpacing = '3px'; ctx.fillStyle = P.ink2; ctx.textAlign = 'center'; ctx.fillText('DENY', bx + bw2 / 2, by + 37);
    ctx.fillStyle = approved > 0.5 ? P.live : P.ink; ctx.beginPath(); ctx.roundRect(bx + bw2 + 20, by, bw2, 58, 10); ctx.fill(); ctx.fillStyle = P.bg; ctx.fillText(approved > 0.5 ? 'APPROVED' : 'APPROVE', bx + bw2 * 1.5 + 20, by + 37);
    // his tap
    const tap = smoothstep(seg(t, B.approve - 0.5, B.approve - 0.1)); if (tap > 0) { ctx.globalAlpha = a * (1 - approved * 0.7); ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx + bw2 * 1.5 + 20, by + 29, 34 - 12 * tap, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore(); } }
  tag3(ctx, cam, at(NET, 0.62), 'YOU APPROVED', smoothstep(seg(t, B.approve + 0.2, B.approve + 0.5)) * (1 - smoothstep(seg(t, B.key - 0.4, B.key))) * world, { dy: -20 });
  // the API key: not through the chat. Through its own secure field, into the environment's secrets
  { const a = smoothstep(seg(t, B.key - 0.2, B.key + 0.3)) * (1 - smoothstep(seg(t, B.key2 + 2.6, B.key2 + 3.2))) * world;
    if (a > 0.01) {
      const cp = cam.project(at(LINK, 0.45)); if (cp) { ctx.save(); ctx.globalAlpha = a * 0.9; keyIcon(ctx, cp.x - 10, cp.y - 30, 16, P.ink2); ctx.strokeStyle = P.live; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cp.x - 34, cp.y - 52); ctx.lineTo(cp.x + 20, cp.y - 8); ctx.moveTo(cp.x + 20, cp.y - 52); ctx.lineTo(cp.x - 34, cp.y - 8); ctx.stroke(); ctx.restore(); }
      tag3(ctx, cam, at(LINK, 0.45), 'NOT IN THE CHAT', a, { dy: -66, color: P.ink2 });
      const k = keyK; if (k > 0 && keyDone < 1) { const q = cam.project(at(VAULT, k)); if (q) { ctx.save(); ctx.globalAlpha = a; keyIcon(ctx, q.x, q.y - 14, 15, P.ink); ctx.restore(); } }
      tag3(ctx, cam, at(VAULT, 0.18), 'SECURE FIELD', a, { dy: 44 });
      const sp2 = cam.project(v3(MODS[3].x, MODS[3].y + 0.55, MODS[3].z)); if (sp2 && keyDone > 0) { ctx.save(); ctx.globalAlpha = a * keyDone; lockIcon(ctx, sp2.x, sp2.y, 16, P.ink); ctx.restore(); tag3(ctx, cam, v3(MODS[3].x + 0.2, MODS[3].y + 0.8, MODS[3].z), 'STORED AS A SECRET', a * keyDone, { dy: -20 }); }
    } }
  // S1: the drop, and the speed claim, exactly as announced (vs Fable 5.1)
  { const r = seg(t, 0.35, 1.0), a = 1 - smoothstep(seg(t, B.fable52 - 0.5, B.fable52)); if (a > 0.01 && r > 0) { kicker(ctx, P, 'QUIET BANDS · TECH DROP 001', 250, a * smoothstep(r), mono); headline(ctx, P, W, [['CLAUDE CODE'], ['JUST LEVELED UP.']], 400, a, r, { size: 100 }); } }
  { const a = smoothstep(seg(t, B.fable52 - 0.1, B.fable52 + 0.3)) * (1 - smoothstep(seg(t, B.env - 0.6, B.env - 0.1))); if (a > 0.01) {
    const x = 80, y = 250, bw = W - 160; kicker(ctx, P, 'OUTPUT SPEED · AS ANNOUNCED', y - 20, a, mono);
    ctx.save(); ctx.globalAlpha = a; ctx.font = '800 64px "Inter Display"'; ctx.fillStyle = P.ink; ctx.fillText('FABLE 5.2', x, y + 90); ctx.restore();
    const race = seg(t, B.race, B.race + 2.6), k1 = clamp(race), k2 = clamp(race * 1.3);
    for (const [label, k, yy, hot] of [['5.1', k1, y + 150, 0], ['5.2', k2, y + 230, 1]]) {
      mono(ctx, label, x, yy + 34, { size: 24, color: hot ? P.ink : P.ink2, track: 3, alpha: a });
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = mix(P.bg, P.ink2, 0.25); ctx.fillRect(x + 80, yy + 12, bw - 80, 28); ctx.fillStyle = hot ? P.ink : P.ink2; ctx.fillRect(x + 80, yy + 12, (bw - 80) * ease.inOut3(k), 28); ctx.restore(); }
    const done = smoothstep(seg(race, 1 / 1.3, 1 / 1.3 + 0.08));
    ctx.save(); ctx.globalAlpha = a * done; ctx.font = '800 54px "Inter Display"'; ctx.fillStyle = P.live; ctx.fillText('UP TO 30% FASTER', x, y + 360); ctx.restore();
    mono(ctx, 'OUTPUTS · VS FABLE 5.1 · PER THE ANNOUNCEMENT', x, y + 404, { size: 18, color: P.ink2, track: 3, alpha: a * done });
    mono(ctx, 'ILLUSTRATIVE · NOT A BENCHMARK', x, y + 438, { size: 16, color: P.tech, track: 3, alpha: a * done }); } }
  { const r = seg(t, B.env - 0.05, B.env + 0.7), a = 1 - smoothstep(seg(t, B.dep - 0.4, B.dep + 0.1)); if (r > 0 && a > 0.01) { kicker(ctx, P, 'THE REAL NEWS', 250, a * smoothstep(r), mono); headline(ctx, P, W, [['CLAUDE CAN HELP'], ['SET UP ITS OWN'], ['CLOUD ENVIRONMENT.']], 400, a, r, { size: 78 }); } }
  // S5 thesis
  { const r = seg(t, B.shift + 0.3, B.shift + 1.0), a = 1 - smoothstep(seg(t, fin - 0.2, fin + 0.4)); if (r > 0) { kicker(ctx, P, 'THE REAL SHIFT', 250, a * smoothstep(r), mono); headline(ctx, P, W, [['IDEA →'], [['MORE OF THE WORK', P.ink]], [['→ FINISHED.', P.live]]], 400, a, r, { size: 84 }); }
    const ia = smoothstep(seg(t, B.shift + 0.6, B.shift + 1.0)) * a * world; tag3(ctx, cam, v3(BULB.x + 0.3, 0, -0.5), 'IDEA', ia, { dy: 40 }); tag3(ctx, cam, v3(PRODUCT.x, 0, PRODUCT.z), 'FINISHED PRODUCT', smoothstep(seg(t, B.shift + 1.5, B.shift + 1.9)) * a * world, { dy: 40 }); }
  // series header
  { const k = smoothstep(seg(t, 0.2, 0.6)) * (1 - smoothstep(seg(t, B.fable52 - 0.6, B.fable52 - 0.1))); if (k > 0.01) mono(ctx, 'TECH DROP 001 · CLAUDE CODE UPDATE', 80, 140, { size: 18, color: P.ink2, track: 5, alpha: k }); }
  endCard(ctx, P, W, MARK, WORD, smoothstep(seg(t, fin + 0.9, fin + 1.5)), smoothstep(seg(t, fin + 1.3, fin + 1.9)), seg(t, B.build - 0.1, B.build + 0.5));
  vignette(ctx, W, H, { amount: 0.66 });
  grain(ctx, L, Math.round(t * FPS));
}

async function load() {
  TL = await (await fetch('/tools/motion/films/tech-drop-001/timeline.json')).json();
  const l = (n) => TL.lines[n - 1], b = (n, fr) => brk(TL, n, fr)[1];
  B = {};
  B.fable52 = l(2).at; B.race = b(2, 7 / 13) - 0.2; B.notHead = l(3).at + 0.3;
  B.env = l(4).at; B.dep = l(5).at; B.found = b(5, 3 / 7) + 0.1;
  B.net = l(6).at; B.approve = l(6).end - 0.5;
  B.key = l(7).at; B.keyIn = b(7, 2 / 9) + 0.1; B.key2 = l(7).at;
  B.usage = l(8).at; B.eat = l(8).at + 0.9; B.fix = l(8).end - 1.1; B.storage = l(9).at; B.clear = l(9).at + 0.9;
  B.think = l(10).at; B.models = l(11).at; B.opus = l(11).at + 0.4; B.fable = l(12).at + 0.2; B.test = l(12).end - 0.9;
  B.away = l(13).at; B.phone = b(13, 7 / 13) + 0.1; B.shift = l(14).at;
  B.fin = l(15).at - 0.6; B.build = b(15, 2 / 5);
  const desk = v3(-0.45, 1.55, -8.0), hub = v3(0.0, 1.7, -6.8), panelCam = (x) => v3(x, 2.05, -2.5);
  camAt = cameraKeys([
    [0, desk, -0.17, 1400],
    [B.fable52, v3(-0.4, 1.58, -7.7), -0.17, 1400],
    [B.env - 0.2, v3(-0.35, 1.6, -7.4), -0.17, 1400],
    [B.env + 1.2, hub, -0.14, 1400],                                     // the environment builds beside him
    [B.net - 0.3, v3(0.0, 1.7, -6.6), -0.12, 1400],
    [B.key + 0.6, v3(-0.05, 1.6, -6.5), -0.11, 1400],
    [B.usage - 0.4, v3(0.0, 1.62, -6.6), -0.11, 1400],
    [B.usage + 0.6, panelCam(PANX.usage), 0.0, 1500],                    // along the bench: the housekeeping
    [B.storage - 0.2, panelCam(PANX.usage + 0.15), 0.0, 1500],
    [B.storage + 0.6, panelCam(PANX.storage), 0.0, 1500],
    [B.think - 0.2, panelCam(PANX.storage + 0.15), 0.0, 1500],
    [B.think + 0.6, panelCam(PANX.think), 0.0, 1500],
    [B.models - 0.2, panelCam(PANX.think + 0.15), 0.0, 1500],
    [B.models + 0.6, panelCam(PANX.models), 0.0, 1500],
    [B.away - 0.3, panelCam(PANX.models + 0.15), 0.0, 1500],
    [B.away + 1.1, v3(-0.3, 1.65, -6.9), -0.12, 1400],                   // back to him: he gets up, the session keeps going
    [B.shift - 0.1, v3(-0.2, 1.7, -7.0), -0.12, 1400],
    [B.shift + 1.6, v3(0.7, 3.2, -9.0), 0.1, 1400],                      // up and back: idea to finished product
    [99, v3(0.75, 3.25, -9.2), 0.1, 1400],
  ], W, H);
  MARK = await brandPath('/assets/brand/mark.svg'); WORD = await brandPath('/assets/brand/wordmark.svg');
  comp.duration = TL.total;
}

const comp = { width: W, height: H, fps: FPS, duration: 64, palette: PALETTES.brand, motionBlur: { samples: 4, shutter: 0.5 }, load, draw };
export default comp;
