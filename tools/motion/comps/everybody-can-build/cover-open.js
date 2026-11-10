// EVERYBODY CAN BUILD: five-second opening, animated from the approved cover keyframe (cover.js).
// Every layer is the cover's own artwork (drawn by the engine); this file adds only time, so frame 0 is the still.
// Type and lockup never move. Beats (s):
//   0.0-1.0  the world comes alive: dust drifts at two depths, the bulb breathes, the screen flickers (processing)
//   1.0-2.0  the idea: the bulb brightens; a thin orange pulse runs down from it to the screen; warm light on the desk
//   2.0-3.5  the creation: the screen becomes active (progress fills, a control appears); a cream application window
//            lifts off the screen plane and turns to face us (anchored to the screen by a dotted tether)
//   3.5-5.0  the reveal: the window moves gently forward; two more creations emerge behind it; the camera pulls back
//   node tools/motion/render.mjs everybody-can-build/cover-open --sheet=5
import { clamp, hash, smoothstep, lerp, seg, ease } from '../../engine/math.js';
import { cam3, panel, path3 } from '../../engine/space.js';
import { makeLayers, halo, vignette, grain } from '../../engine/light.js';
import { thing } from '../../engine/environments.js';
import { PALETTES, mix } from '../../engine/color.js';
import { A, setPalette, P, BULB, dust } from './film-keys.js';
import { coverType, loadBrand, COVER_CAM } from './cover.js';

const W = 1080, H = 1920;
let L;

// the monitor's screen plane, exactly as deskSeated draws it (desk at x0 = -0.05)
const SCR = { c: { x: 0.65, y: 0.85, z: 0.07 }, w: 0.68, h: 0.43, yaw: 0.86 };
const SCR_MID = { x: 0.65, y: 1.065, z: 0.07 };
const scrLeftTop = { x: SCR.c.x - Math.cos(SCR.yaw) * SCR.w / 2, y: SCR.c.y + SCR.h, z: SCR.c.z - Math.sin(SCR.yaw) * SCR.w / 2 };
const quad = (a, c, b) => (u) => { const v = 1 - u; return { x: v * v * a.x + 2 * u * v * c.x + u * u * b.x, y: v * v * a.y + 2 * u * v * c.y + u * u * b.y, z: v * v * a.z + 2 * u * v * c.z + u * u * b.z }; };
const PULSE = quad({ x: BULB.x + 0.02, y: BULB.y - 0.02, z: 0 }, { x: 0.12, y: 1.62, z: -0.12 }, { ...scrLeftTop, y: scrLeftTop.y + 0.02 });

// creations: start on the screen plane (same size, same angle), end facing the camera
const WIN = { from: { ...SCR.c, y: SCR.c.y + 0.03, w: 0.62, h: 0.37, yaw: SCR.yaw }, to: { x: 1.08, y: 1.22, z: -0.8, w: 0.6, h: 0.42, yaw: -0.08 }, end: { x: 1.14, y: 1.25, z: -1.15 } };
const MORE = [
  { type: 'app', t0: 3.62, to: { x: 1.98, y: 0.7, z: 0.55, w: 0.3, h: 0.57, yaw: -0.16 } },
  { type: 'course', t0: 3.8, to: { x: 0.3, y: 1.72, z: 0.95, w: 0.56, h: 0.4, yaw: 0.12 } },
];

function camAt(t) {
  const k = ease.inOut3(seg(t, 3.5, 5.0));
  return cam3({ W, H, pos: { x: lerp(COVER_CAM.pos.x, 0.4, k), y: lerp(COVER_CAM.pos.y, 1.06, k), z: lerp(COVER_CAM.pos.z, -5.2, k) }, pitch: COVER_CAM.pitch, f: 1650 });
}

function draw(ctx, t) {
  setPalette(PALETTES.brand);
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000000'); g.addColorStop(0.55, '#08080A'); g.addColorStop(1, '#000000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  openingWorld(ctx, e, t, camAt(t));
  halo(ctx, L);
  coverType(ctx);                                   // stationary, crisp, identical to the cover
  vignette(ctx, W, H, { amount: 0.66 });
  grain(ctx, L, t === 0 ? 3 : Math.round(t * 30));  // frame 0 is the cover still, grain included
}

/** The opening's world (creator, bulb, pulse, the three creations) from any camera. The film keeps calling this after 5 s. */
export function openingWorld(ctx, e, t, cam, { floor, noFloor = false } = {}) {
  const n = Math.round(t * 30);

  // the bulb breathes (1.25 s period, starting at full), then brightens as the idea forms, then holds a little higher
  const breath = 1 - 0.1 * (1 - Math.cos((2 * Math.PI * t) / 1.25)) / 2;
  const bulb = breath * (1 + 0.28 * ease.inOut3(seg(t, 1.0, 1.7)) - 0.12 * ease.inOut3(seg(t, 2.2, 3.0)));
  // the screen: a restrained processing flicker until the pulse arrives, then it becomes active
  const arrive = 1.95, active = ease.out3(seg(t, arrive, arrive + 0.35));
  const fa = smoothstep(seg(t, 0, 0.35)); // starts exactly at the still
  const flick = t < arrive ? 1 - fa * (0.05 * (hash(n, 71) > 0.55 ? hash(n, 72) : 0) + 0.025 * (1 + Math.sin(t * 19)) / 2) : 1;
  const warm = 0.6 * ease.out3(seg(t, 1.72, 2.05)) * (1 - 0.45 * seg(t, 2.1, 3.0));

  A(ctx, e, { pos: cam.pos, pitch: cam.pitch ?? COVER_CAM.pitch, f: cam.f, text: false, liveBulb: bulb, ruler: false, floor, noFloor,
    screen: flick, screenGlow: (t < arrive ? flick : 1) * (1 + 0.6 * active - 0.25 * seg(t, 2.6, 3.4)), warm, drift: 0.045 * t });
  // a second, deeper layer of specks drifting slower (depth in the dark)
  dust(e, cam, 70, 51, { x0: -2.5, x1: 3.5, y0: 0.2 + 0.02 * t, y1: 3.4 + 0.02 * t, z0: 2.5, z1: 7 }, { size: 1.4, alpha: 0.22 * smoothstep(seg(t, 0, 0.6)) });

  // the screen becomes active: a progress line fills, then one control appears (drawn on the screen plane itself)
  if (t >= arrive) {
    panel(e, cam, SCR.c, SCR.w, SCR.h, SCR.yaw, (c, w, h, s) => {
      const px = (v) => v / s, pk = ease.inOut3(seg(t, arrive, arrive + 0.5));
      c.fillStyle = P.bg; c.globalAlpha = 0.6; c.fillRect(0.07, h - 0.09, (w - 0.14), px(2));
      c.globalAlpha = 0.85; c.fillRect(0.07, h - 0.09 - px(1), (w - 0.14) * pk, px(4));
      const bk = ease.out3(seg(t, arrive + 0.35, arrive + 0.55));
      if (bk > 0) { c.globalAlpha = 0.75 * bk; c.beginPath(); c.roundRect(w - 0.19, 0.17, 0.12 * bk, 0.05, 0.02); c.fill(); }
      c.globalAlpha = 1;
    });
  }

  // the idea's pulse: a thin orange line runs from the bulb down to the screen, leaving a faint dotted guide
  const pu = ease.inOut3(seg(t, 1.15, arrive));
  if (pu > 0 && t < arrive + 0.5) {
    const fade = 1 - smoothstep(seg(t, arrive, arrive + 0.5));
    const guide = Array.from({ length: 41 }, (_, j) => PULSE((j / 40) * pu));
    e.save(); e.globalAlpha = 0.5 * fade; e.strokeStyle = P.tech; e.lineWidth = 1.2; e.setLineDash([2, 6]); path3(e, cam, guide); e.stroke(); e.restore();
    if (t < arrive) {
      const tail = 0.22;
      for (let j = 0; j < 14; j++) {
        const u0 = Math.max(0, pu - tail * (1 - j / 14)), u1 = Math.max(0, pu - tail * (1 - (j + 1) / 14));
        const a = cam.project(PULSE(u0)), b = cam.project(PULSE(u1)); if (!a || !b) continue;
        e.save(); e.globalAlpha = (j + 1) / 14; e.strokeStyle = P.live; e.lineWidth = 2.2; e.lineCap = 'round'; e.beginPath(); e.moveTo(a.x, a.y); e.lineTo(b.x, b.y); e.stroke(); e.restore();
      }
      const h = cam.project(PULSE(pu)); e.fillStyle = P.live; e.beginPath(); e.arc(h.x, h.y, 3.6, 0, Math.PI * 2); e.fill();
    } else { // arrival: a small orange flash where it meets the screen
      const a = cam.project(PULSE(1)), k = seg(t, arrive, arrive + 0.35);
      e.save(); e.globalAlpha = 1 - k; e.strokeStyle = P.live; e.lineWidth = 2; e.beginPath(); e.arc(a.x, a.y, 4 + 22 * ease.out3(k), 0, Math.PI * 2); e.stroke(); e.restore();
    }
  }

  // creations, far first: the two that follow (behind), then the application window (in front)
  const sm = cam.project(SCR_MID);
  const tetherTo = (p, a) => { if (!sm || !p) return; e.save(); e.globalAlpha = a; e.strokeStyle = P.tech; e.lineWidth = 1.1; e.setLineDash([2, 5]); e.beginPath(); e.moveTo(sm.x, sm.y); e.lineTo(p.x, p.y); e.stroke(); e.restore(); };
  for (const m of MORE) {
    const k = ease.inOut5(seg(t, m.t0, m.t0 + 0.85)); if (k <= 0) continue;
    const fr = { ...WIN.from }, to = m.to;
    const at = { x: lerp(fr.x, to.x, k), y: lerp(fr.y, to.y, k) + Math.sin(k * Math.PI) * 0.12, z: lerp(fr.z, to.z, k) };
    const w = lerp(fr.w * 0.6, to.w, k), h = lerp(fr.h * 0.6, to.h, k);
    tetherTo(cam.project({ x: at.x, y: at.y, z: at.z }), 0.8 * smoothstep(seg(k, 0.1, 0.5)));
    e.save(); e.globalAlpha = smoothstep(seg(k, 0, 0.25));
    panel(e, cam, at, w, h, lerp(fr.yaw, to.yaw, k), (c, ww, hh, s) => thing(c, m.type, ww, hh, s, { P, tone: lerp(0.7, 0.86, k) }));
    e.restore();
  }
  {
    const k1 = ease.inOut5(seg(t, 2.4, 3.5)), k2 = ease.inOut3(seg(t, 3.5, 5.0));
    if (k1 > 0) {
      const fr = WIN.from, to = WIN.to;
      // lift off the screen plane (first along its normal, toward the figure), then arc out to face us
      const lift = Math.sin(Math.min(1, k1 * 2) * Math.PI / 2) * (1 - k1) * 0.08;
      const at = { x: lerp(fr.x, to.x, k1) - lift, y: lerp(fr.y, to.y, k1) + Math.sin(k1 * Math.PI) * 0.1, z: lerp(fr.z, to.z, k1) - lift * 0.6 };
      at.x = lerp(at.x, WIN.end.x, k2); at.y = lerp(at.y, WIN.end.y, k2); at.z = lerp(at.z, WIN.end.z, k2);
      const w = lerp(fr.w, to.w, k1), h = lerp(fr.h, to.h, k1), yaw = lerp(fr.yaw, to.yaw, k1);
      tetherTo(cam.project({ x: at.x, y: at.y, z: at.z }), 0.9 * smoothstep(seg(k1, 0.15, 0.5)));
      e.save(); e.globalAlpha = smoothstep(seg(t, 2.4, 2.62));
      panel(e, cam, at, w, h, yaw, (c, ww, hh, s) => thing(c, 'site', ww, hh, s, { P, tone: lerp(0.8, 1, k1) }));
      e.restore();
    }
  }

}

export { camAt as openingCam, WIN, MORE, SCR_MID };
export default { width: W, height: H, fps: 30, duration: 5, palette: PALETTES.brand, motionBlur: { samples: 4, shutter: 0.5 }, load: loadBrand, draw };
