/* Quiet Bands Pressure Test — guided research review. Vanilla JS, no build.
   State lives in localStorage (qb_pt_v1) so a refresh or a wrong tap loses nothing. */
import { EMPTY, EVIDENCE, COSTS, FREQUENCY, SPEND, HUMANS, PROGRESS, DECISION, review, toText } from './triage.js';
import { track, pt, preserveUtm } from './qb.js';

const STEPS = [
  { id: 'claim', label: 'The claim', fields: [
    { k: 'claim', q: 'What are you thinking about building?', type: 'text', ph: 'One or two sentences. Plain words.' },
    { k: 'audience', q: 'Who is it for?', type: 'text', help: 'Be specific enough that you could actually find these people.', ph: 'e.g. office managers at 10–50 person HVAC companies in Houston' },
  ] },
  { id: 'problem', label: 'The problem', fields: [
    { k: 'problem', q: 'What problem do you believe they have?', type: 'text', ph: 'Describe the moment it goes wrong, not the feature that fixes it.' },
    { k: 'frequency', q: 'How often do you believe it happens?', type: 'radio', options: FREQUENCY },
  ] },
  { id: 'evidence', label: 'The evidence', fields: [
    { k: 'evidence', q: 'What have you actually seen?', type: 'multi', options: EVIDENCE, help: 'Select everything that applies. These are evidence signals, not proof.' },
  ] },
  { id: 'workaround', label: 'The workaround', fields: [
    { k: 'workaround', q: 'What do people do today instead?', type: 'text', ph: 'The spreadsheet, the group text, the intern, the “we just deal with it”.' },
    { k: 'spend', q: 'Does somebody already spend time or money dealing with this?', type: 'radio', options: SPEND },
  ] },
  { id: 'consequence', label: 'The consequence', fields: [
    { k: 'costs', q: 'What does the problem cost today?', type: 'multi', options: COSTS },
    { k: 'costText', q: 'What does that look like?', type: 'text', optional: true, ph: 'Optional. A number, a story, an example.' },
  ] },
  { id: 'humans', label: 'The human check', fields: [
    { k: 'humans', q: 'Have you talked to people who actually experience this problem?', type: 'radio', options: HUMANS },
    { k: 'surprise', q: 'What did you learn that surprised you?', type: 'text', optional: true, ph: 'Optional. The thing you didn’t expect them to say.', showIf: (a) => a.humans === 'several' || a.humans === 'one_two' },
  ] },
  { id: 'exists', label: 'What exists', fields: [
    { k: 'progress', q: 'How far have you already gone?', type: 'radio', options: PROGRESS },
    { k: 'decision', q: 'What are you trying to decide?', type: 'radio', options: DECISION },
  ] },
];

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let S = load();
function load() {
  const saved = pt.load();
  const s = { answers: { ...EMPTY }, step: 0, view: 'intro', startedAt: null, completedAt: null, result: null };
  if (saved && saved.answers) Object.assign(s, saved, { answers: { ...EMPTY, ...saved.answers } });
  if (s.view === 'step' && (s.step < 0 || s.step >= STEPS.length)) s.step = 0;
  return s;
}
function save() { pt.save({ ...S }); }

const root = $('#pt');
const head = $('#pt-head');
const bar = $('#pt-head .pt-bar i');

function render(direction = 'fwd') {
  head.hidden = S.view === 'intro';
  if (S.view === 'intro') return renderIntro();
  if (S.view === 'result') return renderResult();
  return renderStep(direction);
}

/* ---------- intro ---------- */
function renderIntro() {
  const resumable = S.startedAt && (S.step > 0 || Object.values(S.answers).some((v) => (Array.isArray(v) ? v.length : v)));
  root.innerHTML = `
    <div class="pt-intro">
      <p class="attrib"><span>From <b>Flighty.ai</b></span><span class="sep"></span><span>A Quiet Bands R&amp;D process</span></p>
      <h1 class="display" style="margin-top:22px">Let’s see what you actually know.</h1>
      <p class="lede">This isn’t a test of whether your idea sounds good. We’re looking for evidence that the problem exists, matters, and is worth doing something about.</p>
      <div class="cta-row">
        <button class="btn" id="pt-start" type="button">Start the Pressure Test</button>
        <span class="quiet" style="font-size:14px">Seven questions. About eight minutes.</span>
      </div>
      ${resumable ? `<p class="pt-resume">You have unfinished answers. <button type="button" id="pt-resume">Pick up where you left off</button> or start fresh.</p>` : ''}
      <p class="pt-note">No score. No fake validation percentage.<br>No AI telling you your idea is “amazing.”</p>
    </div>`;
  $('#pt-start').addEventListener('click', () => {
    if (resumable) { S = { ...S, answers: { ...EMPTY }, step: 0, result: null, completedAt: null }; }
    S.startedAt = new Date().toISOString(); S.view = 'step'; S.step = 0; save();
    track('pressure_test_start', { resumed: false });
    pushState(); render();
  });
  const rs = $('#pt-resume');
  if (rs) rs.addEventListener('click', () => { S.view = 'step'; save(); track('pressure_test_start', { resumed: true }); pushState(); render(); });
}

/* ---------- steps ---------- */
function renderStep(direction) {
  const i = S.step, step = STEPS[i], a = S.answers;
  head.querySelector('.pt-n').innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b> / ${String(STEPS.length).padStart(2, '0')}`;
  head.querySelector('.pt-l').textContent = step.label;
  bar.style.width = `${((i + 1) / STEPS.length) * 100}%`;

  root.innerHTML = `
    <form class="pt-step ${REDUCED ? '' : direction === 'back' ? 'enter-back' : 'enter'}" id="pt-form" novalidate>
      ${step.fields.map((f, fi) => fieldHtml(f, a, fi === 0)).join('')}
      <p class="pt-err" id="pt-err" role="alert"></p>
      <div class="pt-nav">
        <button type="button" class="pt-back" id="pt-back" ${i === 0 ? 'hidden' : ''}>← Back</button>
        <button type="submit" class="pt-next">${i === STEPS.length - 1 ? 'Review the evidence' : 'Continue'} →</button>
      </div>
    </form>`;

  // conditional fields + live persistence
  const form = $('#pt-form');
  form.addEventListener('input', (e) => { collect(step); save(); if (e.target.name === 'humans') toggleConditional(step); });
  form.addEventListener('change', () => { collect(step); save(); toggleConditional(step); form.querySelectorAll('.pt-opt').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked)); });
  toggleConditional(step);
  form.querySelectorAll('.pt-opt').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
  form.querySelectorAll('textarea').forEach(autoGrow);

  form.addEventListener('submit', (e) => {
    e.preventDefault(); collect(step);
    const missing = step.fields.find((f) => !f.optional && (!f.showIf || f.showIf(a)) && isEmpty(a[f.k]));
    if (missing) {
      const err = $('#pt-err'); err.textContent = missing.type === 'text' ? 'A sentence is enough, but we need something here.' : 'Pick at least one.'; err.classList.add('show');
      const el = form.querySelector(`[name="${missing.k}"]`); if (el) el.focus();
      return;
    }
    save();
    if (i === STEPS.length - 1) return finish();
    S.step = i + 1; save();
    track('pressure_test_step', { step: S.step + 1, id: STEPS[S.step].id, direction: 'forward' });
    pushState(); render('fwd');
  });
  $('#pt-back').addEventListener('click', () => {
    collect(step); save();
    S.step = Math.max(0, i - 1); save();
    track('pressure_test_step', { step: S.step + 1, id: STEPS[S.step].id, direction: 'back' });
    pushState(); render('back');
  });

  if (direction !== 'init') { const h = root.querySelector('.pt-q'); if (h) h.focus({ preventScroll: false }); window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); }
  if (i === 0 && !S._stepTracked) { S._stepTracked = true; track('pressure_test_step', { step: 1, id: STEPS[0].id, direction: 'forward' }); }
}

function fieldHtml(f, a, first) {
  const hidden = f.showIf && !f.showIf(a) ? 'hidden' : '';
  const q = `<h2 class="pt-q" tabindex="-1">${esc(f.q)}${f.optional ? ' <span class="quiet" style="font-size:.5em;font-weight:400;letter-spacing:0">(optional)</span>' : ''}</h2>`;
  const help = f.help ? `<p class="pt-help">${esc(f.help)}</p>` : '';
  if (f.type === 'text') {
    return `<div class="pt-field-wrap" data-k="${f.k}" ${hidden}>${q}${help}<div class="pt-field"><textarea class="pt-ta" name="${f.k}" rows="3" placeholder="${esc(f.ph || '')}" aria-label="${esc(f.q)}">${esc(a[f.k])}</textarea></div></div>`;
  }
  const multi = f.type === 'multi';
  const opts = f.options.map(([k, l]) => {
    const checked = multi ? (a[f.k] || []).includes(k) : a[f.k] === k;
    return `<li><label class="pt-opt ${checked ? 'on' : ''}"><input type="${multi ? 'checkbox' : 'radio'}" name="${f.k}" value="${k}" ${checked ? 'checked' : ''}><span class="mk" aria-hidden="true"></span><span class="lbl">${esc(l)}</span></label></li>`;
  }).join('');
  return `<div class="pt-field-wrap" data-k="${f.k}" ${hidden}>${q}${help}<ul class="pt-opts" role="${multi ? 'group' : 'radiogroup'}" aria-label="${esc(f.q)}">${opts}</ul></div>`;
}
function toggleConditional(step) {
  step.fields.forEach((f) => { if (!f.showIf) return; const w = root.querySelector(`.pt-field-wrap[data-k="${f.k}"]`); if (w) w.hidden = !f.showIf(S.answers); });
}
function collect(step) {
  const form = $('#pt-form'); if (!form) return;
  step.fields.forEach((f) => {
    if (f.type === 'text') S.answers[f.k] = (form.querySelector(`[name="${f.k}"]`) || {}).value || '';
    else if (f.type === 'multi') S.answers[f.k] = [...form.querySelectorAll(`[name="${f.k}"]:checked`)].map((i) => i.value);
    else { const c = form.querySelector(`[name="${f.k}"]:checked`); S.answers[f.k] = c ? c.value : ''; }
  });
}
const isEmpty = (v) => (Array.isArray(v) ? v.length === 0 : !String(v || '').trim());
function autoGrow(ta) { const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.max(120, ta.scrollHeight + 2) + 'px'; }; ta.addEventListener('input', fit); fit(); }

/* ---------- finish ---------- */
function finish() {
  const r = review(S.answers);
  S.completedAt = new Date().toISOString(); S.view = 'result'; S.result = { state: r.state, label: r.meta.label }; save();
  const dur = S.startedAt ? Math.round((Date.parse(S.completedAt) - Date.parse(S.startedAt)) / 1000) : null;
  track('pressure_test_complete', { duration_s: dur });
  const s = r.signals;
  track('pressure_test_result', {
    state: r.state, observable: s.observableCount, evidence: S.answers.evidence, frequency: S.answers.frequency, spend: S.answers.spend,
    consequence: s.consequenceKnown, humans: S.answers.humans, progress: S.answers.progress, decision: S.answers.decision, software_signal: s.softwareSignal,
  });
  pushState(); render();
}

/* ---------- result ---------- */
function renderResult() {
  const a = S.answers, r = review(a), m = r.meta;
  head.querySelector('.pt-n').innerHTML = `<b>Review</b>`;
  head.querySelector('.pt-l').textContent = 'Evidence review';
  bar.style.width = '100%';

  const list = (items, cls = '') => items.length ? `<ul class="rv-list ${cls}">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="rv-empty">Nothing yet.</p>`;
  const ctaHtml = (c, primary) => {
    const cls = primary ? 'btn' : 'btn btn-ghost';
    if (c.href) return `<a class="${cls}" href="${preserveUtm(c.href)}" data-act="link" data-state="${r.state}">${esc(c.text)} →</a>`;
    return `<button type="button" class="${cls}" data-act="${c.action}">${esc(c.text)}</button>`;
  };

  root.innerHTML = `
    <div class="rv ${REDUCED ? '' : 'pt-step enter'}">
      <p class="rv-status"><b>${esc(m.label)}</b><span>Status</span></p>
      <h1 class="rv-h" tabindex="-1">${esc(m.headline)}</h1>
      <p class="rv-copy">${esc(m.copy)}</p>

      <section class="rv-sec" aria-labelledby="rv-see"><h2 class="rv-k" id="rv-see">What we can see</h2>${list(r.see)}</section>
      <section class="rv-sec" aria-labelledby="rv-unk"><h2 class="rv-k" id="rv-unk">What we don’t know</h2>${list(r.unknown)}</section>
      <section class="rv-sec" aria-labelledby="rv-next"><h2 class="rv-k" id="rv-next">Next experiment</h2>
        <div>${list(r.reduce)}
        ${r.state === 'humans' ? `<h3 class="rv-k" style="margin-top:24px">Questions to ask</h3>${list(r.questions, 'q')}` : ''}
        ${r.state === 'manual' ? `<div class="rv-plan" id="rv-plan"><h3>A manual test, in four moves</h3><ol>
          <li><b>Pick one person or one team</b> who has the problem and will let you help for two weeks.</li>
          <li><b>Deliver the outcome by hand.</b> You, a spreadsheet, a checklist, a shared inbox. No code.</li>
          <li><b>Count something every day:</b> minutes, errors, dollars, missed calls. Write it down where they can see it.</li>
          <li><b>At the end, ask two questions:</b> would you keep this, and what would you pay for it? Then note what broke while doing it by hand. That list is the software spec, if there is one.</li></ol></div>` : ''}
        </div>
      </section>
      <section class="rv-sec" aria-labelledby="rv-act"><h2 class="rv-k" id="rv-act">Next action</h2>
        <div>
          <div class="rv-actions mt-0" style="border-top:0;padding-top:0">${ctaHtml(m.cta, true)}${ctaHtml(m.secondary, false)}<span class="rv-toast" id="rv-toast" aria-live="polite"></span></div>
          <p class="rv-fine">Transparent rules, not a score. <a href="/rd/#method">How the review is decided</a><br>
          <button type="button" class="pt-back" data-act="restart" style="padding:0;min-height:0;letter-spacing:.14em">Edit answers</button> &nbsp;·&nbsp; <button type="button" class="pt-back" data-act="clear" style="padding:0;min-height:0;letter-spacing:.14em">Start over and clear stored answers</button> &nbsp;·&nbsp; <button type="button" class="pt-back" data-act="download" style="padding:0;min-height:0;letter-spacing:.14em">Download this review (.txt)</button></p>
        </div>
      </section>
    </div>`;

  root.querySelectorAll('[data-act]').forEach((el) => el.addEventListener('click', (e) => {
    const act = el.getAttribute('data-act');
    if (act === 'link') { track('pressure_test_action', { state: r.state, action: el.getAttribute('href') }); return; }
    e.preventDefault();
    track('pressure_test_action', { state: r.state, action: act });
    if (act === 'restart') { S.view = 'step'; S.step = 0; save(); pushState(); render('back'); }
    if (act === 'clear') { pt.clear(); S = load(); pushState(); render(); }
    if (act === 'download') downloadText(toText(a, r), 'quiet-bands-pressure-test.txt');
    if (act === 'save-questions') {
      const txt = ['QUESTIONS TO ASK THE PEOPLE DOING THE WORK', '', ...r.questions.map((q, i) => `${i + 1}. ${q}`), '', 'From the Quiet Bands Pressure Test — quietbands.com/rd'].join('\n');
      copyText(txt).then((ok) => { $('#rv-toast').textContent = ok ? 'Copied to clipboard' : ''; });
      downloadText(txt, 'questions-to-ask.txt');
    }
    if (act === 'manual-plan') { const p = $('#rv-plan'); p.classList.add('show'); p.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' }); }
  }));
  const h = root.querySelector('.rv-h'); if (h) h.focus(); window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
}

async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } }
function downloadText(t, name) {
  const blob = new Blob([t], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- browser back/forward ---------- */
function pushState() { try { history.pushState({ view: S.view, step: S.step }, ''); } catch { /* ignore */ } }
window.addEventListener('popstate', (e) => {
  const st = e.state; if (!st) { S.view = 'intro'; save(); render(); return; }
  if (st.view === 'result' && !S.completedAt) return;
  S.view = st.view; S.step = st.step; save(); render(st.view === 'step' ? 'back' : 'fwd');
});
try { history.replaceState({ view: S.view, step: S.step }, ''); } catch { /* ignore */ }

render('init');
