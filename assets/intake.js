/* /work intake: writes to the existing Supabase `leads` table (anon insert, RLS) and
   pings the existing score-lead function. Composes the answers into pain_point so the
   scoring prompt keeps working unchanged; the structured answers go to `intake`. */
import { qbInsert, track, getAttribution, pt } from './qb.js';
import { STATES } from './triage.js';

const form = document.getElementById('intake-form');
const container = document.getElementById('form-container');
const errorBox = document.getElementById('form-error');
const carry = document.getElementById('pt-carry');
const q = new URLSearchParams(location.search);
const fromPT = q.get('from') === 'pressure-test';
const saved = pt.load();

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
  const btn = form.querySelector('.f-submit'); btn.disabled = true; btn.textContent = 'Sending…';

  const intake = {
    today: data.today, who: data.who, how_often: data.how_often, systems: data.systems, goes_wrong: data.goes_wrong,
    tried: data.tried, artifacts: data.artifacts, if_gone: data.if_gone, imagined_build: data.imagined_build,
  };
  const attr = getAttribution();
  const pain_point = [
    `WHAT IS HAPPENING TODAY: ${data.today}`, data.who && `WHO DOES THIS WORK: ${data.who}`, data.how_often && `HOW OFTEN: ${data.how_often}`,
    data.systems && `SYSTEMS INVOLVED: ${data.systems}`, data.goes_wrong && `WHEN IT GOES WRONG: ${data.goes_wrong}`, data.tried && `ALREADY TRIED: ${data.tried}`,
    data.artifacts && `ARTIFACTS: ${data.artifacts}`, data.if_gone && `IF IT DISAPPEARED: ${data.if_gone}`, data.imagined_build && `IMAGINED BUILD: ${data.imagined_build}`,
  ].filter(Boolean).join('\n');

  const row = {
    contact_name: data.contact_name, company_name: data.company_name, email: data.email,
    pain_point, current_tech: data.systems || null, timeline: data.how_often || null,
    source: fromPT ? 'pressure-test' : 'work-intake', intake, attribution: attr,
    pressure_test: fromPT && saved ? { state: saved.result && saved.result.state, answers: saved.answers, completed_at: saved.completedAt } : null,
  };
  const ok = await qbInsert('leads', row);
  if (!ok) {
    btn.disabled = false; btn.textContent = 'Send it to Quiet Bands';
    showError('Couldn’t send the form.');
    return;
  }
  fetch('/.netlify/functions/score-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...row, intake: undefined, attribution: undefined, pressure_test: undefined }) }).catch(() => {});
  track('qb_work_intake_complete', { from: fromPT ? 'pressure-test' : 'direct', pt_state: fromPT && saved && saved.result ? saved.result.state : null });
  container.innerHTML = `<div class="f-success rise in"><div class="stamp">Received</div><h3>Got it.</h3><p>We read every answer. If the work is a fit, Jay replies personally, usually within two business days.</p></div>`;
  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

function showError(msg) {
  errorBox.style.display = 'block';
  errorBox.innerHTML = `<p>${esc(msg)} You can also email <a href="mailto:jason@quietbands.com">jason@quietbands.com</a> directly.</p>`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
