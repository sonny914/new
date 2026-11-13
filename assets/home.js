/* Quiet Bands home: menu, entrance reveals, the five-results card, the phone dock, and the project inquiry (Netlify Forms, `project-inquiry`). */
import { formPost, track, getAttribution } from './qb.js';

/* menu */
const btn = document.querySelector('.menu-btn');
const sheet = document.getElementById('menu');
if (btn && sheet) {
  const set = (open) => { btn.setAttribute('aria-expanded', String(open)); sheet.hidden = !open; btn.textContent = open ? 'Close' : 'Menu'; };
  btn.addEventListener('click', () => set(sheet.hidden));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { set(false); btn.focus(); } });
}

/* reveals: shown at once without IntersectionObserver or with reduced motion */
const items = document.querySelectorAll('.reveal');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce || !('IntersectionObserver' in window)) items.forEach((el) => el.classList.add('in'));
else {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}

/* the five results: a sweep down the list once, settling on "Test manually"; a pointer lights the row under it */
const verdict = document.querySelector('.verdict');
if (verdict) {
  const rows = [...verdict.querySelectorAll('.v')];
  const rest = rows.findIndex((r) => r.classList.contains('on'));
  const light = (i) => rows.forEach((r, n) => r.classList.toggle('on', n === i));
  if (!reduce) {
    const order = [...rows.keys(), rest];
    let timers = [];
    const sweep = () => { timers = order.map((i, n) => setTimeout(() => light(i), 500 + n * 260)); };
    const stop = () => { timers.forEach(clearTimeout); timers = []; };
    if (verdict.classList.contains('in')) sweep();
    else new MutationObserver((_, mo) => { if (verdict.classList.contains('in')) { mo.disconnect(); sweep(); } }).observe(verdict, { attributes: true, attributeFilter: ['class'] });
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      rows.forEach((r, i) => r.addEventListener('pointerenter', () => { stop(); light(i); }));
      verdict.addEventListener('pointerleave', () => light(rest));
    }
  }
}

/* dock: shown on small screens (CSS) once the hero's buttons are above the fold, and put away near the form and the footer */
const dock = document.getElementById('dock');
const heroCta = document.getElementById('hero-cta');
if (dock && heroCta && 'IntersectionObserver' in window) {
  const near = new Set();
  let past = false;
  const sync = () => dock.classList.toggle('show', past && near.size === 0);
  new IntersectionObserver(([en]) => { past = !en.isIntersecting && en.boundingClientRect.top < 0; sync(); }).observe(heroCta);
  const quiet = new IntersectionObserver((entries) => { entries.forEach((en) => (en.isIntersecting ? near.add(en.target) : near.delete(en.target))); sync(); });
  document.querySelectorAll('#inquire, .foot').forEach((el) => quiet.observe(el));
}

/* inquiry */
const form = document.getElementById('inquiry');
const done = document.getElementById('inquiry-done');
if (form) {
  const err = form.querySelector('.form-error');
  const fail = (msg, name) => {
    err.textContent = msg; err.hidden = false;
    const el = name && form.elements[name];
    if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
  };
  let started = false;
  form.addEventListener('focusin', () => { if (!started) { started = true; track('home_inquiry_start', {}); } });
  form.addEventListener('input', (e) => { e.target.removeAttribute('aria-invalid'); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const d = Object.fromEntries(new FormData(form));
    if (d.website) return;                                  // honeypot
    if (!String(d.contact_name || '').trim()) return fail('Add your name so the reply can use it.', 'contact_name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || '').trim())) return fail('That email doesn’t look right.', 'email');
    if (!String(d.details || '').trim()) return fail('Say what it should do, even roughly.', 'details');

    const submit = form.querySelector('[type=submit]');
    submit.disabled = true; submit.textContent = 'Sending…';
    const ok = await formPost('project-inquiry', {
      contact_name: d.contact_name.trim(), email: d.email.trim(), company_name: d.company_name, project_type: d.project_type,
      details: d.details, timeline: d.timeline, budget: d.budget, source: 'home-inquiry', attribution: getAttribution(),
    });
    if (!ok) {
      submit.disabled = false; submit.textContent = 'Send the project';
      return fail('Couldn’t send the form. Try again, or email jason@quietbands.com.');
    }
    track('home_inquiry_complete', { project_type: d.project_type || 'unset' });
    form.hidden = true; done.hidden = false; done.focus();
  });
}
