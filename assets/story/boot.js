/* Quiet Bands — wires the scene engine to the homepage.
   Reduced motion gets the static plates; everything else gets the live stage.
   Scene changes are reported through the existing analytics fan-out (qb.js). */
import { track, preserveUtm } from '/assets/qb.js';
import * as story from './story.js';
import { createEngine } from './engine.js';
import { createLens, createVoid } from './signatures.js';

const root = document.documentElement;
const storyEl = document.querySelector('.story');
if (storyEl) {
  const nav = document.querySelector('.nav');
  const setNav = () => { if (nav) storyEl.style.setProperty('--navh', nav.offsetHeight + 'px'); };
  setNav();

  const dom = {
    story: storyEl,
    stage: storyEl.querySelector('.story-stage'),
    world: storyEl.querySelector('.story-world'),
    svg: storyEl.querySelector('.story-links'),
    copies: [...storyEl.querySelectorAll('.story-copy')],
    index: storyEl.querySelector('.story-index'),
    label: storyEl.querySelector('.story-note'),
  };

  // attribution survives the doors
  storyEl.querySelectorAll('a[data-door]').forEach((a) => { a.setAttribute('href', preserveUtm(a.getAttribute('href'))); });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const engine = createEngine(story, dom, { navOffset: () => -(nav ? nav.offsetHeight : 0) });

  root.classList.add('js');
  if (reduced) {
    root.classList.add('rm');
    engine.renderStatic();
  } else {
    window.addEventListener('resize', setNav, { passive: true });
    engine.start();
    const lensEl = storyEl.querySelector('.story-lens'), voidEl = storyEl.querySelector('.story-void');
    if (lensEl) engine.addComponent(createLens(engine, lensEl, { strips: 18, stripsMobile: 12 }));
    if (voidEl) engine.addComponent(createVoid(engine, voidEl, dom.stage));

    // one analytics event per scene per session, after a short dwell so a fast scrub doesn't spray events
    const seen = new Set(); let timer = 0;
    engine.onScene((sc, i) => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (!seen.has(sc.id)) { seen.add(sc.id); track('story_scene', { scene: sc.id, index: i + 1 }); } }, 700);
    });
    engine.onScene((sc) => { if (sc.id === 'doors') storyEl.dataset.reached = 'doors'; });
  }
}
