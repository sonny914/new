// The particle engine: shapes, the morphs between them, the camera, and the drawing. Pure in time: draw(n) paints
// frame n from nothing but the config, so any frame renders identically in any order, at any resolution.
import { TAU, clamp, lerp, seg, inOut, inCubic, outExpo, outBack, rng, track, plan as makePlan, rgb } from './timeline.js';
import { createType } from './type.js';
import { sampleLogo } from './logo.js';

export function createReel(cfg, canvas, scale = 1, assets = {}) {
  const W = cfg.width, H = cfg.height, FPS = cfg.fps, DURATION = cfg.duration;
  const P = makePlan(cfg), { steps } = P;
  const CREAM = rgb(cfg.colors.particles), LIVE = rgb(cfg.colors.accent), GROUND = cfg.colors.ground;
  const rnd = rng(cfg.particles.seed);
  const F = cfg.camera.focal ?? 1440;
  const I = cfg.camera.intensity;
  const beat = 60 / cfg.rhythm.bpm, beatOrigin = P.time(cfg.rhythm.origin);

  // ---------- camera tracks; intensity scales every move around the resting shot (the last key)
  const K = Object.fromEntries(Object.entries(cfg.camera.keys).map(([k, v]) => [k, P.keys(v)]));
  const around = (keys, t) => { const rest = keys[keys.length - 1][1]; return rest + (track(keys, t) - rest) * I; };
  // integrate spin and flow once, so speed changes never jolt the angle
  const STEP = 1 / 1200, TABLE = Math.ceil((DURATION + 0.5) / STEP) + 2;
  const yawT = new Float64Array(TABLE), flowT = new Float64Array(TABLE);
  for (let j = 1; j < TABLE; j++) {
    const t = (j - 1) * STEP - 0.25; // the table starts at -0.25 s so trails at t=0 exist
    yawT[j] = yawT[j - 1] + track(K.spin, t) * I * STEP;
    flowT[j] = flowT[j - 1] + track(K.flow, t) * I * STEP;
  }
  const look = (arr, t) => { const x = clamp((t + 0.25) / STEP + 1, 0, TABLE - 2), j = Math.floor(x); return lerp(arr[j], arr[j + 1], x - j); };
  const cameraAt = (t) => ({ d: around(K.dist, t), pitch: track(K.pitch, t), roll: track(K.roll, t) * I, cy: around(K.cy, t), yaw: look(yawT, t) });

  // ---------- particles: every one keeps (u, v, w) through every shape
  const N = cfg.particles.count;
  const U = new Float32Array(N), V = new Float32Array(N), Wr = new Float32Array(N), SZ = new Float32Array(N), HOT = new Uint8Array(N);
  const DX = new Float32Array(N), DY = new Float32Array(N), DZ = new Float32Array(N), DR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    U[i] = rnd(); V[i] = rnd(); Wr[i] = rnd();
    HOT[i] = rnd() < cfg.particles.accentShare ? 1 : 0;
    const s = rnd(); SZ[i] = (s < 0.7 ? 1.3 + s * 1.2 : 2.2 + (s - 0.7) * 6) * (HOT[i] ? 1.25 : 1) * cfg.particles.size; // mostly fine dust, a few grains
    const a = rnd() * TAU, c = rnd() * 2 - 1, r = Math.sqrt(1 - c * c);
    DX[i] = r * Math.cos(a); DY[i] = c; DZ[i] = r * Math.sin(a); DR[i] = rnd();
  }

  // ---------- shapes, in object space (radius ≈ 1). st is the step that brought the shape in (for its clock).
  const dir = (u, v, o) => { const lon = u * TAU, cy = v * 2 - 1, s = Math.sqrt(1 - cy * cy); o[0] = s * Math.cos(lon); o[1] = cy; o[2] = s * Math.sin(lon); return o; };
  const spinY = (o, ang) => { const c = Math.cos(ang), s = Math.sin(ang), x = o[0] * c - o[2] * s; o[2] = o[0] * s + o[2] * c; o[0] = x; return o; };
  const beatPulse = (t) => { const b = (((t - beatOrigin) % beat) + beat) % beat; return Math.exp(-b * 9); };
  const BAND_TILT = [Math.cos(0.32), Math.sin(0.32)];
  const SHAPES = {
    dust(i, t, o) { const r = 1.6 + DR[i] * 4.6; o[0] = DX[i] * r; o[1] = DY[i] * r * 1.4; o[2] = DZ[i] * r; return o; },
    // the nucleus: a dense, churning point of light
    core(i, t, o, st) {
      dir(U[i], V[i], o);
      const r = 0.25 * Math.cbrt(Wr[i]) * (1 + 0.12 * Math.sin(t * 7.5 + U[i] * 9)) + 0.004 * Math.sin(t * 3 + V[i] * 40);
      o[0] *= r; o[1] *= r; o[2] *= r;
      return spinY(o, Math.max(0, t - st.land) * (2.2 + V[i] * 1.6));
    },
    // a shell with a few points inside, breathing on the beat
    sphere(i, t, o, st) {
      dir(U[i], V[i], o);
      const w = Wr[i];
      const r = (w < 0.14 ? 0.35 + w * 4 : 1 + (w - 0.5) * 0.07) * (1 + 0.028 * beatPulse(t) * (t > st.at + 0.45 ? 1 : 0));
      o[0] *= r; o[1] *= r; o[2] *= r; return o;
    },
    // a ring whose points flow around it (camera.keys.flow drives the speed)
    torus(i, t, o) {
      const fl = look(flowT, t);
      const th = U[i] * TAU + fl * (0.8 + 0.4 * V[i]), ph = V[i] * TAU + fl * 1.7;
      const r = 0.31 * (0.82 + 0.36 * Wr[i]) * (1 + 0.04 * beatPulse(t)), R = 0.93;
      o[0] = (R + r * Math.cos(ph)) * Math.cos(th); o[1] = r * Math.sin(ph); o[2] = (R + r * Math.cos(ph)) * Math.sin(th); return o;
    },
    // a Möbius band, leaned so the turn shows the twist
    band(i, t, o) {
      const a = U[i] * TAU + look(flowT, t) * 0.55, s = (V[i] - 0.5) * 0.52, j = (Wr[i] - 0.5) * 0.035;
      const ca = Math.cos(a / 2), sa = Math.sin(a / 2), rr = 1.02 + s * ca;
      o[0] = rr * Math.cos(a) + j * sa * Math.cos(a); o[1] = s * sa * 1.05 - j * ca; o[2] = rr * Math.sin(a) + j * sa * Math.sin(a);
      const y = o[1] * BAND_TILT[0] - o[0] * BAND_TILT[1]; o[0] = o[1] * BAND_TILT[1] + o[0] * BAND_TILT[0]; o[1] = y;
      return o;
    },
  };
  // the brand mark, sampled from its SVG (engine/logo.js). Each point keeps its place in the mark, and the mark has its
  // own world rotation: it spins in at logo.spin rad/s, decelerates over logo.settle s and faces the lens from logo.front
  // on, whatever the camera's spin is doing, so the hold is exactly front-on and still.
  let LX, LY, LZ;
  const LOGO = cfg.logo ?? {}, front = steps.some((s) => s.to === 'logo') ? P.time(LOGO.front) : Infinity;
  if (front < Infinity) {
    if (!assets.logo) throw new Error('the logo shape needs its SVG (config.logo.src), and it did not load');
    const t = sampleLogo(assets.logo, N, LOGO);
    // hand out targets in angular order, matched to each point's angle u, so the points sweep into the mark coherently
    const byU = [...Array(N).keys()].sort((a, b) => U[a] - U[b]);
    const byAng = [...Array(N).keys()].sort((a, b) => Math.atan2(t.y[a], t.x[a]) - Math.atan2(t.y[b], t.x[b]));
    LX = new Float32Array(N); LY = new Float32Array(N); LZ = new Float32Array(N);
    for (let j = 0; j < N; j++) { const i = byU[j], k = byAng[j]; LX[i] = t.x[k]; LY[i] = t.y[k]; LZ[i] = t.z[k]; }
  }
  const logoYaw = (t) => {
    const w = LOGO.spin ?? 2.6, D = LOGO.settle ?? 0.6;
    if (t >= front) return 0;
    if (t >= front - D) return -(w * (front - t) ** 2) / (2 * D);
    return -(w * D) / 2 - w * (front - D - t);
  };
  SHAPES.logo = (i, t, o) => { o[0] = LX[i]; o[1] = LY[i]; o[2] = LZ[i]; return spinY(o, logoYaw(t) - look(yawT, t)); };
  /** 0 while the film moves, 1 once the mark holds: trails and satellites give way so the silhouette reads. */
  const stillness = (t) => (front < Infinity ? seg(t, front - 0.45, front) : 0);

  // waypoints the morphs travel through
  const spindle = (i, o) => { dir(U[i], V[i], o); o[0] *= 0.32; o[2] *= 0.32; o[1] *= 1.9; return o; };
  const cloud = (i, o) => { const r = 1.25 + DR[i] * 1.5; o[0] = DX[i] * r; o[1] = DY[i] * r * 0.75; o[2] = DZ[i] * r; return o; };

  for (const s of steps) if (!SHAPES[s.to]) throw new Error(`unknown shape "${s.to}" (use ${Object.keys(SHAPES).join(', ')})`);

  // ---------- morphs: each moves every point from shape A to shape B over [st.at, st.land], scaled by st.scale
  const A = [0, 0, 0], B = [0, 0, 0], M = [0, 0, 0];
  const bez = (k, o) => { const a = (1 - k) ** 2, b = 2 * k * (1 - k), c = k * k; for (let j = 0; j < 3; j++) o[j] = a * A[j] + b * M[j] + c * B[j]; return o; };
  const mix = (k, o) => { for (let j = 0; j < 3; j++) o[j] = lerp(A[j], B[j], k); return o; };
  const MORPHS = {
    // spiral in, accelerating
    converge: { pre: 0.15, over: 0, fn(i, t, st, o) { const k = inCubic(seg(t, st.at + (-0.15 + Wr[i] * 0.12) * st.scale, st.land)); return spinY(mix(k, o), (1 - k) * 2.6); } },
    // thrown outward, overshoots, settles
    bloom: { pre: 0, over: 0, fn(i, t, st, o) { const s = st.scale; const k = seg(t, st.at + (V[i] * 0.1 + Wr[i] * 0.05) * s, st.at + (0.75 + V[i] * 0.1) * s); return mix(outBack(outExpo(k) * 0.85 + k * 0.15, 1.1), o); } },
    // stretched tall through a spindle, then collapsed into B
    stretch: { pre: 0, over: 0, fn(i, t, st, o) { const s = st.scale, d = Math.abs(V[i] - 0.5) * 0.35 * s; spindle(i, M); return bez(inOut(seg(t, st.at + d, st.land - 0.35 * s + d)), o); } },
    // thrown out into a loose cloud, then reconnected as B
    scatter: { pre: 0, over: 0.4, fn(i, t, st, o) {
      const s = st.scale, k = seg(t, st.at + U[i] * 0.18 * s, st.land + (0.15 + U[i] * 0.2) * s);
      const e = k < 0.42 ? 0.42 * outExpo(k / 0.42) : 0.42 + 0.58 * inOut((k - 0.42) / 0.58);
      cloud(i, M); return bez(e, o);
    } },
  };
  const START = { at: -1e9, land: -1e9, to: P.start };
  /** Particle i, object space, at time t. */
  function pos(i, t, o) {
    let j = steps.length - 1;
    while (j >= 0 && t < steps[j].at - MORPHS[steps[j].morph].pre * steps[j].scale) j--;
    if (j < 0) return SHAPES[P.start](i, t, o, START);
    const st = steps[j], m = MORPHS[st.morph];
    if (t >= st.land + m.over * st.scale) return SHAPES[st.to](i, t, o, st);
    const prev = steps[j - 1] ?? START;
    SHAPES[prev.to](i, t, A, prev); SHAPES[st.to](i, t, B, st);
    return m.fn(i, t, st, o);
  }

  // ---------- satellites: a few orange points in orbit from `satellites.from` to the end
  const satFrom = P.time(cfg.satellites.from);
  const scatters = steps.filter((s) => s.morph === 'scatter');
  function satellite(s, t, o) {
    const born = outExpo(seg(t, satFrom + 0.08 * s, satFrom + 0.85));
    const a = t * (0.9 + 0.25 * s) + s * 2.1 + look(flowT, t) * 0.3, tilt = 0.5 + s * 0.7;
    let r = (1.42 + 0.12 * s) * born;
    for (const sc of scatters) if (t > sc.at && t < sc.land) r *= 1 + 0.3 * Math.sin(Math.PI * seg(t, sc.at, sc.land));
    o[0] = Math.cos(a) * r; o[1] = Math.sin(a) * r * Math.sin(tilt); o[2] = Math.sin(a) * r * Math.cos(tilt); return o;
  }

  /** Per-point brightness by moment: crowded shapes dim each point so the sum reads as form, and the opening dust is lifted. */
  const CROWD = { core: 0.55, torus: 0.2 };
  const first = steps[0];
  function density(t) {
    let d = 1;
    if (P.start === 'dust' && first) d += 1.6 * (1 - seg(t, first.at + 0.15, first.at + 0.75));
    for (const s of steps) if (CROWD[s.to]) d -= CROWD[s.to] * seg(t, s.land - 0.45, s.land) * (1 - seg(t, s.end + 0.1, s.end + 0.6));
    return d;
  }
  const openingSize = (t) => (P.start === 'dust' && first ? 1 + 0.6 * (1 - seg(t, first.at + 0.2, first.land)) : 1);

  // ---------- projection
  function project(p, cam, o) {
    let x = p[0], y = p[1], z = p[2];
    const cyw = Math.cos(cam.yaw), syw = Math.sin(cam.yaw);
    [x, z] = [x * cyw - z * syw, x * syw + z * cyw];
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    [y, z] = [y * cp - z * sp, y * sp + z * cp];
    const zz = z + cam.d;
    if (zz < 0.25) return null;
    const sx = (F * x) / zz, sy = (-F * y) / zz, cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
    o[0] = W / 2 + sx * cr - sy * sr; o[1] = cam.cy + sx * sr + sy * cr; o[2] = zz; return o;
  }

  // ---------- drawing
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const glow = mk(canvas.width / 4, canvas.height / 4), gctx = glow.getContext('2d');
  const glow2 = mk(canvas.width / 4, canvas.height / 4), g2 = glow2.getContext('2d');
  const WIDTHS = [1, 1.5, 2.1, 2.9, 4, 5.5, 7.5, 10, 14, 20], ALPHAS = 14;
  const buckets = Array.from({ length: 2 * WIDTHS.length * ALPHAS * 2 }, () => []);
  const P0 = [0, 0, 0], P1 = [0, 0, 0], P2 = [0, 0, 0], S0 = [0, 0, 0], S1 = [0, 0, 0], S2 = [0, 0, 0];
  const SHUTTER = cfg.particles.shutter, TRAIL = cfg.particles.trail;
  const pushStreak = (list, a, b, max) => { let dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy); if (len > max) { dx *= max / len; dy *= max / len; } list.push(a[0], a[1], a[0] + dx, a[1] + dy); };
  const wIndex = (w) => { let j = 0; while (j < WIDTHS.length - 1 && WIDTHS[j + 1] <= w) j++; return j; };
  const cores = steps.filter((s) => s.to === 'core');

  function particles(t) {
    const calm = 1 - stillness(t), SH = SHUTTER * calm, TR = TRAIL * calm;
    const cam = cameraAt(t), camS = cameraAt(t - SH), camL = cameraAt(t - TR);
    for (const b of buckets) b.length = 0;
    // as the logo holds and the trails stop, points grow and brighten so the mark keeps its weight
    const still = stillness(t), ref = cam.d, dens = density(t) * (1 + ((LOGO.light ?? 1) - 1) * still), grow = openingSize(t) * (1 + ((LOGO.grow ?? 1) - 1) * still);
    for (let i = 0; i < N; i++) {
      const a = project(pos(i, t, P0), cam, S0);
      if (!a) continue;
      const s = project(pos(i, t - SH, P1), camS, S1), l = project(pos(i, t - TR, P2), camL, S2);
      const z = a[2];
      // depth: the front of the form is bright, the back recedes; anything that flies at the lens goes soft and dim
      let alpha = clamp(0.22 + 0.78 * (ref + 1.2 - z) / 2.4, 0.12, 1) * dens;
      let w = SZ[i] * (ref * 0.95) / z * grow;
      if (z < 1.6) { const k = z / 1.6; w *= 1 + (1 - k) * 2.5; alpha *= k * k; }
      if (alpha < 0.02) continue;
      const hot = HOT[i], key = ((hot * WIDTHS.length + wIndex(w)) * ALPHAS + Math.min(ALPHAS - 1, Math.floor(alpha * ALPHAS))) * 2;
      if (s) pushStreak(buckets[key], a, s, 22); else buckets[key].push(a[0], a[1], a[0], a[1]);
      if (l) { const dx = a[0] - l[0], dy = a[1] - l[1]; if (dx * dx + dy * dy > 36) pushStreak(buckets[key + 1], a, l, 64); }
    }
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (let hot = 0; hot < 2; hot++) for (let wi = 0; wi < WIDTHS.length; wi++) for (let ai = 0; ai < ALPHAS; ai++) {
      const key = ((hot * WIDTHS.length + wi) * ALPHAS + ai) * 2, col = hot ? LIVE : CREAM, al = (ai + 0.5) / ALPHAS;
      for (const [pass, k, ww] of [[buckets[key + 1], 0.1, 0.7], [buckets[key], hot ? 0.9 : 0.62, 1]]) {
        if (!pass.length) continue;
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(al * k).toFixed(3)})`;
        ctx.lineWidth = WIDTHS[wi] * ww;
        ctx.beginPath();
        for (let j = 0; j < pass.length; j += 4) { ctx.moveTo(pass[j + 2], pass[j + 3]); ctx.lineTo(pass[j] + 0.01, pass[j + 1]); }
        ctx.stroke();
      }
    }
    // satellites: comet tails sampled across the last 0.18 s
    const satAlpha = 1 - stillness(t);
    for (let s = 0; s < cfg.satellites.count; s++) {
      if (t < satFrom - 0.25 || satAlpha <= 0) break;
      let prev = null;
      for (let j = 10; j >= 0; j--) {
        const tt = t - j * 0.018, p = project(satellite(s, tt, P0), cameraAt(tt), [0, 0, 0]);
        if (!p || p[2] < 1.4) { prev = null; continue; }
        const w = 5.5 * ref / p[2], al = satAlpha * (1 - j / 11) ** 1.6 * clamp((ref + 1.6 - p[2]) / 2.4, 0.35, 1);
        if (prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 40) {
          ctx.strokeStyle = `rgba(${LIVE[0]},${LIVE[1]},${LIVE[2]},${(al * 0.9).toFixed(3)})`; ctx.lineWidth = w * (1 - j / 14);
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0] + 0.01, p[1]); ctx.stroke();
        }
        prev = p;
      }
    }
    // the nucleus: a hot point of light while the form is a core
    for (const st of cores) {
      const nk = seg(t, st.land - 0.4 * st.scale, st.land) * (1 - seg(t, st.end, st.end + 0.35));
      if (nk <= 0) continue;
      const p = project([0, 0, 0], cam, [0, 0, 0]), r = (110 + 18 * Math.sin(t * 7.5)) * nk * (3 / cam.d);
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
      g.addColorStop(0, `rgba(255,140,60,${0.4 * nk})`); g.addColorStop(0.25, `rgba(${LIVE},${0.22 * nk})`); g.addColorStop(1, `rgba(${LIVE},0)`);
      ctx.fillStyle = g; ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    return cam;
  }

  function bloomPass() {
    gctx.globalCompositeOperation = 'copy'; gctx.drawImage(canvas, 0, 0, glow.width, glow.height);
    g2.globalCompositeOperation = 'copy'; g2.filter = `blur(${7 * scale}px)`; g2.drawImage(glow, 0, 0); g2.filter = 'none';
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = cfg.colors.glow;
    ctx.drawImage(glow2, 0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- finish: vignette and a breath of grain
  const vig = (() => {
    const v = mk(W, H), g = v.getContext('2d');
    const r = g.createRadialGradient(W / 2, H * 0.46, H * 0.22, W / 2, H * 0.46, H * 0.72);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(0,0,0,${cfg.colors.vignette})`); g.fillStyle = r; g.fillRect(0, 0, W, H); return v;
  })();
  const grains = Array.from({ length: 4 }, () => {
    const g = mk(W / 2, H / 2), x = g.getContext('2d'), im = x.createImageData(W / 2, H / 2);
    for (let j = 0; j < im.data.length; j += 4) { const v = rnd() * 255; im.data[j] = im.data[j + 1] = im.data[j + 2] = v; im.data[j + 3] = 255; }
    x.putImageData(im, 0, 0); return g;
  });

  const type = createType(ctx, cfg, P, scale);

  function draw(n) {
    const t = n / FPS;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H);
    const cam = particles(t);
    bloomPass();
    ctx.drawImage(vig, 0, 0);
    // type drifts a little against the camera's turn: it lives in the same space, nearer the lens
    type.draw(t, -Math.sin(cam.yaw * 0.5) * 6 + cam.roll * 60);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.22;
    ctx.drawImage(grains[n % 4], 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  return { draw, ready: type.ready, frames: Math.round(DURATION * FPS), plan: P };
}
