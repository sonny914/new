/* Experiments page: the bulb loads into a frame only when asked; one set of controls drives every orb. */
import '/assets/orb/thinking-orb.js';
import { track } from './qb.js';

const stage = document.getElementById('bulb-stage');
const start = document.getElementById('bulb-start');
if (stage && start) {
  start.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = '/experiments/bulb/';
    f.title = 'The bulb: scroll inside this frame to break it';
    f.setAttribute('loading', 'eager');
    stage.append(f); stage.classList.add('on');
    document.getElementById('bulb-hint').textContent = 'Scroll or swipe inside the frame.';
    f.addEventListener('load', () => { try { f.focus(); } catch { /* ignore */ } }, { once: true });
    track('experiment_open', { exp: 'bulb', how: 'inline' });
  }, { once: true });
}

const orbs = [...document.querySelectorAll('#orb-field thinking-orb')];
const set = (k, v) => orbs.forEach((o) => (v == null ? o.removeAttribute(k) : o.setAttribute(k, v)));

document.querySelectorAll('[data-ink]').forEach((b) => b.addEventListener('click', () => {
  set('color', b.dataset.ink || null);
  document.querySelectorAll('[data-ink]').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
}));

const speed = document.getElementById('orb-speed');
const out = document.getElementById('orb-speed-out');
speed?.addEventListener('input', () => { set('speed', speed.value); out.textContent = `${speed.value}×`; });

const pause = document.getElementById('orb-pause');
pause?.addEventListener('click', () => {
  const on = pause.getAttribute('aria-pressed') !== 'true';
  pause.setAttribute('aria-pressed', String(on)); pause.textContent = on ? 'Play all' : 'Pause all';
  set('paused', on ? '' : null);
});

let touched = false;
orbs.forEach((o) => o.addEventListener('pointerdown', () => { if (!touched) { touched = true; track('experiment_play', { exp: 'orb', state: o.getAttribute('state') }); } }));
