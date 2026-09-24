/* Quiet Bands — the signature interactions that ride on the scene engine.
   Each is a component: { resize(ctx), update(state, ctx) }. They own their DOM and read the
   engine's state; they never touch scroll.

   02  THE LENTICULAR   scenes 03→04: the same workflow as a lenticular print. Vertical prisms,
                        face A = the operation with its friction, face B = the intervened operation.
                        Scroll sweeps the flip across; the pointer rocks the viewing angle.
   03  THE BLANK PAGE   scene 05: an ivory page expands from the centre and flings the system off
                        the stage until one black sentence is left. It shrinks away for scene 06. */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };

export function createLens(engine, root, { strips = 22, stripsMobile = 12 } = {}) {
  const iA = engine.sceneIndex('friction'), iB = engine.sceneIndex('intervene');
  let stripEls = [], n = 0, timer = 0, active = false, lastKey = '', last = [];

  function build(ctx) {
    const key = `${ctx.W}x${ctx.H}:${ctx.mobile}`; if (key === lastKey) return; lastKey = key;
    n = ctx.mobile ? stripsMobile : strips;
    const sw = ctx.W / n;
    root.innerHTML = ''; stripEls = []; last = [];
    root.style.setProperty('--sw', sw.toFixed(2) + 'px');
    root.style.setProperty('--pw', ctx.W + 'px');
    const plateA = document.createElement('div'); plateA.className = 'lens-plate'; engine.plate(plateA, iA, 1, ctx.W, ctx.H);
    const plateB = document.createElement('div'); plateB.className = 'lens-plate'; engine.plate(plateB, iB, 1, ctx.W, ctx.H);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const strip = document.createElement('div'); strip.className = 'lens-strip'; strip.style.left = (i * sw).toFixed(2) + 'px';
      const a = document.createElement('div'); a.className = 'lens-face a';
      const b = document.createElement('div'); b.className = 'lens-face b';
      const pa = plateA.cloneNode(true), pb = plateB.cloneNode(true);
      pa.style.left = pb.style.left = (-i * sw).toFixed(2) + 'px';
      a.appendChild(pa); b.appendChild(pb); strip.appendChild(a); strip.appendChild(b);
      frag.appendChild(strip); stripEls.push(strip);
    }
    root.appendChild(frag);
  }

  return {
    resize(ctx) { clearTimeout(timer); timer = setTimeout(() => build(ctx), active ? 0 : 120); },
    update(state, ctx) {
      const on = state.i === iB;
      if (on !== active) { active = on; root.classList.toggle('is-on', on); engine.hideWorld(on); if (on && !stripEls.length) build(ctx); }
      // pre-warm the strip layers late in scene 03 so the swap into scene 04 costs nothing
      root.classList.toggle('is-warm', !on && state.i === iA && state.u > 0.55);
      if (!on) return;
      const p = clamp((state.u - 0.1) / 0.72);                 // the sweep occupies most of the hold
      const rock = (ctx.pointer ? ctx.pointer.x : 0) * 9;       // viewing position: lean left/right
      stripEls.forEach((el, i) => {
        const local = smooth((p - (i / n) * 0.55) / 0.45);
        const theta = -180 * local + rock * (1 - Math.abs(2 * local - 1) * 0.6);
        if (Math.abs(theta - (last[i] ?? 1e9)) < 0.02) return;   // strips at rest cost nothing
        last[i] = theta;
        el.style.transform = `rotateY(${theta.toFixed(2)}deg)`;
        const c = Math.cos(theta * Math.PI / 180);
        el.style.setProperty('--sa', (1 - Math.max(0, c)).toFixed(3));   // face A darkens as it turns away
        el.style.setProperty('--sb', (1 - Math.max(0, -c)).toFixed(3));  // face B brightens as it turns in
      });
    },
  };
}

export function createVoid(engine, el, stage) {
  const iN = engine.sceneIndex('nothing'), iP = engine.sceneIndex('pressure');
  return {
    resize(ctx) { const d = Math.ceil(Math.hypot(ctx.W, ctx.H) * 1.04); el.style.width = el.style.height = d + 'px'; el.style.margin = `${-d / 2}px 0 0 ${-d / 2}px`; },
    update(state) {
      let r = 0;
      if (state.i === iN) r = smooth(state.u / 0.3);
      else if (state.i === iP) r = 1 - smooth(state.u / 0.34);
      el.style.transform = `scale(${r.toFixed(4)})`;
      el.style.opacity = r > 0.001 ? '1' : '0';
      const on = r > 0.55 ? '1' : '0';
      if (stage.dataset.void !== on) stage.dataset.void = on;
    },
  };
}
