/* Leads view — /leads/. Reads through /.netlify/functions/leads with the owner's view key; never with the
   public Supabase key. Every lead field is untrusted text from a public form, so it is only ever set with
   textContent, never parsed as HTML. Rules live in ./leads-core.js. */
import { statusOf, splitReasoning, parseAnswers, replyHref, telHref, ago, counts, filterLeads, scorePayload, explainScoreResult, bucket, FILTERS } from './leads-core.js';
import { mountOrb } from './orb/thinking-orb.js';

const KEY = 'qb_leads_key';
const POLL_MS = 5000;
const app = document.getElementById('app');
const store = {
  get() { try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || ''; } catch { return ''; } },
  set(v, remember) { try { (remember ? localStorage : sessionStorage).setItem(KEY, v); } catch { /* private mode: keep in memory */ } },
  clear() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

let key = store.get(), leads = [], filter = 'all', loadedAt = 0, poll = 0, orbs = [];
const notes = new Map();      // lead id → { ok, text } from a Score now
const scoring = new Set();    // lead ids with a Score now in flight
const opened = new Set();     // lead ids whose answers are open, kept across refreshes

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const orb = (host, label) => { const o = mountOrb(host, { state: 'searching', size: 20, label }); orbs.push(o); return o; };
const clearOrbs = () => { orbs.forEach((o) => o.destroy()); orbs = []; };

/* ---------- gate ---------- */
function gate(message, bad) {
  clearOrbs(); clearTimeout(poll);
  const input = h('input', { type: 'password', id: 'k', autocomplete: 'current-password', required: true, minlength: '24', spellcheck: 'false' });
  const remember = h('input', { type: 'checkbox', id: 'remember' });
  const form = h('form', { class: 'gate', onsubmit: (e) => { e.preventDefault(); key = input.value.trim(); store.set(key, remember.checked); load(true); } },
    h('h1', { text: 'Leads' }),
    h('p', { text: 'Private. Enter the view key set in Netlify as LEADS_VIEW_KEY.' }),
    message ? h('p', { class: `msg${bad ? ' bad' : ''}`, role: bad ? 'alert' : null, text: message }) : null,
    h('label', { for: 'k', text: 'View key' }), input,
    h('div', { class: 'row' }, h('label', { class: 'remember', for: 'remember' }, remember, 'Remember on this device'), h('button', { class: 'l-btn primary', type: 'submit', text: 'Open' })));
  app.replaceChildren(form); input.focus();
}

/* ---------- data ---------- */
async function load(fromGate = false) {
  if (!key) return gate();
  let res, body;
  try { res = await fetch('/.netlify/functions/leads', { headers: { 'x-leads-key': key }, cache: 'no-store' }); body = await res.json().catch(() => ({})); }
  catch { return fromGate || !leads.length ? gate('Could not reach the leads function. Check the connection and try again.', true) : schedule(); }
  if (res.status === 401) { store.clear(); key = ''; return gate(fromGate ? 'That key is not right.' : 'The view key changed. Enter it again.', true); }
  if (res.status === 503) return gate(body.detail || 'The leads view is not set up on this deploy yet.', true);
  if (!res.ok) { if (!leads.length) return gate(`The leads function failed (status ${res.status}).`, true); return schedule(); }
  leads = Array.isArray(body.leads) ? body.leads : []; loadedAt = Date.now();
  render(); schedule();
}
/** Poll only while the scorer is genuinely working on something, or while a Score now is in flight. */
function schedule() {
  clearTimeout(poll);
  if (document.visibilityState === 'hidden') return;
  if (counts(leads).pending > 0 || scoring.size) poll = setTimeout(() => load(), POLL_MS);
}

async function scoreNow(lead, btn) {
  scoring.add(lead.id); notes.delete(lead.id);
  btn.disabled = true; btn.textContent = ''; const o = orb(btn, null); btn.append('Scoring…');
  let status = 0, body = null;
  try { const r = await fetch('/.netlify/functions/score-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scorePayload(lead)) }); status = r.status; body = await r.json().catch(() => null); }
  catch { body = { error: 'could not reach the scoring function' }; }
  o.destroy(); scoring.delete(lead.id);
  notes.set(lead.id, explainScoreResult(status, body));
  await load();
}

/* ---------- render ---------- */
function render() {
  clearOrbs();
  const now = Date.now(), c = counts(leads, now), shown = filterLeads(leads, filter, now);
  const needs = c.HOT + c.unscored;
  const summary = !leads.length ? 'No leads yet.'
    : `${c.all} ${c.all === 1 ? 'lead' : 'leads'}. ${needs ? `${needs} ${needs === 1 ? 'needs' : 'need'} you: ${[c.HOT && `${c.HOT} hot`, c.unscored && `${c.unscored} unscored`].filter(Boolean).join(', ')}.` : 'Nothing hot or stuck.'}${c.pending ? ` Scoring ${c.pending} now.` : ''}`;

  const head = h('div', { class: 'l-head' },
    h('div', {}, h('h1', { text: 'Leads' }), h('p', { class: 'l-sum', text: summary })),
    h('div', { class: 'l-tools' },
      h('button', { class: 'l-btn', type: 'button', onclick: () => load(), text: 'Refresh' }),
      h('button', { class: 'l-btn', type: 'button', onclick: () => { store.clear(); key = ''; leads = []; gate('Locked.'); }, text: 'Lock' })));

  const label = { all: 'All', HOT: 'Hot', WARM: 'Warm', COLD: 'Cold', unscored: 'Unscored' };
  const filters = h('div', { class: 'l-filters', role: 'group', 'aria-label': 'Filter by score' },
    FILTERS.map((f) => h('button', { type: 'button', 'aria-pressed': String(filter === f), onclick: () => { filter = f; render(); } }, label[f], h('span', { class: 'n', text: c[f] }))));

  const list = shown.length ? h('ul', { class: 'l-list' }, shown.map((l) => row(l, now)))
    : h('p', { class: 'empty', text: leads.length ? 'Nothing in this filter.' : 'When someone sends the Work intake, they show up here.' });

  const foot = h('p', { class: 'meta', text: `Updated ${new Date(loadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` });
  app.replaceChildren(head, filters, list, foot);
}

function row(l, now) {
  const st = scoring.has(l.id) ? 'pending' : statusOf(l, now), score = bucket(l, now);
  const pill = h('span', { class: `pill ${st === 'scored' ? score : st}` });
  if (st === 'pending') { orb(pill, null); pill.append('Scoring'); }
  else pill.textContent = st === 'scored' ? score : 'Not scored';

  const { reason, next } = splitReasoning(l.triage_reasoning);
  const answers = parseAnswers(l.pain_point);
  const src = [l.source, l.attribution && l.attribution.source && l.attribution.source !== l.source ? `via ${l.attribution.source}` : '', l.pressure_test && l.pressure_test.state ? `pressure test: ${l.pressure_test.state}` : ''].filter(Boolean).join(' · ');

  const acts = h('div', { class: 'acts' },
    l.email ? h('a', { class: 'l-btn primary', href: replyHref(l), text: 'Reply' }) : null,
    telHref(l.phone) ? h('a', { class: 'l-btn', href: telHref(l.phone), text: 'Call' }) : null,
    l.email ? h('button', { class: 'l-btn', type: 'button', text: 'Copy email', onclick: async (e) => { try { await navigator.clipboard.writeText(l.email); e.target.textContent = 'Copied'; } catch { e.target.textContent = l.email; } } }) : null,
    st === 'unscored' && !scoring.has(l.id) ? h('button', { class: 'l-btn', type: 'button', text: 'Score now', onclick: (e) => scoreNow(l, e.currentTarget) }) : null);

  const note = notes.get(l.id);
  return h('li', { class: 'lead' }, h('div', { class: 'lead-top' },
    pill,
    h('div', { class: 'who' }, l.company_name || '(no company)', ' ', h('span', { text: `· ${l.contact_name || 'unnamed'}` })),
    h('div', { class: 'when', title: l.created_at ? new Date(l.created_at).toLocaleString() : '', text: ago(l.created_at, now) }),
    reason ? h('p', { class: 'why', text: reason }) : (st === 'unscored' ? h('p', { class: 'why', text: 'The scorer never finished this one. Score it now, or read it below.' }) : null),
    next ? h('p', { class: 'next' }, h('b', { text: 'Next: ' }), next) : null,
    acts,
    note ? h('p', { class: `note${note.ok ? '' : ' bad'}`, role: note.ok ? null : 'alert', text: note.text }) : null,
    answers.length ? h('details', { class: 'answers', open: opened.has(l.id), ontoggle: (e) => { if (e.currentTarget.open) opened.add(l.id); else opened.delete(l.id); } }, h('summary', { text: `What they wrote (${answers.length})` }),
      h('dl', {}, answers.map((a) => [a.label ? h('dt', { text: a.label }) : null, h('dd', { text: a.text })]))) : null,
    h('p', { class: 'meta', text: [l.email, l.phone, src].filter(Boolean).join(' · ') })));
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && key && leads.length) load(); else clearTimeout(poll); });
load();
