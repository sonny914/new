// QUIET BANDS — OPERATOR v0.1 · controller
// One screen: paste an artifact, read it, decide, record what happened, carry the context.
// All logic that matters is in operator-core.js and under test; this file is wiring and render.
import * as C from '/assets/lab/operator-core.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MODE_KEY = 'qb-operator-mode', KEY_KEY = 'qb-operator-key';
const API = '/.netlify/functions/operator-interpret';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let mode = localStorage.getItem(MODE_KEY) === 'example' ? 'example' : 'real';
let store;
let apiState = 'unknown'; // unknown | ok | config | unauthorised
let current = null;       // the artifact being read
let pendingImage = null;  // { mediaType, data, dataUrl }
let openPersonId = null;

function persistFor(ns) {
  return {
    load() { try { const raw = localStorage.getItem(ns); return raw ? JSON.parse(raw) : null; } catch { return null; } },
    save(s) { try { localStorage.setItem(ns, JSON.stringify(s)); } catch (e) { notice(`Could not save in this browser: ${e.message}`); } },
  };
}
function openStore() { store = C.createStore(persistFor(`qb-operator-${mode}`)); }

/* ---------- notices ---------- */
function notice(text, kind = '') {
  const n = $('#notice'); n.hidden = !text; n.textContent = text || ''; n.className = `notice ${kind}`;
}

/* ---------- header ---------- */
function renderHeader() {
  $('#mode-real').setAttribute('aria-pressed', String(mode === 'real'));
  $('#mode-example').setAttribute('aria-pressed', String(mode === 'example'));
  const n = store.events().length;
  $('#store-badge').innerHTML = mode === 'example'
    ? `example data, fictional, separate from your log <b>${n}</b> events`
    : `stored in this browser <b>${n}</b> events`;
  $('#example-tools').hidden = mode !== 'example';
  $('#load-example').hidden = store.events().length > 0;
}

/* ---------- API ---------- */
async function callApi(payload) {
  const key = localStorage.getItem(KEY_KEY) || '';
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-operator-key': key }, body: JSON.stringify(payload) });
  let body = null; try { body = await res.json(); } catch { body = null; }
  if (res.status === 503) { apiState = 'config'; return { ok: false, reason: 'config', detail: body && body.detail }; }
  if (res.status === 401) { apiState = 'unauthorised'; return { ok: false, reason: 'unauthorised' }; }
  apiState = 'ok';
  return body || { ok: false, reason: `http ${res.status}` };
}
function askKey() {
  const k = window.prompt('Access key for the model (set OPERATOR_KEY on the site). Stored only in this browser.', localStorage.getItem(KEY_KEY) || '');
  if (k !== null) { localStorage.setItem(KEY_KEY, k.trim()); apiState = 'unknown'; notice(''); }
}

/* ---------- ladder ---------- */
function ladderHtml(rung, { lg = false, flare = false } = {}) {
  const cells = C.RUNGS.map((name, i) => {
    const on = rung !== null && i <= rung;
    const top = rung !== null && rung >= 1 && i === rung;
    return `<span class="cell${on ? ' is-on' : ''}${top ? ' is-live' : ''}${top && flare && !reduced ? ' flare' : ''}" title="${i} ${esc(name)}"></span>`;
  }).join('');
  return `<span class="ladder${lg ? ' lg' : ''}" role="img" aria-label="Rung ${rung ?? 'none'}${rung !== null ? `, ${C.RUNGS[rung]}` : ''}">${cells}</span>`;
}

/* ---------- capture ---------- */
function setImage(file) {
  if (!file || !/^image\/(png|jpeg|gif|webp)$/.test(file.type)) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    pendingImage = { mediaType: file.type, data: String(dataUrl).split(',')[1], dataUrl };
    $('#thumb').innerHTML = `<img class="thumb" src="${dataUrl}" alt="screenshot to read">`;
    $('#capture-meta').textContent = 'screenshot attached, read from the image, not stored after the reading';
  };
  reader.readAsDataURL(file);
}

async function capture() {
  const text = $('#artifact-input').value.trim();
  if (!text && !pendingImage) { notice('Paste a post, a profile URL, or drop a screenshot first.'); return; }
  notice('');
  const url = C.extractLinkedIn(text);
  const sourceKind = pendingImage && !text ? 'screenshot' : url && text.length < 160 ? 'url' : pendingImage ? 'screenshot' : /^https?:\/\//.test(text) && !/\s/.test(text) ? 'url' : text ? 'linkedin_post' : 'pasted_text';
  const res0 = C.resolveAuthor({ text }, store);
  const artifact = store.addArtifact({ sourceKind, url, rawText: text || '(screenshot, not stored)', authorPersonId: res0.person ? res0.person.id : null, origin: mode });
  store.append({ kind: 'artifact_captured', actor: 'jay', artifactId: artifact.id, personId: res0.person ? res0.person.id : null, origin: mode, payload: { sourceKind, hasImage: Boolean(pendingImage) } });
  if (res0.person) store.append({ kind: 'author_resolved', actor: 'system', artifactId: artifact.id, personId: res0.person.id, origin: mode, payload: { how: res0.how, confidence: res0.confidence } });

  current = { artifact, text, imageDataUrl: pendingImage ? pendingImage.dataUrl : null, person: res0.person, resolution: res0, context: null, result: null, decision: null, draft: null, recEvent: null, evidenceEvents: [], posted: false, sample: false };
  const img = pendingImage; pendingImage = null; $('#thumb').innerHTML = ''; $('#capture-meta').textContent = '';
  $('#artifact-input').value = '';
  renderArtifact(); renderReadingBusy();

  current.context = current.person ? C.contextPack(store, current.person.id) : { status: 'empty', markdown: '', eventIds: [], truncated: false };
  const payload = { action: 'interpret', text, image: img ? { mediaType: img.mediaType, data: img.data } : null, context: { status: current.context.status, markdown: current.context.markdown } };
  const t0 = Date.now();
  const r = await callApi(payload);
  const ms = Date.now() - t0;

  if (!r.ok) {
    if (r.reason === 'config' && mode === 'example') { current.result = sampleReading(text); current.sample = true; current.model = 'sample, not the model'; }
    else { renderReadingError(r); return; }
  } else { current.result = r.result; current.model = r.model; current.promptVersion = r.promptVersion; current.ms = ms; }
  afterReading();
}

function afterReading() {
  const { artifact, result } = current;
  // Author: URL match already handled; try the model's guess against aliases.
  if (!current.person && result.author && (result.author.name || result.author.linkedinUrl)) {
    const res = C.resolveAuthor({ text: current.text, guessName: result.author.name, guessUrl: result.author.linkedinUrl }, store);
    current.resolution = res;
    if (res.person && res.confidence >= 0.9) linkPerson(res.person, res.how, res.confidence, 'system');
  }
  const pid = current.person ? current.person.id : null;
  store.append({ kind: 'context_retrieved', actor: 'system', artifactId: artifact.id, personId: pid, origin: mode, payload: { status: current.context.status, eventIds: current.context.eventIds, truncated: current.context.truncated, budgetChars: 6000 } });
  result.observations.forEach((text) => store.append({ kind: 'observation', actor: 'system', artifactId: artifact.id, personId: pid, origin: mode, model: current.model, promptVersion: current.promptVersion, payload: { text, cites: [artifact.id], sample: current.sample } }));
  current.evidenceEvents = result.problemEvidence.map((pe) => {
    const pr = store.addProblem({ label: pe.label, origin: mode });
    return store.append({ kind: 'problem_evidence', actor: 'system', artifactId: artifact.id, personId: pid, problemId: pr.id, origin: mode, model: current.model, promptVersion: current.promptVersion, payload: { quote: pe.quote, cites: [artifact.id], sample: current.sample } });
  });
  current.recEvent = store.append({ kind: 'recommendation', actor: 'system', artifactId: artifact.id, personId: pid, origin: mode, model: current.model, promptVersion: current.promptVersion, payload: { verdict: result.verdict, reasons: result.reasons, rulesApplied: result.rulesApplied || [], contentHash: artifact.contentHash, cites: [artifact.id], sample: current.sample } });
  renderAll();
}

function linkPerson(person, how, confidence, actor) {
  current.person = person;
  store.setArtifactAuthor(current.artifact.id, person.id);
  store.append({ kind: 'author_resolved', actor, artifactId: current.artifact.id, personId: person.id, origin: mode, payload: { how, confidence } });
  current.context = C.contextPack(store, person.id);
}

function createPersonFromGuess() {
  const a = (current.result && current.result.author) || {};
  const name = window.prompt('Name for this person', a.name || '');
  if (!name) return;
  let company = null;
  if (a.company) company = store.addCompany({ name: a.company, origin: mode });
  const person = store.addPerson({ displayName: name.trim(), linkedinUrl: a.linkedinUrl || C.extractLinkedIn(current.text), companyId: company ? company.id : null, title: a.title || null, origin: mode });
  linkPerson(person, 'manual', 1, 'jay');
  renderAll();
}
function linkExisting() {
  const people = C.peopleTable(store);
  if (!people.length) { createPersonFromGuess(); return; }
  const list = people.map((r, i) => `${i + 1}. ${r.person.displayName}${r.company ? ` (${r.company.name})` : ''}`).join('\n');
  const pick = window.prompt(`Which person is this?\n${list}\n\nNumber, or blank to cancel.`);
  const idx = Number(pick) - 1;
  if (!Number.isInteger(idx) || !people[idx]) return;
  const person = people[idx].person;
  if (current.result && current.result.author && current.result.author.name) store.addAlias(person.id, current.result.author.name, 'name', 1);
  const url = C.extractLinkedIn(current.text) || (current.result && current.result.author.linkedinUrl);
  if (url && !person.linkedinUrl) { person.linkedinUrl = C.normaliseLinkedIn(url); store.addAlias(person.id, url, 'url', 1); }
  linkPerson(person, 'alias', 1, 'jay');
  renderAll();
}

/* ---------- decisions ---------- */
function decide(verdict) {
  if (!current || !current.result || current.decision) return;
  const agreed = verdict === current.result.verdict;
  current.decision = store.append({ kind: 'decision', actor: 'jay', artifactId: current.artifact.id, personId: current.person ? current.person.id : null, origin: mode, payload: { verdict, agreedWithSystem: agreed } });
  if (verdict === 'SAVE') {
    store.append({ kind: 'action', actor: 'jay', artifactId: current.artifact.id, personId: current.person ? current.person.id : null, origin: mode, payload: { kind: 'saved' } });
    current.posted = true;
    if (current.person) flareIf(C.applySystemRung(store, current.person.id));
  }
  renderAll();
  if (verdict === 'COMMENT' && !current.draft) draftComment();
}

async function draftComment() {
  const anchors = store.events().filter((e) => e.kind === 'action' && e.payload.kind === 'commented' && e.payload.text && e.actor === 'jay').slice(-3).map((e) => e.payload.text);
  $('#draft-status').textContent = 'drafting…';
  const r = await callApi({ action: 'draft', text: current.text || '(screenshot)', observations: current.result.observations, reasons: current.result.reasons, context: { status: current.context.status, markdown: current.context.markdown }, anchors });
  if (!r.ok) {
    if (r.reason === 'config' && mode === 'example') { current.draft = { comment: SAMPLE_DRAFT, sample: true }; }
    else { $('#draft-status').textContent = r.reason === 'config' ? 'model not configured on this site' : r.reason === 'unauthorised' ? 'access key rejected' : `draft failed: ${r.detail || r.reason}`; return; }
  } else current.draft = { comment: r.result.comment, sample: false };
  renderReading();
}

async function markPosted() {
  const finalText = $('#draft-text').value.trim();
  if (!finalText) return;
  try { await navigator.clipboard.writeText(finalText); } catch { /* clipboard may be blocked; the text is still on screen */ }
  const ratio = current.draft ? C.editRatio(current.draft.comment, finalText) : 1;
  store.append({ kind: 'action', actor: 'jay', artifactId: current.artifact.id, personId: current.person ? current.person.id : null, origin: mode, payload: { kind: 'commented', text: finalText, draftEditRatio: Number(ratio.toFixed(2)), draftedBySystem: Boolean(current.draft && !current.draft.sample) } });
  current.posted = true;
  if (current.person) flareIf(C.applySystemRung(store, current.person.id));
  renderAll();
}

function confirmEvidence(evId) {
  const ev = store.events().find((e) => e.id === evId); if (!ev || !current.person) return;
  const conf = store.append({ kind: 'problem_evidence', actor: 'jay', artifactId: ev.artifactId, personId: current.person.id, problemId: ev.problemId, origin: mode, evidenceEventId: ev.id, payload: { quote: ev.payload.quote, cites: ev.payload.cites } });
  renderAll(); return conf;
}

function confirmRung(personId) {
  const events = store.eventsFor(personId);
  const p = C.proposeRungChange(events);
  if (p.kind !== 'needs_jay') return;
  const ev = store.append({ kind: 'rung_changed', actor: 'jay', personId, origin: mode, evidenceEventId: p.evidenceEventId, payload: { from: C.currentRung(events), to: p.to } });
  flareIf(ev); renderAll();
}

function recordResponse(artifactId, kind, asksAboutQb, text) {
  const a = store.artifact(artifactId); if (!a) return;
  const ev = store.append({ kind: 'response_observed', actor: 'jay', artifactId, personId: a.authorPersonId, origin: mode, payload: { kind, by: 'external', asksAboutQb: Boolean(asksAboutQb), text: text || null } });
  if (a.authorPersonId) flareIf(C.applySystemRung(store, a.authorPersonId));
  renderAll(); return ev;
}

let flarePersonId = null;
function flareIf(ev) { if (ev) flarePersonId = ev.personId; }

/* ---------- render ---------- */
function renderAll() { renderHeader(); renderArtifact(); renderReading(); renderLoops(); renderPeople(); renderProblems(); if (openPersonId) renderDossier(openPersonId); }

function authorLine() {
  const p = current.person;
  if (p) {
    const co = p.companyId ? store.company(p.companyId) : null;
    const how = current.resolution && current.resolution.how;
    const badge = how === 'url' ? 'resolved by profile URL' : how === 'alias' ? 'resolved by name' : how === 'manual' ? 'confirmed by Jay' : 'known';
    return `<button class="name plain" data-open="${p.id}">${esc(p.displayName)}</button><span class="meta">${esc([p.title, co && co.name].filter(Boolean).join(', '))}</span><span class="badge">${badge}</span>`;
  }
  const g = current.result && current.result.author;
  if (g && (g.name || g.company)) {
    const conf = Math.round((g.confidence || 0) * 100);
    const cand = current.resolution && current.resolution.person;
    return `<span class="name">${esc(g.name || 'Unknown author')}</span><span class="meta">${esc([g.title, g.company].filter(Boolean).join(', '))}</span>`
      + `<span class="badge is-ask">guess, ${conf}% sure</span>`
      + (cand ? `<button class="row-btn" data-link-candidate="${cand.id}">This is ${esc(cand.displayName)}</button>` : '')
      + `<button class="row-btn" data-link-existing>Link to someone on file</button><button class="row-btn" data-create-person>New person</button>`;
  }
  return `<span class="name dim">Author not identified</span><span class="badge is-ask">first time seen</span><button class="row-btn" data-link-existing>Link to someone on file</button><button class="row-btn" data-create-person>New person</button>`;
}

function renderArtifact() {
  const el = $('#artifact');
  if (!current) { el.hidden = true; return; }
  el.hidden = false;
  const a = current.artifact;
  $('#artifact-who').innerHTML = authorLine();
  $('#artifact-text').className = `text${current.imageDataUrl ? ' has-img' : ''}`;
  $('#artifact-text').innerHTML = `${esc(current.text || '')}${current.imageDataUrl ? `<img src="${current.imageDataUrl}" alt="the screenshot being read">` : ''}`;
  $('#artifact-meta').innerHTML = `captured ${esc(a.capturedAt.slice(0, 16).replace('T', ' '))} · ${esc(a.sourceKind.replace('_', ' '))} · hash ${esc(a.contentHash)}${a.origin === 'example' ? ' · example' : ''}`;
}

function renderReadingBusy() {
  const el = $('#reading');
  const t0 = Date.now();
  el.innerHTML = `<div class="busy"><span class="tick"></span><span>Reading<span class="meta" id="busy-ms"></span></span></div>`;
  const tick = () => { const b = $('#busy-ms'); if (!b) return; b.textContent = ` ${((Date.now() - t0) / 1000).toFixed(0)}s`; requestAnimationFrame(tick); };
  if (!reduced) requestAnimationFrame(tick);
}
function renderReadingError(r) {
  const el = $('#reading');
  const why = r.reason === 'config' ? `The model is not configured on this site (${esc(r.detail || 'missing key')}). Nothing was invented in its place.`
    : r.reason === 'unauthorised' ? 'The access key was rejected. Set it from the header.'
    : r.reason === 'refused' ? 'The model declined to read this. Nothing was recorded for it.'
    : `The reading failed: ${esc(r.detail || r.reason)}.`;
  el.innerHTML = `<p class="empty">${why}</p>`;
  if (r.reason === 'unauthorised') askKey();
}

function renderReading() {
  const el = $('#reading');
  if (!current || !current.result) {
    if (!current) el.innerHTML = `<p class="empty">Nothing to read yet. Paste a post on the left and the reading appears here: who this is, what we already know, what is worth noticing, and whether to comment, save, or scroll.</p>`;
    return;
  }
  const r = current.result, ctx = current.context;
  const pid = current.person ? current.person.id : null;
  const rung = pid ? C.currentRung(store.eventsFor(pid)) : null;
  const ctxLine = ctx.status === 'ok'
    ? `<b>${ctx.eventIds.length}</b> prior events carried in${ctx.truncated ? ', trimmed to budget' : ''} · rung ${rung} ${esc(C.RUNGS[rung] || '')} ${ladderHtml(rung)}`
    : current.person ? `known person, <b>no</b> prior events` : `<b>no</b> prior context, first time seen`;
  const sampleBadge = current.sample ? `<span class="badge is-ask">sample reading, not the model</span>` : `<span class="badge">${esc(current.model || 'model')}${current.ms ? ` · ${(current.ms / 1000).toFixed(1)}s` : ''}</span>`;

  let i = 0;
  let html = `<div class="section rise" style="--i:${i++}"><h3>Context</h3><p class="meta">${ctxLine}</p></div>`;
  html += `<div class="section rise" style="--i:${i++}"><h3>Noticed</h3><ul class="obs">${r.observations.map((o) => `<li>${esc(o)}</li>`).join('') || '<li class="dim">Nothing worth noticing.</li>'}</ul></div>`;
  if (current.evidenceEvents.length) {
    const rows = current.evidenceEvents.map((ev) => {
      const pr = store.problem(ev.problemId);
      const confirmed = store.events().some((e) => e.kind === 'problem_evidence' && e.actor === 'jay' && e.evidenceEventId === ev.id);
      const btn = confirmed ? `<span class="badge is-live">confirmed by Jay</span>` : pid ? `<button class="row-btn" data-confirm-evidence="${ev.id}">Confirm <span class="badge">proposed</span></button>` : `<span class="badge is-ask">identify the author to confirm</span>`;
      return `<li><div><div class="label">${esc(pr ? pr.label : '')}</div><div class="quote">${esc(ev.payload.quote)}</div></div>${btn}</li>`;
    }).join('');
    html += `<div class="section rise" style="--i:${i++}"><h3>Problem evidence, in their words</h3><ul class="obs evidence">${rows}</ul></div>`;
  }
  const decided = current.decision;
  const word = decided ? decided.payload.verdict : r.verdict;
  html += `<div class="verdict section rise${decided ? ' is-decided' : ''}" style="--i:${i++}">
    <div class="word">${esc(word)}</div>
    <ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="meta decided-line">${decided ? `Jay decided <b>${esc(decided.payload.verdict)}</b>${decided.payload.agreedWithSystem ? ', as proposed' : `, overriding ${esc(r.verdict)}`}` : `proposed ${sampleBadge}`}</p>
    ${decided ? '' : `<div class="keys"><button class="key" data-decide="COMMENT"><kbd>C</kbd> Comment</button><button class="key" data-decide="SAVE"><kbd>S</kbd> Save</button><button class="key" data-decide="SCROLL"><kbd>X</kbd> Scroll</button></div>`}
  </div>`;
  if (decided && decided.payload.verdict === 'COMMENT') {
    if (current.posted) {
      html += `<div class="draft section"><p class="meta"><span class="badge is-live">posted by Jay</span> recorded as an action. When they respond, record it under Open loops.</p></div>`;
    } else {
      html += `<div class="draft section"><h3>Draft, in Jay's voice <span class="badge">${current.draft ? (current.draft.sample ? 'sample draft' : 'drafted by system, not sent') : 'drafting'}</span></h3>
        <textarea id="draft-text" aria-label="Comment draft">${esc(current.draft ? current.draft.comment : '')}</textarea>
        <div class="foot"><button class="primary" id="mark-posted" ${current.draft ? '' : 'disabled'}>Copy and mark as posted</button><span class="meta" id="draft-status">${current.draft ? 'edit it, post it in LinkedIn yourself, then mark it here' : ''}</span></div></div>`;
    }
  }
  if (decided && decided.payload.verdict === 'SAVE') html += `<div class="section"><p class="meta"><span class="badge is-live">saved</span> recorded as an action.</p></div>`;
  if (decided && decided.payload.verdict === 'SCROLL') html += `<div class="section"><p class="meta">recorded. Nothing else happens.</p></div>`;
  if (pid) {
    const p = C.proposeRungChange(store.eventsFor(pid));
    if (p.kind === 'needs_jay') html += `<div class="section"><button class="row-btn" data-confirm-rung="${pid}">Evidence supports rung ${p.to}, ${esc(C.RUNGS[p.to])}. Confirm <span class="badge is-ask">only Jay can</span></button></div>`;
  }
  el.innerHTML = html;
}

function renderLoops() {
  const el = $('#loops');
  const loops = C.openLoops(store);
  if (!loops.length) { el.innerHTML = `<li class="empty">No open loops. Every action has a recorded response, or there are no actions yet.</li>`; return; }
  el.innerHTML = loops.map(({ artifact, action, person, days }) => `<li>
    <div class="l1">${person ? `<button class="name plain" data-open="${person.id}">${esc(person.displayName)}</button>` : '<span class="name dim">unknown author</span>'}<span class="meta">Jay ${esc(action.payload.kind)} <b>${days}</b>d ago${artifact.url ? ` · <a class="linkish" href="${esc(artifact.url)}" target="_blank" rel="noopener">open</a>` : ''}</span></div>
    <div class="l2">${['reply', 'like', 'dm', 'connection_accepted', 'meeting_booked', 'none'].map((k) => `<button class="row-btn" data-respond="${artifact.id}" data-kind="${k}">${k.replace('_', ' ')}</button>`).join('')}<label class="check"><input type="checkbox" data-asks="${artifact.id}"> asked about QB</label></div>
  </li>`).join('');
}

function renderPeople() {
  const el = $('#people');
  const rows = C.peopleTable(store);
  $('#people-count').textContent = rows.length ? `${rows.length}` : '';
  if (!rows.length) { el.innerHTML = `<li class="empty">No one on file. The first person appears when you identify an author.</li>`; return; }
  el.innerHTML = rows.map((r) => `<li><div class="l1"><button class="name plain" data-open="${r.person.id}">${esc(r.person.displayName)}</button><span class="meta">${esc(r.company ? r.company.name : r.person.title || '')}</span></div>
    <div class="l2"><span class="meta">${ladderHtml(r.rung, { flare: flarePersonId === r.person.id })} rung <b>${r.rung ?? '–'}</b> · <b>${r.events}</b> events${r.lastAt ? ` · last ${esc(r.lastAt.slice(0, 10))}` : ''}</span></div></li>`).join('');
  flarePersonId = null;
}

function renderProblems() {
  const el = $('#problems');
  const rows = C.problemTable(store);
  if (!rows.length) { el.innerHTML = `<li class="empty">No problems on file. They arrive as quoted evidence and count only when Jay confirms them.</li>`; return; }
  el.innerHTML = rows.map((r) => `<li><div class="l1"><span class="name">${esc(r.problem.label)}</span></div><div class="l2"><span class="meta"><b>${r.confirmed}</b> confirmed · ${r.proposed} proposed · <b>${r.people}</b> ${r.people === 1 ? 'person' : 'people'}</span></div></li>`).join('');
}

function renderDossier(personId) {
  const d = $('#dossier'); const p = store.person(personId);
  if (!p) { closeDossier(); return; }
  openPersonId = personId;
  const co = p.companyId ? store.company(p.companyId) : null;
  const events = store.eventsFor(personId);
  const rung = C.currentRung(events);
  const prop = C.proposeRungChange(events);
  const confirmed = events.filter((e) => e.kind === 'problem_evidence' && e.actor === 'jay');
  const inter = events.filter((e) => ['action', 'response_observed'].includes(e.kind));
  const last = inter[inter.length - 1];
  const label = (e) => {
    const who = e.kind === 'response_observed' ? 'they' : e.actor === 'jay' ? 'Jay' : 'system';
    const what = e.kind === 'action' ? `${e.payload.kind}${e.payload.text ? `: “${esc(e.payload.text)}”` : ''}`
      : e.kind === 'response_observed' ? `${e.payload.kind.replace('_', ' ')}${e.payload.asksAboutQb ? ', asked about QB' : ''}${e.payload.text ? `: “${esc(e.payload.text)}”` : ''}`
      : e.kind === 'decision' ? `decided ${e.payload.verdict}${e.payload.agreedWithSystem === false ? ' (override)' : ''}`
      : e.kind === 'recommendation' ? `proposed ${e.payload.verdict}`
      : e.kind === 'problem_evidence' ? `${e.actor === 'jay' ? 'confirmed' : 'proposed'} evidence: “${esc(e.payload.quote)}”`
      : e.kind === 'rung_changed' ? `rung ${e.payload.from} → ${e.payload.to}, ${esc(C.RUNGS[e.payload.to])}`
      : e.kind === 'observation' ? esc(e.payload.text)
      : e.kind === 'context_retrieved' ? `carried ${e.payload.eventIds.length} events`
      : e.kind === 'author_resolved' ? `identified by ${e.payload.how}`
      : e.kind.replace('_', ' ');
    return `<li class="${e.kind === 'response_observed' ? 'is-external' : e.actor === 'jay' ? 'is-jay' : ''}"><span class="meta when">${esc(e.at.slice(0, 10))} · ${who}</span>${what}</li>`;
  };
  d.innerHTML = `<div class="head"><div><h2>${esc(p.displayName)}</h2><p class="meta">${esc([p.title, co && co.name].filter(Boolean).join(', '))}${p.linkedinUrl ? ` · <a class="linkish" href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">profile</a>` : ''}</p></div><button class="close" aria-label="Close" data-close>×</button></div>
    <div class="block"><h3>Evidence ladder</h3>${ladderHtml(rung, { lg: true, flare: flarePersonId === personId })}<p class="meta" style="margin-top:8px">rung <b>${rung ?? '–'}</b>${rung !== null ? `, ${esc(C.RUNGS[rung])}` : ''}${prop.kind === 'needs_jay' ? ` · <button class="row-btn" data-confirm-rung="${p.id}">evidence supports rung ${prop.to}, confirm</button>` : ''}</p>
      <div class="ladder-legend">${C.RUNGS.map((n, i) => `<span class="meta">${i} ${esc(n)}</span>`).join('')}</div></div>
    <div class="block"><h3>Ball</h3><p class="meta">${last ? `last move was ${last.kind === 'action' ? 'ours' : 'theirs'}, <b>${C.daysBetween(last.at, store.now())}</b>d ago. Next move is ${last.kind === 'action' ? 'theirs' : 'ours'}.` : 'no moves yet'}</p></div>
    <div class="block"><h3>Problems they demonstrated, confirmed by Jay</h3>${confirmed.length ? `<ul class="list">${confirmed.map((e) => { const pr = store.problem(e.problemId); return `<li><div class="l1"><span class="name">${esc(pr ? pr.label : '')}</span></div><div class="l2"><span class="quiet">“${esc(e.payload.quote)}”</span></div></li>`; }).join('')}</ul>` : '<p class="meta">none confirmed</p>'}</div>
    <div class="block"><h3>Everything on file, newest first</h3><ul class="timeline">${events.slice().reverse().map(label).join('')}</ul></div>`;
  d.classList.add('is-open');
  flarePersonId = null;
}
function closeDossier() { openPersonId = null; $('#dossier').classList.remove('is-open'); }

/* ---------- example mode ---------- */
const SAMPLE_DRAFT = 'Five people and two re-typings is the real cost, not the portal. When the vendor goes quiet, who is the first person whose day gets worse, and how long after?';
function sampleReading(text) {
  const known = /priya/i.test(text || '');
  return {
    author: { name: 'Priya Natarajan', linkedinUrl: 'https://www.linkedin.com/in/priya-natarajan-example', company: 'Harborline Property Group', title: 'Director of Operations', confidence: 0.95 },
    isQuestion: true, inLane: true,
    observations: known
      ? ['She mapped the handoff since her last post: five people, three systems, two re-typings.', 'Vendor confirmations arrive by text to whoever called; the gap has no owner.', 'She rules out another portal before anyone can pitch one.']
      : ['A question to peers about a specific failure, with the systems named.'],
    problemEvidence: [{ label: 'Maintenance requests lost between portal, vendor and on-site team', quote: 'two of those steps are someone re-typing what the last person wrote' }],
    verdict: 'COMMENT',
    reasons: ['A direct question, inside QB\'s lane', 'Second post on the same problem, now with a map', 'She asked who solved it, not what to buy'],
    rulesApplied: [],
  };
}

/* ---------- import / export ---------- */
function exportLog() {
  const blob = new Blob([store.export()], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `qb-operator-${mode}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importLog(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!data || !Array.isArray(data.events)) throw new Error('not an operator log');
      if (!window.confirm(`Replace the ${mode} log in this browser with ${data.events.length} events from the file?`)) return;
      store.replaceState(data); current = null; closeDossier(); renderAll();
    } catch (e) { notice(`Import failed: ${e.message}`); }
  };
  reader.readAsText(file);
}

/* ---------- wiring ---------- */
function setMode(next) {
  if (next === mode) return;
  mode = next; localStorage.setItem(MODE_KEY, mode);
  openStore(); current = null; closeDossier(); renderAll();
  notice(mode === 'example' ? 'Example mode. Fictional people, fictional history, kept apart from your real log. Readings still use the model when it is configured.' : '', 'is-example');
}

document.addEventListener('DOMContentLoaded', () => {
  openStore();
  $('#mode-real').addEventListener('click', () => setMode('real'));
  $('#mode-example').addEventListener('click', () => setMode('example'));
  $('#read').addEventListener('click', capture);
  $('#set-key').addEventListener('click', askKey);
  $('#export').addEventListener('click', exportLog);
  $('#import').addEventListener('change', (e) => { if (e.target.files[0]) importLog(e.target.files[0]); e.target.value = ''; });
  $('#load-example').addEventListener('click', () => { C.seedExample(store); renderAll(); notice('Example history loaded: two fictional people, one confirmed problem, one open loop.', 'is-example'); });
  $('#paste-example').addEventListener('click', () => { $('#artifact-input').value = C.EXAMPLE_ARTIFACT; $('#artifact-input').focus(); });
  $('#artifact-input').addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') capture(); });

  const cap = $('#capture');
  cap.addEventListener('dragover', (e) => { e.preventDefault(); cap.classList.add('is-over'); });
  cap.addEventListener('dragleave', () => cap.classList.remove('is-over'));
  cap.addEventListener('drop', (e) => { e.preventDefault(); cap.classList.remove('is-over'); if (e.dataTransfer.files[0]) setImage(e.dataTransfer.files[0]); });
  document.addEventListener('paste', (e) => { const f = [...(e.clipboardData.files || [])][0]; if (f) { e.preventDefault(); setImage(f); } });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-decide],[data-open],[data-close],[data-confirm-evidence],[data-confirm-rung],[data-respond],[data-link-existing],[data-create-person],[data-link-candidate],#mark-posted');
    if (!t) return;
    if (t.dataset.decide) decide(t.dataset.decide);
    else if (t.dataset.open) renderDossier(t.dataset.open);
    else if (t.hasAttribute('data-close')) closeDossier();
    else if (t.dataset.confirmEvidence) confirmEvidence(t.dataset.confirmEvidence);
    else if (t.dataset.confirmRung) confirmRung(t.dataset.confirmRung);
    else if (t.dataset.respond) { const asks = $(`[data-asks="${t.dataset.respond}"]`); recordResponse(t.dataset.respond, t.dataset.kind, asks && asks.checked, null); }
    else if (t.hasAttribute('data-link-existing')) linkExisting();
    else if (t.hasAttribute('data-create-person')) createPersonFromGuess();
    else if (t.dataset.linkCandidate) { const p = store.person(t.dataset.linkCandidate); if (p) { if (current.result && current.result.author.name) store.addAlias(p.id, current.result.author.name, 'name', 1); linkPerson(p, 'alias', 1, 'jay'); renderAll(); } }
    else if (t.id === 'mark-posted') markPosted();
  });
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input') return;
    if (e.key === 'Escape') { closeDossier(); return; }
    if (!current || !current.result || current.decision) return;
    const k = e.key.toLowerCase();
    if (k === 'c') decide('COMMENT'); else if (k === 's') decide('SAVE'); else if (k === 'x') decide('SCROLL');
  });

  renderAll();
  if (mode === 'example') notice('Example mode. Fictional people, fictional history, kept apart from your real log.', 'is-example');
});
