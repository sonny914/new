// TECH DROP 001 as a motion carousel: 6 looping 4:5 slides (1080x1350), 6 s each, no narration.
// One update per slide, one original diagram each, same facts and wording discipline as the reel (script.md).
// The comp plays the slides back to back (60 s); export/carousel.sh cuts it into one MP4 per slide.
import { clamp, lerp, seg, ease, smoothstep, hash } from '../../engine/math.js';
import { makeLayers, halo, glow, vignette, grain } from '../../engine/light.js';
import { human, bulb } from '../../engine/humans.js';
import { PALETTES, mix } from '../../engine/color.js';
import { setPalette, P, mono } from '../everybody-can-build/film-keys.js';
import { brandPath } from '../shared/story.js';

const W = 1080, H = 1350, FPS = 30, T = 6;
let L, MARK, WORD;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');

/* ---------------- type ---------------- */
function head(ctx, lines, y0, r, size = 86) {   // editorial headline: lines rise into place behind a mask
  ctx.save(); ctx.font = `800 ${size}px "Inter Display"`;
  lines.forEach((ln, i) => { const y = y0 + i * size * 1.02, dy = (1 - ease.out5(clamp(r * 1.6 - i * 0.28))) * size * 1.1;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size, W, size * 1.24); ctx.clip(); let x = 80;
    for (const [s, c] of (Array.isArray(ln[0]) ? ln : [[ln[0], ln[1]]])) { ctx.fillStyle = c ?? P.ink; ctx.fillText(s, x, y + dy); x += ctx.measureText(s).width; }
    ctx.restore(); });
  ctx.restore();
}
const sub = (ctx, s, y, a, color) => { ctx.save(); ctx.globalAlpha = a; ctx.font = '500 34px "Inter Display"'; ctx.fillStyle = color ?? P.ink2; ctx.fillText(s, 80, y); ctx.restore(); };
const M = (ctx, s, x, y, o = {}) => mono(ctx, s, x, y, { size: 18, color: P.ink2, track: 4, ...o });
function card(ctx, x, y, w, h, a, { stroke } = {}) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0B0B0D'; ctx.strokeStyle = stroke ?? mix(P.bg, P.ink2, 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill(); ctx.stroke(); ctx.restore(); }
function keyIcon(c, x, y, r, col) { c.save(); c.strokeStyle = col; c.lineWidth = r * 0.28; c.lineCap = 'round'; c.beginPath(); c.arc(x - r * 0.7, y, r * 0.5, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x - r * 0.2, y); c.lineTo(x + r, y); c.moveTo(x + r * 0.6, y); c.lineTo(x + r * 0.6, y + r * 0.45); c.moveTo(x + r * 0.95, y); c.lineTo(x + r * 0.95, y + r * 0.35); c.stroke(); c.restore(); }
function lockIcon(c, x, y, r, col) { c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = r * 0.22; c.beginPath(); c.arc(x, y - r * 0.35, r * 0.42, Math.PI, 0); c.stroke(); c.beginPath(); c.roundRect(x - r * 0.62, y - r * 0.35, r * 1.24, r * 0.95, r * 0.12); c.fill(); c.restore(); }
/** the luminous figure, 2D, standing on (x, y) with height h px */
function figure(e, x, y, h, o) { e.save(); e.translate(x, y); const s = h / 1.75; e.scale(s, s); human(e, s, { P, ...o }); e.restore(); }
/** a small 2D workstation: desk, monitor (glow k), the figure seated at it */
function desk(e, x, y, sc, k = 1, lines = 3) {
  e.save(); e.translate(x, y); e.scale(sc, sc);
  e.fillStyle = mix(P.bg, P.ink2, 0.55); e.fillRect(-10, -150, 330, 10); e.fillRect(0, -140, 8, 140); e.fillRect(300, -140, 8, 140);   // desk
  e.fillStyle = mix(P.bg, P.ink, 0.9); e.beginPath(); e.roundRect(150, -300, 150, 105, 6); e.fill(); e.fillRect(220, -195, 10, 45);       // monitor
  e.fillStyle = mix('#151517', P.ink, 0.12 * k); e.fillRect(158, -292, 134, 89);
  e.fillStyle = mix(P.bg, P.ink2, 0.5 + 0.5 * k); for (let i = 0; i < lines; i++) e.fillRect(170, -276 + i * 18, 70 + 40 * hash(i, 5), 6);
  e.restore();
  figure(e, x - 95 * sc, y, 400 * sc, { pose: 'sit', reach: 1, lean: 0.08 });
}
function cloud(e, x, y, w, h, k, mods) {   // the cloud environment: a frame with module slots
  e.save(); e.globalAlpha *= k; e.strokeStyle = mix(P.tech, P.ink2, 0.6); e.lineWidth = 2; e.setLineDash([]); e.beginPath(); e.roundRect(x, y, w, h * k, 14); e.stroke();
  e.fillStyle = '#08080A'; e.fill(); e.restore();
  mods.forEach((m, i) => { const mx = x + 30 + i * ((w - 60) / mods.length), mw = (w - 60) / mods.length - 18, my = y + h - 120;
    if (m.slot) { e.save(); e.globalAlpha *= k; e.strokeStyle = m.color ?? P.ink; e.setLineDash([7, 6]); e.lineWidth = 2; e.strokeRect(mx, my, mw, 90); e.restore(); }
    if (m.fill > 0) { e.save(); e.globalAlpha *= k * m.fill; e.fillStyle = m.lit ? P.ink : mix(P.bg, P.ink2, 0.55); e.fillRect(mx, my - (1 - m.fill) * 120, mw, 90); e.restore(); }
    M(e, m.k, mx + mw / 2, my + 122, { size: 15, align: 'center', alpha: k, color: m.tag ?? P.ink2 }); });
}

/* ---------------- slides ---------------- */
const S = [
  { // 01 cover
    head: [['CLAUDE CODE'], ['JUST LEVELED UP.']], sub: 'What changed, in five swipes. →', note: 'QUIET BANDS · TECH DROP 001',
    draw(e, ctx, u) { const k = smoothstep(seg(u, 0.3, 1.2)); e.save(); e.globalAlpha = k; desk(e, 330, 1150, 1.25, 0.6 + 0.4 * Math.sin(u * 2) ** 2, 4); e.restore();
      e.save(); e.globalAlpha = k; e.translate(290, 760); e.scale(220, 220); bulb(e, 220, { P, glow: 0.6 + 0.4 * smoothstep(seg(u, 1.5, 2.4)) }); e.restore(); } },
  { // 02 Fable 5.2
    head: [['FABLE 5.2.'], [['UP TO 30% FASTER.', null]]], sub: 'Output generation, compared with Fable 5.1.', note: 'PER THE ANNOUNCEMENT · ILLUSTRATIVE, NOT A BENCHMARK',
    draw(e, ctx, u) { const race = seg(u, 1.0, 4.0), y = 760;
      for (const [lab, k, yy, hot] of [['FABLE 5.1', clamp(race), y, 0], ['FABLE 5.2', clamp(race * 1.3), y + 150, 1]]) {
        M(ctx, lab, 80, yy, { size: 22, color: hot ? P.ink : P.ink2 });
        ctx.fillStyle = mix(P.bg, P.ink2, 0.22); ctx.fillRect(80, yy + 24, W - 160, 44); ctx.fillStyle = hot ? P.ink : P.ink2; ctx.fillRect(80, yy + 24, (W - 160) * ease.inOut3(k), 44);
        if (k >= 1) M(ctx, 'DONE', W - 80, yy, { size: 18, color: hot ? P.live : P.ink2, align: 'right' }); }
      const d = smoothstep(seg(race, 1 / 1.3, 1 / 1.3 + 0.1)); ctx.save(); ctx.globalAlpha = d; ctx.font = '800 64px "Inter Display"'; ctx.fillStyle = P.live; ctx.fillText('UP TO 30%', 80, y + 330); ctx.restore();
      M(ctx, 'FASTER OUTPUTS VS 5.1', 80, y + 380, { alpha: d, size: 20 }); } },
  { // 03 cloud environment + dependency
    head: [['CLAUDE CAN HELP'], ['SET UP ITS OWN'], ['CLOUD ENVIRONMENT.']], size: 74, sub: 'Missing a dependency? It can find it.', note: 'CLAUDE CODE · CLOUD SESSIONS',
    draw(e, ctx, u) { const k = ease.out3(seg(u, 0.5, 1.5)), miss = smoothstep(seg(u, 1.6, 1.9)), found = smoothstep(seg(u, 2.8, 3.0)), inst = ease.inOut3(seg(u, 3.1, 3.9));
      cloud(e, 140, 740, 800, 400, k, [{ k: 'RUNTIME', fill: smoothstep(seg(u, 1.0, 1.3)) }, { k: found ? 'FOUND' : 'MISSING', slot: inst < 1, color: found ? P.ink : P.live, fill: inst, lit: 1, tag: found ? P.ink : P.live }, { k: 'NETWORK', fill: smoothstep(seg(u, 1.2, 1.5)) }, { k: 'SECRETS', fill: smoothstep(seg(u, 1.3, 1.6)) }]);
      if (miss > 0 && found < 1) { const sx = 140 + 30 + (800 - 60) / 4 + ((800 - 60) / 4 - 18) / 2, a = Math.sin(u * 6) * 0.5 + 0.5; ctx.save(); ctx.globalAlpha = miss * (0.4 + 0.6 * a); ctx.strokeStyle = P.live; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, 1065, 70, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      M(ctx, 'CLOUD ENVIRONMENT', 160, 790, { alpha: k, color: P.ink }); } },
  { // 04 network access
    head: [['NETWORK ACCESS?'], [['YOU APPROVE.', null]]], sub: 'Access changes wait for your yes.', note: 'APPROVAL WORKFLOW · ILLUSTRATIVE',
    draw(e, ctx, u) { const a = smoothstep(seg(u, 0.5, 0.9)), ap = smoothstep(seg(u, 2.6, 2.8)), x = 140, y = 720, w = 800, h = 270;
      card(ctx, x, y, w, h, a); M(ctx, 'APPROVAL NEEDED', x + 36, y + 60, { alpha: a });
      ctx.save(); ctx.globalAlpha = a; ctx.font = '800 44px "Inter Display"'; ctx.fillStyle = P.ink; ctx.fillText('Allow network access?', x + 36, y + 125);
      const bw = (w - 92) / 2, by = y + 170; ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x + 36, by, bw, 66, 12); ctx.stroke();
      ctx.font = '600 22px "JetBrains Mono"'; ctx.letterSpacing = '4px'; ctx.textAlign = 'center'; ctx.fillStyle = P.ink2; ctx.fillText('DENY', x + 36 + bw / 2, by + 42);
      ctx.fillStyle = ap > 0.5 ? P.live : P.ink; ctx.beginPath(); ctx.roundRect(x + 56 + bw, by, bw, 66, 12); ctx.fill(); ctx.fillStyle = P.bg; ctx.fillText(ap > 0.5 ? 'APPROVED' : 'APPROVE', x + 56 + bw * 1.5, by + 42);
      const tap = smoothstep(seg(u, 2.0, 2.5)); if (tap > 0 && ap < 1) { ctx.globalAlpha = a * (1 - ap); ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x + 56 + bw * 1.5, by + 33, 46 - 16 * tap, 0, Math.PI * 2); ctx.stroke(); } ctx.restore();
      // the path out: a closed gate until approved
      const gy = 1130, gx = 540, open = ease.inOut3(seg(u, 2.8, 3.4)); e.save(); e.globalAlpha = a; e.strokeStyle = mix(P.tech, P.ink, open); e.lineWidth = 2 + open; e.setLineDash(open > 0.5 ? [] : [6, 8]); e.beginPath(); e.moveTo(160, gy); e.lineTo(920, gy); e.stroke(); e.setLineDash([]);
      e.strokeStyle = P.ink; e.lineWidth = 4; const gh = 28 * (1 - 0.85 * open); e.beginPath(); e.moveTo(gx - 14, gy - gh); e.lineTo(gx - 14, gy + gh); e.moveTo(gx + 14, gy - gh); e.lineTo(gx + 14, gy + gh); e.stroke();
      if (open > 0.5) { const px = 160 + ((u - 3.2) * 320) % 760; e.fillStyle = P.ink; e.beginPath(); e.arc(px, gy, 6, 0, Math.PI * 2); e.fill(); } e.restore();
      M(ctx, 'ENVIRONMENT', 160, gy + 50, { alpha: a, size: 15 }); M(ctx, 'OUTSIDE', 920, gy + 50, { alpha: a, size: 15, align: 'right' }); } },
  { // 05 API keys
    head: [['API KEYS GO IN'], ['SECURELY.']], sub: 'Entered outside the chat, kept as a secret.', note: 'NEVER PASTE KEYS INTO A CONVERSATION',
    draw(e, ctx, u) { const a = smoothstep(seg(u, 0.4, 0.9)), k = ease.inOut3(seg(u, 1.6, 3.4)), done = smoothstep(seg(u, 3.4, 3.7));
      // two lanes from you to the environment: the chat (crossed) and the secure field
      for (const [y, lab, ok] of [[790, 'THE CHAT', 0], [1010, 'SECURE FIELD', 1]]) { e.save(); e.globalAlpha = a; e.strokeStyle = ok ? P.ink : P.tech; e.lineWidth = ok ? 4 : 2; e.setLineDash(ok ? [] : [6, 8]); e.beginPath(); e.moveTo(200, y); e.lineTo(880, y); e.stroke(); e.restore(); M(ctx, lab, 200, y - 26, { alpha: a, color: ok ? P.ink : P.ink2 }); }
      ctx.save(); ctx.globalAlpha = a; keyIcon(ctx, 540, 790, 22, P.ink2); ctx.strokeStyle = P.live; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(505, 755); ctx.lineTo(575, 825); ctx.moveTo(575, 755); ctx.lineTo(505, 825); ctx.stroke(); ctx.restore();
      M(ctx, 'NOT HERE', 540, 870, { alpha: a, align: 'center', color: P.ink2 });
      if (done < 1) { ctx.save(); ctx.globalAlpha = a * (1 - done); keyIcon(ctx, lerp(220, 860, k), 1010, 22, P.ink); ctx.restore(); }
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(160, 900, 14, 0, Math.PI * 2); ctx.fill(); ctx.restore(); M(ctx, 'YOU', 160, 950, { alpha: a, align: 'center' });
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(880, 850, 120, 110, 12); ctx.stroke(); lockIcon(ctx, 940, 918, 30, mix(P.ink2, P.ink, done)); ctx.restore();
      M(ctx, done > 0.5 ? 'STORED' : 'SECRETS', 940, 1000, { alpha: a, align: 'center', color: done > 0.5 ? P.ink : P.ink2 }); } },
  { // 06 /usage + /storage
    head: [['HOUSEKEEPING,'], ['BUILT IN.']], sub: 'Two slash commands for what eats your budget.', note: '/USAGE · /STORAGE',
    draw(e, ctx, u) { const a = smoothstep(seg(u, 0.4, 0.8));
      card(ctx, 80, 650, 920, 290, a); M(ctx, '/usage', 116, 715, { size: 34, color: P.ink, track: 1, weight: 600, alpha: a }); M(ctx, 'WHAT’S EATING YOUR USAGE · AND THE FIX', 116, 752, { size: 15, alpha: a });
      const hl = smoothstep(seg(u, 1.2, 1.5)), shrink = ease.inOut3(seg(u, 2.0, 2.8)); let x = 116; const bw = 848;
      [0.44, 0.17, 0.14, 0.13, 0.12].forEach((v, i) => { const ww = bw * v * (i ? 1 : lerp(1, 0.32, shrink)); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = i ? mix(P.bg, P.ink2, 0.7 - i * 0.1) : mix(P.ink2, P.ink, hl); ctx.fillRect(x, 790, ww - 6, 56);
        if (!i && hl > 0) { ctx.globalAlpha = a * hl; ctx.strokeStyle = P.live; ctx.lineWidth = 3; ctx.strokeRect(x - 5, 785, ww + 4, 66); } ctx.restore(); x += ww; });
      M(ctx, shrink > 0.5 ? 'FIXED' : 'THE BIG ONE', 116, 895, { size: 16, alpha: a * hl, color: shrink > 0.5 ? P.ink : P.live });
      card(ctx, 80, 970, 920, 290, a); M(ctx, '/storage', 116, 1035, { size: 34, color: P.ink, track: 1, weight: 600, alpha: a }); M(ctx, 'UNUSED WORKTREES + SESSIONS, CLEARED', 116, 1072, { size: 15, alpha: a });
      const sw = seg(u, 3.0, 4.2); [1, 0, 0, 1, 0, 0].forEach((used, i) => { const out = used ? 0 : ease.in3(clamp(sw * 1.6 - i * 0.12)); ctx.save(); ctx.globalAlpha = a * (1 - out); ctx.fillStyle = used ? P.ink : mix(P.bg, P.ink2, 0.6); ctx.beginPath(); ctx.roundRect(116 + i * 146 + out * 60, 1110, 120, 80, 8); ctx.fill(); ctx.restore();
        M(ctx, i % 2 ? 'SESSION' : 'WORKTREE', 176 + i * 146, 1222, { size: 13, align: 'center', alpha: a * (1 - out), color: used ? P.ink : P.tech }); });
      M(ctx, 'SPACE BACK', 964, 1035, { size: 16, align: 'right', alpha: a * smoothstep(seg(sw, 0.8, 1)), color: P.ink }); } },
  { // 07 ultrathink
    head: [['ULTRATHINK'], ['IS BACK.']], sub: 'Extra reasoning, for one turn.', note: 'ONE TURN · EXTRA REASONING EFFORT',
    draw(e, ctx, u) { const a = smoothstep(seg(u, 0.4, 0.8)), grow = ease.inOut3(seg(u, 1.0, 3.6)), q = { x: 150, y: 960 }, z = { x: 930, y: 960 };
      e.save(); e.globalAlpha = a; e.strokeStyle = P.tech; e.lineWidth = 2; e.setLineDash([6, 8]); e.beginPath(); e.moveTo(q.x, 1180); e.lineTo(z.x, 1180); e.stroke(); e.restore();
      M(ctx, 'A NORMAL TURN', 540, 1220, { size: 15, align: 'center', alpha: a, color: P.tech });
      const tree = (x0, y0, x1, depth) => { if (!depth) return; const mx = lerp(x0, x1, 0.5);
        for (const s of [-1, 1]) { const my = y0 + s * 21 * depth, kk = clamp(grow * 4 - (4 - depth)); if (kk <= 0) continue; e.save(); e.globalAlpha = a; e.strokeStyle = mix(P.ink2, P.ink, depth / 4); e.lineWidth = 1 + depth * 0.6; e.beginPath(); e.moveTo(x0, y0); e.quadraticCurveTo(lerp(x0, mx, 0.5), my, lerp(x0, mx, kk), lerp(y0, my, kk)); e.stroke(); e.restore(); tree(mx, my, x1, depth - 1); } };
      tree(q.x, q.y, z.x, 4);
      const conv = smoothstep(seg(u, 3.4, 3.9)); e.save(); e.globalAlpha = a * conv; e.strokeStyle = P.ink; e.lineWidth = 3; for (let i = 0; i < 12; i++) { const y = q.y + (i - 5.5) * 7; e.beginPath(); e.moveTo(z.x - 120, y); e.quadraticCurveTo(z.x - 40, y, z.x, z.y); e.stroke(); } e.restore();
      for (const [p, lab] of [[q, 'ASK'], [z, 'ANSWER']]) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore(); M(ctx, lab, p.x, p.y + 50, { align: 'center', alpha: a }); } } },
  { // 08 models
    head: [['PICK THE'], ['RIGHT MODEL.']], sub: 'Per the announcement:', note: 'OPUS 5.5 REMAINS THE STARTING POINT FOR MOST CODING',
    draw(e, ctx, u) { const a = smoothstep(seg(u, 0.4, 0.8)), o = smoothstep(seg(u, 0.9, 1.3)), f = smoothstep(seg(u, 2.0, 2.4)), w = 440, y = 700, h = 520;
      [[80, 'OPUS 5.5', 'MOST CODING', 'START HERE', o, P.ink], [560, 'FABLE 5.2', 'BIGGER, OPEN-ENDED', 'WORTH TESTING', f, P.live]].forEach(([x, n, use, tag, k, tc], j) => {
        card(ctx, x, y, w, h, a * (0.35 + 0.65 * k), { stroke: mix(P.ink2, P.ink, k) });
        ctx.save(); ctx.globalAlpha = a * (0.35 + 0.65 * k); ctx.font = '800 52px "Inter Display"'; ctx.fillStyle = P.ink; ctx.fillText(n, x + 36, y + 84); ctx.restore();
        M(ctx, use, x + 36, y + 126, { size: 17, alpha: a * (0.35 + 0.65 * k) });
        if (!j) for (let r = 0; r < 6; r++) { ctx.save(); ctx.globalAlpha = a * o; ctx.fillStyle = mix(P.bg, P.ink, 0.3 + 0.1 * r); ctx.fillRect(x + 36, y + 180 + r * 40, (w - 72) * (0.5 + 0.45 * hash(r, 3)) * smoothstep(seg(u, 1.0 + r * 0.1, 1.4 + r * 0.1)), 16); ctx.restore(); }
        else { const pts = Array.from({ length: 11 }, (_, i) => ({ x: x + 50 + (w - 100) * hash(i, 61), y: y + 190 + 230 * hash(i, 62) })); e.save(); e.globalAlpha = a * f; e.strokeStyle = P.ink2; e.lineWidth = 1.5;
          pts.forEach((p, i) => { const q = pts[(i * 3 + 2) % 11], kk = smoothstep(seg(u, 2.2 + i * 0.08, 2.7 + i * 0.08)); e.beginPath(); e.moveTo(p.x, p.y); e.lineTo(lerp(p.x, q.x, kk), lerp(p.y, q.y, kk)); e.stroke(); });
          pts.forEach((p) => { e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 6, 0, Math.PI * 2); e.fill(); }); e.restore(); }
        M(ctx, tag, x + 36, y + h - 40, { size: 18, alpha: a * smoothstep(seg(u, j ? 3.0 : 1.8, j ? 3.4 : 2.2)), color: tc }); }); } },
  { // 09 another device
    head: [['CLOSE THE LAPTOP.'], ['IT KEEPS RUNNING.']], size: 80, sub: 'Pick the cloud session up from another device.', note: 'CLOUD SESSIONS RUN WITHOUT YOUR LOCAL MACHINE OPEN',
    draw(e, ctx, u) { const a = smoothstep(seg(u, 0.3, 0.7)), off = smoothstep(seg(u, 1.0, 1.6)), ph = smoothstep(seg(u, 2.4, 2.8)), link = ease.inOut3(seg(u, 2.8, 3.6));
      // laptop (dims), the cloud (keeps pulsing), the phone (picks it up)
      e.save(); e.globalAlpha = a; e.fillStyle = mix(P.bg, P.ink, 0.85); e.beginPath(); e.roundRect(110, 1050, 280, 18, 6); e.fill();
      e.save(); e.translate(130, 1050); e.scale(1, lerp(1, 0.08, off)); e.beginPath(); e.roundRect(0, -170, 240, 170, 8); e.fill(); e.fillStyle = mix('#151517', P.ink, 0.15 * (1 - off)); e.fillRect(10, -160, 220, 150); e.restore(); e.restore();
      M(ctx, off > 0.5 ? 'CLOSED' : 'YOUR LAPTOP', 250, 1110, { alpha: a, align: 'center', size: 15 });
      const cx = 540, cy = 790, pulseK = 0.5 + 0.5 * Math.sin(u * 3); e.save(); e.globalAlpha = a; e.strokeStyle = P.ink; e.lineWidth = 2.5; e.beginPath(); e.roundRect(cx - 150, cy - 70, 300, 140, 20); e.stroke();
      for (let i = 0; i < 3; i++) { e.fillStyle = mix(P.bg, P.ink, 0.4 + 0.6 * (i === Math.floor(u * 2) % 3 ? 1 : 0.3)); e.fillRect(cx - 110 + i * 78, cy - 20, 62, 40); } e.restore();
      M(ctx, 'CLOUD SESSION · RUNNING', cx, cy - 96, { alpha: a, align: 'center', color: P.ink, size: 16 });
      const lap = { x: 250, y: 960 }, phone = { x: 830, y: 1060 };
      e.save(); e.globalAlpha = a * (1 - off) * 0.9; e.strokeStyle = P.ink2; e.lineWidth = 2; e.setLineDash([6, 7]); e.beginPath(); e.moveTo(lap.x, lap.y - 60); e.quadraticCurveTo(300, cy, cx - 150, cy); e.stroke(); e.restore();
      e.save(); e.globalAlpha = a * ph; e.fillStyle = P.ink; e.beginPath(); e.roundRect(phone.x - 45, phone.y - 150, 90, 170, 14); e.fill(); e.fillStyle = '#111'; e.fillRect(phone.x - 36, phone.y - 136, 72, 136); e.fillStyle = mix(P.bg, P.ink, pulseK); e.fillRect(phone.x - 26, phone.y - 120, 52, 10); e.restore();
      if (link > 0) { e.save(); e.globalAlpha = a; e.strokeStyle = P.ink; e.lineWidth = 2.5; e.setLineDash([6, 7]); e.beginPath(); const x1 = cx + 150, y1 = cy, x2 = phone.x, y2 = phone.y - 155; e.moveTo(x1, y1); e.quadraticCurveTo(lerp(x1, x2, 0.6), y1, lerp(x1, x2, link), lerp(y1, y2, link * link)); e.stroke(); e.restore(); }
      M(ctx, 'ANOTHER DEVICE', phone.x, 1110, { alpha: a * ph, align: 'center', size: 15, color: link >= 1 ? P.ink : P.ink2 }); } },
  { // 10 the shift + Quiet Bands
    head: [['THE REAL SHIFT:'], ['MORE OF THE WORK'], [['BETWEEN IDEA', null]], [['AND FINISHED.', 'live']]], size: 74, note: '',
    draw(e, ctx, u) { const a = smoothstep(seg(u, 2.6, 3.2));
      const mk = smoothstep(seg(u, 2.8, 3.4)), wk = smoothstep(seg(u, 3.2, 3.8)), lk = smoothstep(seg(u, 3.6, 4.2));
      if (mk > 0) { const markH = 96, mw = markH * 823 / 658; ctx.save(); ctx.globalAlpha = mk; ctx.fillStyle = P.ink; ctx.translate(W / 2 - mw / 2, 900); ctx.scale(markH / 658, markH / 658); ctx.fill(MARK); ctx.restore(); }
      if (wk > 0) { const wh = 40, ww = wh * 845 / 155; ctx.save(); ctx.globalAlpha = wk; ctx.fillStyle = P.ink; ctx.translate(W / 2 - ww / 2, 1030); ctx.scale(wh / 155, wh / 155); ctx.fill(WORD); ctx.restore(); }
      if (lk > 0) { ctx.save(); ctx.globalAlpha = lk; ctx.font = '800 46px "Inter Display"'; ctx.textAlign = 'center'; ctx.fillStyle = P.ink; ctx.fillText('BUILD WHAT MATTERS.', W / 2, 1150); ctx.restore(); }
      // the path: idea -> work carried -> finished, drawn before the identity takes over
      const k = ease.inOut3(seg(u, 0.6, 2.2)), fade = 1 - a; if (fade > 0.01) { e.save(); e.globalAlpha = fade; e.strokeStyle = P.ink2; e.lineWidth = 2.5; e.setLineDash([6, 8]); e.beginPath(); e.moveTo(160, 1000); e.lineTo(lerp(160, 920, k), 1000); e.stroke(); e.setLineDash([]);
        for (let i = 0; i < 8; i++) { const x = 160 + ((u * 160 + i * 95) % 760); if (x > lerp(160, 920, k)) continue; e.fillStyle = P.ink; e.fillRect(x - 6, 994, 12, 12); }
        e.fillStyle = P.ink; e.beginPath(); e.arc(160, 1000, 14, 0, Math.PI * 2); e.fill(); if (k >= 1) { e.fillStyle = P.live; e.fillRect(904, 984, 32, 32); } e.restore();
        M(ctx, 'IDEA', 160, 1060, { alpha: fade, align: 'center' }); M(ctx, 'FINISHED', 920, 1060, { alpha: fade * smoothstep(seg(k, 0.9, 1)), align: 'center', color: P.ink }); } } },
  { key: 'fable', // Fable 5.2 speed + which model for what
    head: [['FABLE 5.2.'], ['UP TO 30% FASTER.']], sub: 'Output generation, compared with Fable 5.1.', note: 'PER THE ANNOUNCEMENT · ILLUSTRATIVE, NOT A BENCHMARK',
    draw(e, ctx, u) { const race = seg(u, 0.8, 3.2), y = 650;
      for (const [lab, k, yy, hot] of [['FABLE 5.1', clamp(race), y, 0], ['FABLE 5.2', clamp(race * 1.3), y + 120, 1]]) {
        M(ctx, lab, 80, yy, { size: 20, color: hot ? P.ink : P.ink2 });
        ctx.fillStyle = mix(P.bg, P.ink2, 0.22); ctx.fillRect(80, yy + 22, W - 160, 38); ctx.fillStyle = hot ? P.ink : P.ink2; ctx.fillRect(80, yy + 22, (W - 160) * ease.inOut3(k), 38);
        if (k >= 1) M(ctx, 'DONE', W - 80, yy, { size: 17, color: hot ? P.live : P.ink2, align: 'right' }); }
      const d = smoothstep(seg(race, 1 / 1.3, 1 / 1.3 + 0.1)); ctx.save(); ctx.globalAlpha = d; ctx.font = '800 50px "Inter Display"'; ctx.fillStyle = P.live; ctx.fillText('UP TO 30% FASTER OUTPUTS', 80, y + 250); ctx.restore();
      // which model for what (per the announcement)
      const m = smoothstep(seg(u, 3.4, 3.9)), w = 450, yy = 980;
      [[80, 'OPUS 5.5', 'MOST CODING · START HERE'], [550, 'FABLE 5.2', 'BIGGER, OPEN-ENDED · WORTH TESTING']].forEach(([x, n, use], j) => {
        card(ctx, x, yy, w, 170, m * (j ? smoothstep(seg(u, 3.8, 4.3)) : 1)); ctx.save(); ctx.globalAlpha = m * (j ? smoothstep(seg(u, 3.8, 4.3)) : 1); ctx.font = '800 40px "Inter Display"'; ctx.fillStyle = P.ink; ctx.fillText(n, x + 30, yy + 70); ctx.restore();
        M(ctx, use, x + 30, yy + 120, { size: 15, track: 2, alpha: m * (j ? smoothstep(seg(u, 3.8, 4.3)) : 1), color: j ? P.live : P.ink2 }); }); } },
  { key: 'cloud', // cloud setup: dependency, network approval, API key
    head: [['CLAUDE HELPS SET'], ['UP ITS OWN CLOUD.']], sub: 'You still approve what it can reach.', note: 'CLOUD SESSIONS · APPROVAL WORKFLOW · ILLUSTRATIVE',
    draw(e, ctx, u) {
      const rows = [
        ['MISSING DEPENDENCY', 'FOUND · INSTALLED', 0.8, (x, y, k) => { ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = k > 0.5 ? P.ink : P.live; ctx.setLineDash(k > 0.5 ? [] : [6, 5]); ctx.lineWidth = 2.5; ctx.strokeRect(x - 26, y - 26, 52, 52); if (k > 0.5) { ctx.fillStyle = P.ink; ctx.fillRect(x - 18, y - 18, 36, 36); } ctx.restore(); }],
        ['NETWORK ACCESS', 'YOU APPROVED', 2.1, (x, y, k) => { ctx.save(); ctx.fillStyle = k > 0.5 ? P.live : P.ink; ctx.beginPath(); ctx.roundRect(x - 40, y - 22, 80, 44, 10); ctx.fill(); ctx.fillStyle = P.bg; ctx.font = '700 15px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(k > 0.5 ? '✓' : 'OK?', x, y + 6); ctx.restore(); }],
        ['API KEY', 'SECURE FIELD · NOT THE CHAT', 3.4, (x, y, k) => k > 0.5 ? lockIcon(ctx, x, y + 8, 30, P.ink) : keyIcon(ctx, x, y, 22, P.ink)],
      ];
      rows.forEach(([a, b, t0, icon], i) => { const y = 700 + i * 170, k = smoothstep(seg(u, t0 + 0.6, t0 + 0.9)), in0 = smoothstep(seg(u, t0 - 0.4, t0));
        card(ctx, 80, y - 60, 920, 130, in0, { stroke: mix(mix(P.bg, P.ink2, 0.5), P.ink, k) }); ctx.save(); ctx.globalAlpha = in0; icon(160, y + 5, k); ctx.restore();
        ctx.save(); ctx.globalAlpha = in0; ctx.font = '800 36px "Inter Display"'; ctx.fillStyle = P.ink; ctx.fillText(a, 240, y + 2); ctx.restore();
        M(ctx, k > 0.5 ? b : 'CHECKING…', 240, y + 42, { size: 16, alpha: in0, color: k > 0.5 ? (i === 1 ? P.live : P.ink) : P.ink2 }); }); } },
  { key: 'tools', // /usage, /storage, ultrathink
    head: [['MORE TOOLS'], ['IN THE KIT.']], sub: 'Two slash commands. One deeper turn.', note: '/USAGE · /STORAGE · ULTRATHINK',
    draw(e, ctx, u) {
      const blocks = [['/usage', 'WHAT’S EATING YOUR USAGE · AND THE FIX', 0.6], ['/storage', 'CLEARS UNUSED WORKTREES + SESSIONS', 2.0], ['ultrathink', 'EXTRA REASONING, FOR ONE TURN', 3.4]];
      blocks.forEach(([n, d, t0], i) => { const y = 640 + i * 205, a = smoothstep(seg(u, t0 - 0.3, t0 + 0.1)), k = seg(u, t0 + 0.2, t0 + 1.3); card(ctx, 80, y, 920, 180, a);
        M(ctx, n, 116, y + 62, { size: 34, color: P.ink, track: 1, weight: 600, alpha: a }); M(ctx, d, 116, y + 100, { size: 14, alpha: a });
        ctx.save(); ctx.globalAlpha = a; const gx = 116, gy = y + 125, gw = 848;
        if (i === 0) { let x = gx; [0.44, 0.17, 0.14, 0.13, 0.12].forEach((v, j) => { const ww = gw * v * (j ? 1 : lerp(1, 0.32, ease.inOut3(seg(k, 0.4, 1)))); ctx.fillStyle = j ? mix(P.bg, P.ink2, 0.7 - j * 0.1) : (k > 0.2 ? P.ink : P.ink2); ctx.fillRect(x, gy, ww - 5, 26); if (!j && k > 0.15 && k < 0.95) { ctx.strokeStyle = P.live; ctx.lineWidth = 2.5; ctx.strokeRect(x - 4, gy - 4, ww + 3, 34); } x += ww; }); }
        if (i === 1) [1, 0, 0, 1, 0, 0, 0, 1].forEach((used, j) => { const out = used ? 0 : ease.in3(clamp(k * 1.6 - j * 0.1)); ctx.globalAlpha = a * (1 - out); ctx.fillStyle = used ? P.ink : mix(P.bg, P.ink2, 0.6); ctx.beginPath(); ctx.roundRect(gx + j * 106 + out * 40, gy - 4, 90, 34, 6); ctx.fill(); });
        if (i === 2) { const g2 = ease.inOut3(k); ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.6; for (let j = 0; j < 9; j++) { const yy = gy + 13 + (j - 4) * 5 * Math.sin(Math.PI * clamp(g2)); ctx.beginPath(); ctx.moveTo(gx, gy + 13); ctx.bezierCurveTo(gx + gw * 0.3, yy - (j - 4) * 4, gx + gw * 0.7, yy + (j - 4) * 4, gx + gw * g2, gy + 13); ctx.stroke(); }
          ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(gx, gy + 13, 7, 0, Math.PI * 2); ctx.fill(); if (g2 >= 1) { ctx.beginPath(); ctx.arc(gx + gw, gy + 13, 7, 0, Math.PI * 2); ctx.fill(); } }
        ctx.restore(); }); } },
];
const ORDER = [0, 'fable', 'cloud', 8, 'tools', 9].map((k) => (typeof k === 'number' ? S[k] : S.find((x) => x.key === k)));
const N = ORDER.length;

/* ---------------- the frame ---------------- */
function draw(ctx, t) {
  setPalette(PALETTES.brand);
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H); e.globalAlpha = 1;
  const i = Math.min(N - 1, Math.floor(t / T)), u = t - i * T, sl = ORDER[i];
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000'); g.addColorStop(0.6, '#09090B'); g.addColorStop(1, '#000'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glow(ctx, W / 2, 940, 620, 420, { alpha: 0.06 });
  // floor hairline + dot field (the lab floor, seen low)
  e.save(); e.fillStyle = P.tech; for (let r = 0; r < 9; r++) for (let c = 0; c < 28; c++) { const y = 1240 + r * r * 3.2, x = W / 2 + (c - 13.5) * (38 + r * 9); if (x < 0 || x > W) continue; e.globalAlpha = 0.25 * (1 - r / 9); e.fillRect(x - 1, y - 1, 2, 2); } e.restore();
  sl.draw(e, ctx, u);
  halo(ctx, L);
  // type, crisp
  M(ctx, 'TECH DROP 001', 80, 120, { alpha: 1, color: P.ink2 }); ctx.save(); ctx.fillStyle = P.tech; ctx.fillRect(80, 138, 44, 1.5); ctx.restore();
  M(ctx, `${String(i + 1).padStart(2, '0')} / ${N}`, W - 80, 120, { align: 'right', color: P.ink2 });
  const lines = sl.head.map((ln) => (Array.isArray(ln[0]) ? ln.map(([s, c]) => [s, c === 'live' ? P.live : c]) : ln));
  head(ctx, lines, 260, seg(u, 0.05, 0.9), sl.size ?? 86);
  const nl = sl.head.length, sy = 260 + nl * (sl.size ?? 86) * 1.02 + 16;
  if (sl.sub) sub(ctx, sl.sub, sy, smoothstep(seg(u, 0.5, 0.9)));
  if (sl.note) M(ctx, sl.note, 80, H - 70, { size: 15, color: P.tech, track: 3 });
  if (i < N - 1) { const mh = 26, mw = mh * 823 / 658; ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = P.ink2; ctx.translate(W - 80 - mw, H - 70 - mh + 4); ctx.scale(mh / 658, mh / 658); ctx.fill(MARK); ctx.restore(); }
  vignette(ctx, W, H, { amount: 0.6 });
  grain(ctx, L, Math.round(t * FPS));
}
async function load() { MARK = await brandPath('/assets/brand/mark.svg'); WORD = await brandPath('/assets/brand/wordmark.svg'); }
const comp = { width: W, height: H, fps: FPS, duration: T * 6, palette: PALETTES.brand, motionBlur: { samples: 4, shutter: 0.5 }, load, draw };
export default comp;
