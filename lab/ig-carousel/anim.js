// Slide 02 motion: a deterministic timeline, renderAt(t) for t in [0, LOOP).
// Static by default (the PNG export never runs this). Open index.html?anim to
// preview it live; render-video.mjs drives renderAt frame by frame.
(() => {
  const LOOP = 8; // seconds; t = LOOP looks identical to t = 0, so the MP4 loops cleanly
  const slide = document.getElementById('s2');
  const tiles = [...slide.querySelectorAll('.ref-strip .t')];
  const braces = [...slide.querySelectorAll('.brace div')];

  const clamp = (x) => Math.min(1, Math.max(0, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const span = (t, start, dur) => clamp((t - start) / dur);
  const outExpo = (k) => (k === 1 ? 1 : 1 - Math.pow(2, -10 * k));
  const outBack = (k) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
  const inCubic = (k) => k * k * k;
  // smooth 0→1→0 bump centred on c with half-width w
  const bump = (t, c, w) => { const d = Math.abs(t - c) / w; return d >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d); };
  const mix = (c1, c2, k) => `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], k))).join(',')})`;

  const IVORY = [244, 241, 233], LIVE = [255, 90, 31], DIM = [58, 54, 48], QUIET = [150, 141, 124], HAIR = [52, 49, 44];

  // timing (s)
  const ENTER = 0.15, STAGGER = 0.09, BARS = 1.0, SWEEP = 2.9, STEP = 0.52, EXIT = 7.25;

  function renderAt(t) {
    t = ((t % LOOP) + LOOP) % LOOP;
    const out = span(t, EXIT, 0.6);

    tiles.forEach((el, i) => {
      const kind = el.classList.contains('hook') ? 'hook' : el.classList.contains('cta') ? 'cta' : 'proof';
      const kIn = span(t, ENTER + i * STAGGER, 0.75);
      const kOut = inCubic(span(t, EXIT + i * 0.04, 0.45));
      const active = t > SWEEP - 0.4 && t < EXIT ? bump(t, SWEEP + i * STEP, STEP * 1.25) : 0;

      const y = lerp(90, 0, outExpo(kIn)) - 22 * active - 40 * kOut;
      const s = kind === 'cta' ? lerp(0.86, 1, outBack(kIn)) : 1;
      el.style.transform = `translateY(${y}px) scale(${s + 0.025 * active})`;
      el.style.opacity = (clamp(kIn * 1.6) * (1 - kOut)).toFixed(3);

      const glow = kind === 'proof' ? 0.0 : 0.55;
      el.style.boxShadow = active > 0.01
        ? `0 ${24 * active}px ${60 * active}px rgba(255,90,31,${(0.28 + glow * 0.3) * active})`
        : 'none';

      const num = el.querySelector('.num'), k = el.querySelector('.k');
      if (kind === 'proof') {
        el.style.borderColor = mix(HAIR, LIVE, active);
        num.style.color = mix(DIM, IVORY, active);
        k.style.color = mix(QUIET, LIVE, active);
        const accs = el.querySelectorAll('.acc');
        accs.forEach((a, j) => {
          const kb = outExpo(span(t, BARS + (i - 1) * 0.12 + j * 0.12, 0.6));
          a.style.transformOrigin = 'left center';
          a.style.transform = `scaleX(${kb * (1 - kOut)})`;
        });
      }
    });

    // bracket lines draw left→right, labels rise in after
    const starts = [1.55, 1.75, 2.3];
    braces.forEach((el, i) => {
      const kl = outExpo(span(t, starts[i], 0.8));
      const kt = outExpo(span(t, starts[i] + 0.25, 0.6));
      el.style.backgroundSize = `${(kl * 100 * (1 - out)).toFixed(2)}% 2px`;
      const label = el.querySelector('span');
      label.style.opacity = (kt * (1 - out)).toFixed(3);
      label.style.transform = `translateY(${lerp(14, 0, kt)}px)`;
    });

    // the label under the sweep lights up for whichever section is active
    const sweepPos = (t - SWEEP) / STEP; // 0..6 while sweeping
    const zone = t > SWEEP - 0.4 && t < EXIT ? [bump(sweepPos, 0, 1.1), clamp(Math.min(sweepPos - 0.5, 5.5 - sweepPos) * 2), bump(sweepPos, 6, 1.1)] : [0, 0, 0];
    braces.forEach((el, i) => {
      const base = i === 1 ? LIVE : [232, 220, 194];
      const hot = i === 1 ? IVORY : LIVE;
      el.querySelector('span').style.color = mix(base, hot, zone[i]);
    });
  }

  window.renderAt = renderAt;
  window.LOOP = LOOP;
  if (new URLSearchParams(location.search).has('anim')) {
    const t0 = performance.now();
    const tick = (now) => { renderAt((now - t0) / 1000); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
})();
