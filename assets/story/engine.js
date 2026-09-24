/* Quiet Bands — scene engine.
   One master timeline. Scroll position becomes progress t (0..1); scenes carve t by weight;
   every object, link, camera pose and copy block is a pure function of t. The DOM is written
   once per animation frame, transforms and opacity only. Nothing here runs at import time,
   so the pure helpers can be unit-tested in Node. */

import { BAND } from './story.js';

/* ---------- pure helpers ---------- */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2); // in-out cubic
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };

/** Scene ranges on the master timeline, from weights. */
export function buildTimeline(scenes) {
  const total = scenes.reduce((s, sc) => s + sc.weight, 0);
  let acc = 0;
  return scenes.map((sc) => { const start = acc / total; acc += sc.weight; return { id: sc.id, start, end: acc / total }; });
}

/** Which scene t is in, and local progress u within it. */
export function sceneAt(timeline, t) {
  t = clamp(t);
  for (let i = 0; i < timeline.length; i++) {
    const r = timeline[i];
    if (t < r.end || i === timeline.length - 1) return { i, u: clamp((t - r.start) / (r.end - r.start)) };
  }
  return { i: 0, u: 0 };
}

const GEO = { x: 0, y: 0, s: 1, r: 0 };
const DEF = { ...GEO, o: 1, state: '', tag: '', note: '', role: '', at: null };

/** Resolve an object's pose for every scene, inheriting forward. Geometry picks d or m. */
export function resolvePoses(obj, scenes, mobile) {
  const out = [];
  let prev = { ...DEF, role: obj.role || '' };
  scenes.forEach((sc) => {
    const p = obj.poses && obj.poses[sc.id];
    let cur = { ...prev, at: null };
    if (p) {
      const geo = (mobile && p.m) || p.d || {};
      cur = { ...cur, ...geo };
      ['o', 'state', 'tag', 'note', 'role'].forEach((k) => { if (p[k] !== undefined) cur[k] = p[k]; });
      cur.at = p.at || null;
      cur.explicit = true;
    } else cur.explicit = false;
    out.push(cur);
    prev = cur;
  });
  return out;
}

/** Interpolated pose of one object at scene i, local progress u. */
export function poseAt(resolved, i, u, band = BAND) {
  const cur = resolved[i];
  const prev = i > 0 ? resolved[i - 1] : cur;
  if (!cur.explicit || i === 0) return { ...cur, k: 1, prevTag: prev.tag, prevNote: prev.note };
  const [a, b] = cur.at || [0, band];
  const k = ease(clamp((u - a) / (b - a)));
  return {
    x: lerp(prev.x, cur.x, k), y: lerp(prev.y, cur.y, k), s: lerp(prev.s, cur.s, k), r: lerp(prev.r, cur.r, k), o: lerp(prev.o, cur.o, k),
    state: k >= 0.5 ? cur.state : prev.state, role: k >= 0.5 ? cur.role : prev.role,
    tag: cur.tag, note: cur.note, prevTag: prev.tag, prevNote: prev.note, k,
  };
}

/** Resolve a link's state per scene (inherit forward). */
export function resolveLink(link, scenes) {
  let prev = 'hidden';
  return scenes.map((sc) => { const s = link.states[sc.id]; if (s !== undefined) prev = s; return { state: prev, explicit: s !== undefined }; });
}

/** Link presentation at scene i, u: which style, how visible, and draw progress for 'draw'/'rung'. */
export function linkAt(resolvedLink, order, i, u, band = BAND) {
  const cur = resolvedLink[i], prev = i > 0 ? resolvedLink[i - 1] : cur;
  const changed = cur.explicit && i > 0 && cur.state !== prev.state;
  const k = changed ? ease(clamp(u / band)) : 1;
  const vis = (s) => s !== 'hidden';
  let opacity = 1, style = cur.state;
  if (changed) {
    if (!vis(prev.state) && vis(cur.state)) opacity = k;
    else if (vis(prev.state) && !vis(cur.state)) { opacity = 1 - k; style = prev.state; }
    else style = k < 0.5 ? prev.state : cur.state;
  }
  let draw = 1;
  if (style === 'draw' || style === 'rung') {
    const per = style === 'rung' ? 0.07 : 0.09, start = (style === 'rung' ? 0.14 : 0.1) + order * per;
    draw = smooth((u - start) / (per * 1.6));
    if (changed && !vis(prev.state)) opacity = 1; // the draw itself is the entrance
  }
  return { style, opacity: style === 'hidden' ? 0 : opacity, draw };
}

/** Camera at scene i,u. Each scene's pose is reached at the end of the transition band and then
    drifts slowly through the hold (pose + drift at u=1), so the world never sits still. */
export function cameraAt(camera, scenes, i, u, mobile, band = BAND) {
  const at = (idx) => {
    let c = { x: 0, y: 0, s: 1, dx: 0, dy: 0, ds: 0 };
    for (let j = 0; j <= idx; j++) {
      const p = camera[scenes[j].id]; if (!p) continue;
      const g = (mobile && p.m) || p.d || {};
      c = { ...c, ...g, dx: g.dx || 0, dy: g.dy || 0, ds: g.ds || 0 };
    }
    return c;
  };
  const cur = at(i);
  const end = (c) => ({ x: c.x + c.dx, y: c.y + c.dy, s: c.s + c.ds });
  const from = i > 0 ? end(at(i - 1)) : cur;
  if (u < band) { const k = ease(u / band); return { x: lerp(from.x, cur.x, k), y: lerp(from.y, cur.y, k), s: lerp(from.s, cur.s, k) }; }
  const k = (u - band) / (1 - band), e = end(cur);
  return { x: lerp(cur.x, e.x, k), y: lerp(cur.y, e.y, k), s: lerp(cur.s, e.s, k) };
}

/** Copy block visibility for scene i. First scene is visible at u=0; last never fades out. */
export function copyAt(i, u, count, delay = 0) {
  const fadeIn = i === 0 ? 1 : smooth((u - 0.1 - delay) / 0.22);
  const fadeOut = i === count - 1 ? 1 : 1 - smooth((u - 0.86) / 0.12);
  return { opacity: fadeIn * fadeOut, y: (1 - fadeIn) * 14 };
}

/** Apply camera through depth: near objects zoom and shift a lot more than far ones.
    Far objects barely respond to a push-in; near ones grow and slide past the frame. */
export function project(p, cam, depth) {
  const zoom = 1 + (cam.s - 1) * (0.15 + depth * 1.5);
  const par = 0.2 + depth * 1.2;
  return { x: p.x * zoom + cam.x * par, y: p.y * zoom + cam.y * par, s: p.s * zoom };
}

/* ---------- runtime ---------- */

/** Build the runtime. `dom` = { story, stage, world, svg, copies, index }. `story` = the story module. */
export function createEngine(story, dom, opts = {}) {
  const { SCENES, OBJECTS, LINKS, CAMERA, PACKET } = story;
  const timeline = buildTimeline(SCENES);
  const mobileMQ = window.matchMedia('(max-width: 760px)');
  const fineMQ = window.matchMedia('(pointer: fine)');
  let mobile = mobileMQ.matches;

  const objEls = {}; dom.world.querySelectorAll('[data-obj]').forEach((el) => { objEls[el.dataset.obj] = el; });
  const ids = Object.keys(OBJECTS).filter((id) => objEls[id]);
  let poses = {}; const rebuildPoses = () => { poses = {}; ids.forEach((id) => { poses[id] = resolvePoses(OBJECTS[id], SCENES, mobile); }); };
  rebuildPoses();
  const linkRes = LINKS.map((l) => resolveLink(l, SCENES));

  // SVG lines + packet
  const NS = 'http://www.w3.org/2000/svg';
  const lineEls = LINKS.map((l) => { const ln = document.createElementNS(NS, 'line'); ln.setAttribute('class', 'qb-link'); ln.dataset.link = l.id; dom.svg.appendChild(ln); return ln; });
  const packetEl = document.createElementNS(NS, 'circle'); packetEl.setAttribute('class', 'qb-packet'); packetEl.setAttribute('r', '4'); dom.svg.appendChild(packetEl);
  const labelEl = dom.label || null;

  let W = 0, H = 0, unit = 1;
  let target = 0, current = 0, lastT = -1, lastScene = -1, running = false, lastFrame = 0;
  const centers = {}; // last screen-space centres per object, for proximity + links
  const sizes = {};
  const listeners = { scene: [] };

  function measure() {
    const r = dom.stage.getBoundingClientRect();
    W = r.width; H = r.height;
    const nextMobile = mobileMQ.matches;
    if (nextMobile !== mobile) { mobile = nextMobile; rebuildPoses(); }
    // story height: one stage height per weight unit (0.9 on mobile), plus the stage itself
    const total = SCENES.reduce((s, sc) => s + sc.weight, 0);
    unit = H * (mobile ? 0.9 : 1);
    dom.story.style.height = Math.round(H + total * unit) + 'px';
    dom.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    lastT = -1; readScroll(); frame(performance.now(), true);
  }

  function readScroll() {
    const top = dom.story.getBoundingClientRect().top + (opts.navOffset ? opts.navOffset() : 0);
    const range = dom.story.offsetHeight - H;
    target = range > 0 ? clamp(-top / range) : 0;
  }

  function evalAll(t, out) {
    const { i, u } = sceneAt(timeline, t);
    const cam = cameraAt(CAMERA, SCENES, i, u, mobile);
    const objs = {};
    ids.forEach((id) => {
      const p = poseAt(poses[id], i, u);
      const pr = project(p, cam, OBJECTS[id].depth);
      objs[id] = { ...p, X: (pr.x / 100) * W, Y: (pr.y / 100) * H, S: pr.s };
    });
    const links = LINKS.map((l, n) => linkAt(linkRes[n], l.order, i, u));
    return Object.assign(out || {}, { i, u, cam, objs, links });
  }

  function writeObjects(objs, vel) {
    ids.forEach((id) => {
      const o = objs[id], el = objEls[id], def = OBJECTS[id];
      const trail = vel * def.depth * 6;
      el.style.transform = `translate3d(calc(-50% + ${o.X.toFixed(1)}px), calc(-50% + ${(o.Y + trail).toFixed(1)}px), 0) rotate(${o.r.toFixed(2)}deg) scale(${o.S.toFixed(3)})`;
      el.style.opacity = o.o.toFixed(3);
      el.style.setProperty('--k', o.k.toFixed(3));
      if (el.dataset.state !== o.state) el.dataset.state = o.state;
      const roleEl = el.querySelector('.qb-role'); if (roleEl && roleEl.textContent !== o.role) roleEl.textContent = o.role;
      const tagEl = el.querySelector('.qb-tag');
      if (tagEl) {
        const text = o.tag || o.prevTag || '';
        const op = o.tag ? o.k : (o.prevTag ? 1 - o.k : 0);
        if (tagEl.textContent !== text) tagEl.textContent = text;
        tagEl.style.opacity = op.toFixed(3);
      }
      const noteText = o.note || (o.tag ? '' : o.prevNote) || '';
      if (el.dataset.note !== noteText) el.dataset.note = noteText;
      centers[id] = { x: W / 2 + o.X, y: H / 2 + o.Y };
      sizes[id] = { rx: (def.w * o.S) / 2 + 8, ry: (def.h * o.S) / 2 + 8, o: o.o };
    });
  }

  /** Trim a segment so it starts/ends at the edge of each card rather than its centre. */
  function segment(a, b) {
    const A = centers[a], B = centers[b]; if (!A || !B) return null;
    const dx = B.x - A.x, dy = B.y - A.y; const len = Math.hypot(dx, dy) || 1;
    const ta = 1 / Math.sqrt((dx / sizes[a].rx) ** 2 + (dy / sizes[a].ry) ** 2);
    const tb = 1 / Math.sqrt((dx / sizes[b].rx) ** 2 + (dy / sizes[b].ry) ** 2);
    if (ta + tb >= 1) return null;
    return { x1: A.x + dx * ta, y1: A.y + dy * ta, x2: B.x - dx * tb, y2: B.y - dy * tb, len: len * (1 - ta - tb) };
  }

  const segs = {};
  function writeLinks(links, nearId) {
    LINKS.forEach((l, n) => {
      const st = links[n], ln = lineEls[n];
      const seg = segment(l.from, l.to);
      const faded = Math.min(sizes[l.from]?.o ?? 1, sizes[l.to]?.o ?? 1);
      if (!seg || st.opacity <= 0.001 || faded <= 0.02) { ln.style.opacity = '0'; segs[l.id] = null; return; }
      segs[l.id] = seg;
      ln.setAttribute('x1', seg.x1.toFixed(1)); ln.setAttribute('y1', seg.y1.toFixed(1));
      ln.setAttribute('x2', seg.x2.toFixed(1)); ln.setAttribute('y2', seg.y2.toFixed(1));
      if (ln.dataset.style !== st.style) ln.dataset.style = st.style;
      if (st.style === 'draw' || st.style === 'rung') {
        ln.setAttribute('stroke-dasharray', `${seg.len.toFixed(1)} ${seg.len.toFixed(1)}`);
        ln.setAttribute('stroke-dashoffset', (seg.len * (1 - st.draw)).toFixed(1));
      } else { ln.removeAttribute('stroke-dasharray'); ln.removeAttribute('stroke-dashoffset'); }
      const near = nearId && (l.from === nearId || l.to === nearId);
      ln.style.opacity = (st.opacity * Math.min(1, faded * 1.4) * (near ? 1 : 1)).toFixed(3);
      ln.classList.toggle('near', !!near);
    });
  }

  function writePacket(i, u) {
    const run = PACKET.runs[SCENES[i].id];
    if (!run) { packetEl.style.opacity = '0'; return; }
    const p = clamp((u - run[0]) / (run[1] - run[0]));
    if (p <= 0 || p >= 1) { packetEl.style.opacity = '0'; return; }
    const pts = []; let total = 0;
    for (let n = 0; n < PACKET.path.length - 1; n++) { const s = segment(PACKET.path[n], PACKET.path[n + 1]); if (!s) { packetEl.style.opacity = '0'; return; } pts.push(s); total += s.len; }
    let d = p * total;
    for (const s of pts) {
      if (d <= s.len) { const f = d / s.len; packetEl.setAttribute('cx', (s.x1 + (s.x2 - s.x1) * f).toFixed(1)); packetEl.setAttribute('cy', (s.y1 + (s.y2 - s.y1) * f).toFixed(1)); break; }
      d -= s.len;
    }
    packetEl.style.opacity = String(smooth(p / 0.06) * smooth((1 - p) / 0.06));
  }

  function writeCopy(i, u) {
    dom.copies.forEach((el, n) => {
      const c = copyAt(n, n === i ? u : (n < i ? 1 : 0), dom.copies.length, SCENES[n].copyDelay || 0);
      const vis = n === i ? c.opacity : (n === dom.copies.length - 1 && i === n ? 1 : 0);
      el.style.opacity = vis.toFixed(3);
      el.style.transform = vis > 0 ? `translate3d(0, ${(n === i ? c.y : 0).toFixed(1)}px, 0)` : 'translate3d(0,0,0)';
      el.classList.toggle('is-on', vis > 0.5);
      el.setAttribute('aria-hidden', vis > 0.5 ? 'false' : 'true');
    });
    if (i !== lastScene) {
      lastScene = i;
      if (dom.index) { const sc = SCENES[i]; dom.index.innerHTML = `<b>${sc.n}</b> / ${SCENES[SCENES.length - 1].n} · ${sc.name}`; }
      dom.stage.dataset.scene = SCENES[i].id;
      listeners.scene.forEach((fn) => fn(SCENES[i], i));
    }
  }

  let nearId = null, pointer = null;
  const state = {};
  function frame(now, force) {
    const dt = Math.min(64, now - (lastFrame || now)); lastFrame = now;
    const alpha = 1 - Math.exp(-dt / 110); // time-based lerp, ~110ms to settle
    const before = current;
    current += (target - current) * alpha;
    if (Math.abs(target - current) < 0.00005) current = target;
    const vel = clamp((current - before) * 400, -1, 1);
    if (force || current !== lastT || pointer) {
      evalAll(current, state);
      writeObjects(state.objs, vel);
      if (fineMQ.matches) nearId = proximity();
      writeLinks(state.links, nearId);
      writePacket(state.i, state.u);
      writeCopy(state.i, state.u);
      lastT = current;
      pointer = null;
    }
    if (current !== target) requestAnimationFrame(frame); else running = false;
  }
  function wake() { if (!running) { running = true; lastFrame = 0; requestAnimationFrame(frame); } }

  /* proximity: nearest object within reach lifts; connected links brighten; a note shows */
  function proximity() {
    if (!pointer) return nearId;
    let best = null, bestD = 1e9;
    ids.forEach((id) => {
      const c = centers[id]; if (!c || sizes[id].o < 0.3 || OBJECTS[id].ghost) return;
      const dx = (pointer.x - c.x) / (sizes[id].rx + 40), dy = (pointer.y - c.y) / (sizes[id].ry + 40);
      const d = dx * dx + dy * dy; if (d < 1 && d < bestD) { best = id; bestD = d; }
    });
    ids.forEach((id) => objEls[id].classList.toggle('near', id === best));
    if (labelEl) {
      const el = best && objEls[best];
      const note = el && el.dataset.note;
      if (note) { labelEl.textContent = note; labelEl.style.opacity = '1'; labelEl.style.transform = `translate3d(${(centers[best].x).toFixed(0)}px, ${(centers[best].y + sizes[best].ry + 6).toFixed(0)}px, 0)`; }
      else labelEl.style.opacity = '0';
    }
    return best;
  }

  function onPointer(e) { const r = dom.stage.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; wake(); }
  function onLeave() { pointer = { x: -9999, y: -9999 }; wake(); }

  function start() {
    dom.story.classList.add('story-live');
    measure();
    window.addEventListener('scroll', () => { readScroll(); wake(); }, { passive: true });
    window.addEventListener('resize', () => { measure(); wake(); }, { passive: true });
    if (fineMQ.matches) { dom.stage.addEventListener('pointermove', onPointer, { passive: true }); dom.stage.addEventListener('pointerleave', onLeave); }
    // arrive: settle from wherever the page loaded (deep links, back navigation)
    readScroll(); current = target; frame(performance.now(), true);
  }

  /** Reduced motion: pose the world once per scene as a static plate after that scene's copy. */
  function renderStatic() {
    dom.story.classList.add('story-static');
    const plates = [];
    SCENES.forEach((sc, i) => {
      const plate = document.createElement('div'); plate.className = 'story-plate'; plate.dataset.scene = sc.id;
      const worldClone = dom.world.cloneNode(true); worldClone.removeAttribute('id');
      const svgClone = document.createElementNS(NS, 'svg'); svgClone.setAttribute('class', 'story-links'); svgClone.setAttribute('aria-hidden', 'true');
      plate.appendChild(svgClone); plate.appendChild(worldClone);
      const copy = dom.copies[i]; copy.insertAdjacentElement('afterend', plate);
      plates.push({ plate, worldClone, svgClone, i });
    });
    dom.world.hidden = true; dom.svg.hidden = true;
    const t = timeline;
    const pose = () => plates.forEach(({ plate, worldClone, svgClone, i }) => {
      const r = plate.getBoundingClientRect(); const w = r.width, h = r.height; if (!w) return;
      const mob = mobileMQ.matches; if (mob !== mobile) { mobile = mob; rebuildPoses(); }
      const fit = Math.min(1, w / (mobile ? 420 : 1200));
      const { i: si } = sceneAt(t, (t[i].start + t[i].end) / 2);
      const cam = cameraAt(CAMERA, SCENES, si, 1, mobile);
      const local = {}, ls = {};
      ids.forEach((id) => {
        const p = poseAt(poses[id], si, 1); const pr = project(p, cam, OBJECTS[id].depth);
        const el = worldClone.querySelector(`[data-obj="${id}"]`); if (!el) return;
        const X = (pr.x / 100) * w, Y = (pr.y / 100) * h, S = pr.s * fit;
        el.style.transform = `translate3d(calc(-50% + ${X.toFixed(1)}px), calc(-50% + ${Y.toFixed(1)}px), 0) rotate(${p.r}deg) scale(${S.toFixed(3)})`;
        el.style.opacity = p.o; el.dataset.state = p.state; el.style.setProperty('--k', '1');
        const roleEl = el.querySelector('.qb-role'); if (roleEl) roleEl.textContent = p.role;
        const tagEl = el.querySelector('.qb-tag'); if (tagEl) { tagEl.textContent = p.tag || ''; tagEl.style.opacity = p.tag ? '1' : '0'; }
        local[id] = { x: w / 2 + X, y: h / 2 + Y }; ls[id] = { rx: (OBJECTS[id].w * S) / 2 + 8, ry: (OBJECTS[id].h * S) / 2 + 8, o: p.o };
      });
      svgClone.setAttribute('viewBox', `0 0 ${w} ${h}`); svgClone.innerHTML = '';
      LINKS.forEach((l, n) => {
        const st = linkAt(linkRes[n], l.order, si, 1); if (st.opacity <= 0.01) return;
        const A = local[l.from], B = local[l.to]; if (!A || !B || Math.min(ls[l.from].o, ls[l.to].o) < 0.05) return;
        const dx = B.x - A.x, dy = B.y - A.y;
        const ta = 1 / Math.sqrt((dx / ls[l.from].rx) ** 2 + (dy / ls[l.from].ry) ** 2), tb = 1 / Math.sqrt((dx / ls[l.to].rx) ** 2 + (dy / ls[l.to].ry) ** 2);
        if (ta + tb >= 1) return;
        const ln = document.createElementNS(NS, 'line'); ln.setAttribute('class', 'qb-link'); ln.dataset.style = st.style === 'draw' ? 'manual' : st.style;
        ln.setAttribute('x1', A.x + dx * ta); ln.setAttribute('y1', A.y + dy * ta); ln.setAttribute('x2', B.x - dx * tb); ln.setAttribute('y2', B.y - dy * tb);
        ln.style.opacity = st.opacity; svgClone.appendChild(ln);
      });
    });
    pose(); window.addEventListener('resize', pose, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pose);
  }

  return { start, renderStatic, timeline, onScene: (fn) => listeners.scene.push(fn), get progress() { return current; }, get mobile() { return mobile; } };
}
