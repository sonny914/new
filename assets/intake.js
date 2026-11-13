/* /work intake: posts to the Netlify form `work-intake`. Every answer is its own field; Netlify's
   submission-created function (netlify/functions/submission-created.js) scores the lead with Claude. */
import { formPost, track, getAttribution, pt } from './qb.js';
import { STATES } from './triage.js?v=2';
import { mountOrb } from './orb/thinking-orb.js';

const form = document.getElementById('intake-form');
const container = document.getElementById('form-container');
const errorBox = document.getElementById('form-error');
const carry = document.getElementById('pt-carry');
const q = new URLSearchParams(location.search);
const fromPT = q.get('from') === 'pressure-test';
const saved = pt.load();
const ptState = fromPT && saved && saved.result ? saved.result.state : null;
const ptSource = !fromPT ? 'work-intake' : !ptState || ptState === 'build' ? 'pressure-test' : `pressure-test-${ptState}`;

// Carry the pressure-test context in, if they came from it.
if (fromPT && saved && saved.result) {
  const st = STATES[saved.result.state];
  carry.innerHTML = `<b>From your Pressure Test.</b> We’ve attached your evidence review so you don’t have to repeat yourself.
    <p class="rv-status"><b>${esc(st ? st.label : saved.result.label)}</b><span>Status</span></p>`;
  carry.classList.add('show');
  const a = saved.answers || {};
  const today = document.getElementById('q-today');
  if (today && !today.value && (a.problem || a.workaround)) {
    today.value = [a.problem && `Problem: ${a.problem}`, a.workaround && `Today: ${a.workaround}`, a.costText && `Cost: ${a.costText}`].filter(Boolean).join('\n');
  }
  const imagine = document.getElementById('q-imagine');
  if (imagine && !imagine.value && a.claim) imagine.value = a.claim;
  const who = document.getElementById('q-who');
  if (who && !who.value && a.audience) who.value = a.audience;
}

let started = false;
form.addEventListener('focusin', () => { if (!started) { started = true; track('qb_work_intake_start', { from: fromPT ? 'pressure-test' : q.get('from') || 'direct' }); } }, { once: false });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';
  const data = Object.fromEntries(new FormData(form));
  if (data.website) return; // honeypot
  const missing = ['today', 'contact_name', 'company_name', 'email'].find((k) => !String(data[k] || '').trim());
  if (missing || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
    showError(missing ? 'We need at least the first answer, your name, organization and email.' : 'That email doesn’t look right.');
    const el = form.querySelector(`[name="${missing || 'email'}"]`); if (el) el.focus();
    return;
  }
  const btn = form.querySelector('.f-submit'); btn.disabled = true;
  // A searching orb while the answers travel: 20 is the library's inline-text size; the button's own text names it.
  btn.classList.add('sending'); btn.textContent = '';
  const orb = mountOrb(btn, { state: 'searching', size: 20, theme: 'dark', label: null });
  btn.append(document.createTextNode('Sending…'));

  const attr = getAttribution();
  const ok = await formPost('work-intake', {
    today: data.today, who: data.who, how_often: data.how_often, systems: data.systems, goes_wrong: data.goes_wrong,
    tried: data.tried, artifacts: data.artifacts, if_gone: data.if_gone, imagined_build: data.imagined_build,
    contact_name: data.contact_name, company_name: data.company_name, email: data.email,
    source: ptSource, attribution: attr,
    pressure_test: fromPT && saved ? { state: saved.result && saved.result.state, answers: saved.answers, completed_at: saved.completedAt } : null,
  });
  if (!ok) {
    orb.destroy(); btn.classList.remove('sending'); btn.disabled = false; btn.textContent = 'Send it to Quiet Bands';
    showError('Couldn’t send the form.');
    return;
  }
  orb.destroy();
  track('qb_work_intake_complete', { from: fromPT ? 'pressure-test' : 'direct', pt_state: fromPT && saved && saved.result ? saved.result.state : null });
  container.innerHTML = `<div class="f-success rise in"><div class="stamp">Received</div><h3>Got it.</h3><p>We read every answer. If the work is a fit, Jay replies personally, usually within two business days.</p></div>`;
  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

function showError(msg) {
  errorBox.style.display = 'block';
  errorBox.innerHTML = `<p>${esc(msg)} You can also email <a href="mailto:jason@quietbands.com">jason@quietbands.com</a> directly.</p>`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
