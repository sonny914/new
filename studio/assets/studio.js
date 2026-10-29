/* Quiet Bands Studio: menu, dock, forms, copy buttons, the pack gate and the hero timecode.
   Reuses the parent's runtime: qb.js for attribution, analytics and the Supabase project; the thinking orb for the wait. */
import { SUPABASE_URL, SUPABASE_ANON_KEY, track, getAttribution } from '/assets/qb.js';
import { mountOrb } from '/assets/orb/thinking-orb.js';
import { buildSignup, outcome, readState, writeState, timecode, TABLE } from './studio-core.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = (() => { try { return window.localStorage; } catch { return { getItem: () => null, setItem() {} }; } })();
let state = readState(store);

const live = document.createElement('p');
live.className = 'vh'; live.setAttribute('aria-live', 'polite');
document.body.append(live);
const say = (t) => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = t; }); };

/* ---------- menu ---------- */
const menuBtn = document.querySelector('.menu-btn');
const sheet = document.getElementById('studio-menu');
const outside = () => [document.querySelector('main'), document.querySelector('.foot'), document.querySelector('.dock'), document.querySelector('.lock'), document.querySelector('.skip')].filter(Boolean);
function setMenu(open, { restore = true } = {}) {
  if (!menuBtn || !sheet) return;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.querySelector('.menu-btn-label').textContent = open ? 'Close' : 'Menu';
  sheet.hidden = !open;
  root.classList.toggle('menu-open', open);
  outside().forEach((el) => { el.inert = open; });   // keeps focus and the screen reader inside the sheet while it's open
  if (open) sheet.querySelector('a').focus();
  else if (restore) menuBtn.focus();
}
if (menuBtn && sheet) {
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) setMenu(false); });
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, { restore: false }); });
  matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches && !sheet.hidden) setMenu(false, { restore: false }); });
}

/* ---------- bar: a hairline once the page moves ---------- */
const bar = document.querySelector('[data-bar]');
const onScroll = () => bar && bar.classList.toggle('solid', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------- forms ---------- */
async function insert(row) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    return res.status;
  } catch { return 0; } finally { clearTimeout(timer); }
}

/** Swap every form of this kind on the page for its finished state. */
function showDone(kind, focusFrom) {
  document.querySelectorAll(`form[data-signup="${kind}"]`).forEach((form) => {
    const done = form.nextElementSibling;
    if (!done || !done.matches('[data-done]')) return;
    form.hidden = true; done.hidden = false;
    done.querySelectorAll('[data-if-no-workshop]').forEach((el) => { el.hidden = !!state.workshop; });
    done.querySelectorAll('[data-if-no-pack]').forEach((el) => { el.hidden = !!state.pack; });
    done.querySelectorAll('[data-if-pack]').forEach((el) => { el.hidden = !state.pack; });
    if (form === focusFrom) { done.focus({ preventScroll: true }); done.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' }); }
  });
}

function setError(form, msg, field) {
  const box = form.querySelector('.form-error');
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  if (!msg) { box.hidden = true; box.textContent = ''; return; }
  box.hidden = false; box.innerHTML = msg;
  const el = field && form.querySelector(`[name="${field}"]`);
  if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
}

document.querySelectorAll('form[data-signup]').forEach((form) => {
  const kind = form.dataset.signup, where = form.dataset.where || '', campaign = form.dataset.campaign || '';
  let started = false;
  form.addEventListener('focusin', () => { if (!started) { started = true; track('studio_signup_start', { kind, where, campaign }); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const built = buildSignup(kind, data, { campaign, where, attribution: getAttribution(), path: location.pathname });
    if (!built.ok) {
      if (built.error === 'bot') { showDone(kind, form); return; }   // the honeypot: look done, send nothing
      setError(form, built.error, built.field); return;
    }
    setError(form, '');
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true; btn.classList.add('sending'); btn.textContent = '';
    const orb = mountOrb(btn, { state: 'searching', size: 20, theme: 'dark', label: null });
    btn.append(document.createTextNode('Sending…'));

    const result = outcome(await insert(built.row));
    orb.destroy(); btn.disabled = false; btn.classList.remove('sending'); btn.textContent = label;
    if (result === 'error') {
      track('studio_signup_error', { kind, where });
      setError(form, `Couldn’t send that. Check your connection and try again, or email <a href="mailto:jason@quietbands.com">jason@quietbands.com</a>.`);
      return;
    }
    state = writeState(store, kind, kind === 'pack' && built.row.workshop_optin ? { workshop: true } : {});
    track('studio_signup_complete', { kind, where, campaign, repeat: result === 'repeat', workshop_optin: built.row.workshop_optin });
    if (where === 'inside-gate') { openGate(true); return; }
    showDone(kind, form);
    say(kind === 'commission' ? 'Brief received.' : kind === 'workshop' ? 'You’re on the list.' : 'The pack is open.');
  });
});

/* returning visitors see what they already have instead of the same form again */
if (state.pack) showDone('pack');
if (state.workshop) showDone('workshop');

/* ---------- the pack gate (/studio/pack/inside/) ---------- */
const gate = document.querySelector('[data-gate]');
function openGate(justNow) {
  root.classList.remove('gated-off');
  if (gate) gate.hidden = true;
  if (justNow) {
    say('All twelve parts are open.');
    const next = document.getElementById('beat-sheet');
    if (next) { next.setAttribute('tabindex', '-1'); next.focus({ preventScroll: true }); next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
  }
}
if (gate) {
  if (state.pack) openGate(false);
  else { root.classList.add('gated-off'); gate.hidden = false; }
}

/* ---------- copy buttons ---------- */
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const src = b.parentElement.querySelector('[data-copy-src]'); if (!src) return;
  const text = src.textContent;
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.append(t); t.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } t.remove();
  }
  b.textContent = ok ? 'Copied' : 'Select it'; b.classList.toggle('copied', ok);
  say(ok ? 'Copied.' : 'Copy failed. Select the text instead.');
  clearTimeout(b.__t); b.__t = setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('copied'); }, 1600);
  const id = b.closest('.prompt')?.querySelector('.prompt-id')?.textContent || 'template';
  track('studio_copy', { id });
});

/* ---------- dock: the next step pinned to the bottom on phones, out of the way of any form ---------- */
const dock = document.querySelector('[data-dock]');
if (dock) {
  document.body.classList.add('has-dock');
  dock.hidden = false;
  const link = dock.querySelector('a');
  const insideHref = document.querySelector('[data-done="pack"] a.btn-live')?.getAttribute('href');
  if (state.pack && insideHref && /"cta":"(pack|campaign-[^"]*)"/.test(link.dataset.trackProps || '')) {
    link.setAttribute('href', insideHref); link.textContent = 'Open the pack';
    dock.querySelector('p').textContent = 'You have the pack';
  }
  const hero = document.querySelector('main > section');
  const forms = document.querySelectorAll('.hero-form, .get-form, [data-gate]');
  let heroIn = true, formsIn = 0, typing = false;
  const update = () => dock.classList.toggle('show', !heroIn && formsIn === 0 && !typing);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { heroIn = en.isIntersecting; update(); }, { rootMargin: '0px 0px -40% 0px' }).observe(hero);
    const seen = new Set();
    const io = new IntersectionObserver((ens) => { ens.forEach((en) => { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); }); formsIn = seen.size; update(); });
    forms.forEach((f) => io.observe(f));
  }
  document.addEventListener('focusin', (e) => { typing = !!e.target.closest('input, select, textarea'); update(); });
  document.addEventListener('focusout', () => { typing = false; setTimeout(update, 50); });
}

/* ---------- the hero's running timecode ---------- */
const tc = document.querySelector('[data-timecode]');
if (tc && !reduced) {
  const t0 = performance.now();
  let raf = 0, on = true;
  const tick = (t) => { tc.textContent = timecode(t - t0); raf = on ? requestAnimationFrame(tick) : 0; };
  const run = (v) => { on = v; if (v && !raf) raf = requestAnimationFrame(tick); };
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => run(en.isIntersecting && !document.hidden)).observe(tc);
  document.addEventListener('visibilitychange', () => run(!document.hidden));
  run(true);
}
