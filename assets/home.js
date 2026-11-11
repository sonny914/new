/* Quiet Bands home: menu, entrance reveals, and the project inquiry (Netlify Forms, `project-inquiry`). */
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
