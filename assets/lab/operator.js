// QUIET BANDS — OPERATOR v0.2 · the instrument
// A canvas of people, companies, problems and evidence, projected from the log; a camera
// that moves from the whole picture into one dossier; a panel that reads one artifact at a
// time. Everything that decides anything lives in operator-core.js and is tested. This file
// is wiring and render.
import * as C from '/assets/lab/operator-core.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SVG = 'http://www.w3.org/2000/svg';
const MODE_KEY = 'qb-operator-mode', KEY_KEY = 'qb-operator-key';
const API = '/.netlify/functions/operator-interpret';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let mode = localStorage.getItem(MODE_KEY) === 'example' ? 'example' : 'real';
let store;
let current = null;        // the artifact being read, if any
let pendingImage = null;
let selectedId = null;     // the live node
let flareIds = new Set();  // nodes whose state just changed
let noticeTimer = null;

/* ---------- persistence ---------- */
function persistFor(ns) {
  return {
    load() { try { const raw = localStorage.getItem(ns); return raw ? JSON.parse(raw) : null; } catch { return null; } },
    save(s) { try { localStorage.setItem(ns, JSON.stringify(s)); } catch (e) { notice(`Could not save in this browser: ${e.message}`); } },
  };
}
function openStore() { store = C.createStore(persistFor(`qb-operator-${mode}`)); }

function notice(text, ms = 5000) {
  const n = $('#notice'); clearTimeout(noticeTimer);
  n.hidden = !text; n.textContent = text || '';
  if (text && ms) noticeTimer = setTimeout(() => { n.hidden = true; }, ms);
}

/* ---------- API ---------- */
async function callApi(payload) {
  const key = localStorage.getItem(KEY_KEY) || '';
  let res;
  try { res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-operator-key': key }, body: JSON.stringify(payload) }); }
  catch (e) { return { ok: false, reason: 'network', detail: e.message }; }
  let body = null; try { body = await res.json(); } catch { body = null; }
  if (res.status === 503) return { ok: false, reason: 'config', detail: body && body.detail };
  if (res.status === 401) return { ok: false, reason: 'unauthorised' };
  if (res.status === 404) return { ok: false, reason: 'config', detail: 'the model function is not deployed here' };
  return body || { ok: false, reason: `http ${res.status}` };
}
function askKey() {
  const k = window.prompt('Access key for the model (OPERATOR_KEY on the site). Stored only in this browser.', localStorage.getItem(KEY_KEY) || '');
  if (k !== null) { localStorage.setItem(KEY_KEY, k.trim()); notice('Key stored in this browser.'); }
}

/* =====================================================================
   THE CANVAS
   ===================================================================== */
const canvas = $('#canvas'), gEdges = $('#edges'), gNodes = $('#nodes'), gLabels = $('#labels');
let model = { nodes: [], edges: [] };
let positions = {};
let alpha = 0;                 // layout heat; 0 means still
let hotTicks = 0;
let view = null, target = null; // viewBox rects
let userView = null;           // set by wheel/drag; cleared by selection or Esc
let rafId = null;
const known = { nodes: new Set(), edges: new Set() };
const el = { nodes: new Map(), edges: new Map(), labels: new Map() };

const aspect = () => Math.max(0.4, canvas.clientWidth / Math.max(1, canvas.clientHeight));
const panelFrac = () => ($('#panel').classList.contains('is-hidden') ? 0 : Math.min(0.6, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--panel')) / Math.max(1, canvas.clientWidth)));

function rebuildModel({ reheat = 0.35 } = {}) {
  model = C.graphModel(store);
  const ids = new Set(model.nodes.map((n) => n.id));
  for (const id of Object.keys(positions)) if (!ids.has(id)) delete positions[id];
  let fresh = false;
  for (const n of model.nodes) if (!positions[n.id]) { const s = C.seedPosition(n, positions, model.edges); positions[n.id] = { x: s.x, y: s.y, vx: 0, vy: 0 }; fresh = true; }
  if (fresh || alpha === 0 && !Object.keys(positions).length) { alpha = Math.max(alpha, reheat); hotTicks = 0; }
  renderGraph();
  tick();
}

/** Create or update SVG elements for the model. Positions are applied in place(). */
function renderGraph() {
  const nodeIds = new Set(), edgeIds = new Set();
  for (const e of model.edges) {
    edgeIds.add(e.id);
    let line = el.edges.get(e.id);
    if (!line) {
      line = document.createElementNS(SVG, 'line'); line.setAttribute('pathLength', '1');
      if (known.nodes.size && !reduced) line.classList.add('draw');
      gEdges.appendChild(line); el.edges.set(e.id, line);
    }
    line.setAttribute('class', `edge ${e.kind}${e.confirmed ? ' is-confirmed' : ''}${line.classList.contains('draw') ? ' draw' : ''}`);
    line.style.strokeWidth = e.kind === 'evidence' ? `${1 + Math.min(2, (e.weight - 1) * 0.6)}px` : '';
    line.dataset.source = e.source; line.dataset.target = e.target;
  }
  for (const [id, line] of el.edges) if (!edgeIds.has(id)) { line.remove(); el.edges.delete(id); }

  for (const n of model.nodes) {
    nodeIds.add(n.id);
    let g = el.nodes.get(n.id);
    if (!g) {
      g = document.createElementNS(SVG, 'g'); g.dataset.id = n.id;
      if (known.nodes.size && !reduced) g.classList.add('enter');
      gNodes.appendChild(g); el.nodes.set(n.id, g);
    }
    g.setAttribute('class', `node ${n.kind}${n.kind === 'artifact' && n.decided ? ' is-decided' : ''}${selectedId === n.id ? ' is-live' : ''}${flareIds.has(n.id) ? ' flare' : ''}${g.classList.contains('enter') ? ' enter' : ''}`);
    g.innerHTML = nodeMarkup(n);
    if (n.kind !== 'artifact') {
      let t = el.labels.get(n.id);
      if (!t) { t = document.createElementNS(SVG, 'text'); gLabels.appendChild(t); el.labels.set(n.id, t); }
      t.setAttribute('class', n.kind); t.textContent = n.kind === 'problem' ? shorten(n.label, 46) : n.label;
    }
  }
  for (const [id, g] of el.nodes) if (!nodeIds.has(id)) { g.remove(); el.nodes.delete(id); const t = el.labels.get(id); if (t) { t.remove(); el.labels.delete(id); } }
  known.nodes = nodeIds; known.edges = edgeIds;
  flareIds = new Set();
  applyFocusDimming();
  place();
}

function shorten(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function nodeMarkup(n) {
  const r = C.LAYOUT.size[n.kind];
  if (n.kind === 'person') {
    const segs = C.RUNGS.map((_, i) => {
      const a0 = -Math.PI / 2 + (i / 6) * Math.PI * 2 + 0.09, a1 = -Math.PI / 2 + ((i + 1) / 6) * Math.PI * 2 - 0.09, R = r + 4.5;
      const on = n.rung !== null && i <= n.rung, top = n.rung !== null && n.rung >= 1 && i === n.rung;
      return `<path class="seg${on ? ' is-on' : ''}${top ? ' is-top' : ''}" d="M${(Math.cos(a0) * R).toFixed(2)},${(Math.sin(a0) * R).toFixed(2)} A${R},${R} 0 0 1 ${(Math.cos(a1) * R).toFixed(2)},${(Math.sin(a1) * R).toFixed(2)}"/>`;
    }).join('');
    return `<circle class="hit" r="${r + 10}"/>${n.openLoop ? `<circle class="loop" r="${r + 9}"/>` : ''}${segs}<circle class="core" r="${r}"/>${n.rung >= 1 ? `<circle class="pip" r="2"/>` : ''}`;
  }
  if (n.kind === 'problem') { const rr = Math.min(14, r + 2 * n.confirmed); return `<circle class="hit" r="${rr + 8}"/><circle class="core" r="${rr}"/>`; }
  if (n.kind === 'company') return `<circle class="hit" r="${r + 8}"/><rect class="core" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" transform="rotate(45)"/>`;
  return `<circle class="hit" r="${r + 6}"/><circle class="core" r="${r}"/>`;
}

/** The lit set for the selected node: it, its neighbours, and the edges between. */
function applyFocusDimming() {
  if (!selectedId) { for (const g of el.nodes.values()) g.classList.remove('is-dim'); for (const l of el.edges.values()) { l.classList.remove('is-dim', 'is-lit'); } return; }
  const lit = new Set([selectedId]);
  for (const e of model.edges) { if (e.source === selectedId) lit.add(e.target); if (e.target === selectedId) lit.add(e.source); }
  // one hop more for artifacts, so a person lights their problems and a problem lights its people
  for (const e of model.edges) { if (lit.has(e.source) && model.nodes.find((n) => n.id === e.source)?.kind === 'artifact') lit.add(e.target); if (lit.has(e.target) && model.nodes.find((n) => n.id === e.target)?.kind === 'artifact') lit.add(e.source); }
  for (const [id, g] of el.nodes) g.classList.toggle('is-dim', !lit.has(id));
  for (const [id, l] of el.edges) { const e = model.edges.find((x) => x.id === id); const on = e && lit.has(e.source) && lit.has(e.target); l.classList.toggle('is-dim', !on); l.classList.toggle('is-lit', Boolean(on) && (e.source === selectedId || e.target === selectedId)); }
}

/** Write positions into the DOM and scale labels against the camera. */
function place() {
  const k = view ? view.w / Math.max(1, canvas.clientWidth) : 1; // world units per px
  for (const [id, g] of el.nodes) { const p = positions[id]; if (p) g.setAttribute('transform', `translate(${p.x.toFixed(2)},${p.y.toFixed(2)})`); }
  for (const [id, line] of el.edges) { const a = positions[line.dataset.source], b = positions[line.dataset.target]; if (a && b) { line.setAttribute('x1', a.x.toFixed(2)); line.setAttribute('y1', a.y.toFixed(2)); line.setAttribute('x2', b.x.toFixed(2)); line.setAttribute('y2', b.y.toFixed(2)); } }
  for (const [id, t] of el.labels) {
    const p = positions[id]; if (!p) continue;
    const n = model.nodes.find((x) => x.id === id);
    const fs = 12 * k;
    t.style.fontSize = `${fs.toFixed(2)}px`;
    if (n.kind === 'problem') {
      const r = Math.min(14, 7 + 2 * n.confirmed);
      t.setAttribute('x', p.x.toFixed(2)); t.setAttribute('y', (p.y + r + fs * 1.25).toFixed(2));
    } else {
      const r = C.LAYOUT.size[n.kind] + 5;
      t.setAttribute('x', (p.x + r + 5 * k).toFixed(2)); t.setAttribute('y', (p.y + fs * 0.35).toFixed(2));
    }
  }
}

function homeRect() { return C.cameraRect({ focus: null, positions, aspect: aspect(), panelFrac: panelFrac() }); }
function focusRect(id) { return C.cameraRect({ focus: positions[id], positions, aspect: aspect(), panelFrac: panelFrac(), zoomW: 420 }); }
function setTarget(rect, { immediate = false } = {}) { target = rect; if (immediate || !view || reduced) { view = { ...rect }; } tick(); }

/** One animation frame: layout if hot, camera if moving. Stops itself when both are still. */
function tick() {
  if (rafId) return;
  const step = () => {
    rafId = null;
    let busy = false;
    if (alpha > 0) {
      const speed = C.layoutTick(model, positions, { alpha });
      hotTicks += 1;
      alpha = speed < 0.05 || hotTicks > 260 ? 0 : Math.max(0.06, alpha * 0.975);
      if (!userView) target = selectedId ? focusRect(selectedId) : homeRect();
      busy = alpha > 0;
    }
    if (view && target) {
      if (!C.rectClose(view, target, 0.08)) { view = reduced ? { ...target } : C.lerpRect(view, target, 0.12); busy = true; }
      else view = { ...target };
      canvas.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    }
    place();
    $('#sim-badge').textContent = alpha > 0 ? 'settling' : 'still';
    if (busy) rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}

function select(id, { camera = true } = {}) {
  selectedId = id; userView = null;
  for (const [nid, g] of el.nodes) g.classList.toggle('is-live', nid === id);
  applyFocusDimming();
  if (camera) setTarget(id ? focusRect(id) : homeRect());
  renderPanel();
}
function goHome() { current = null; select(null); }
function togglePanel(force) {
  const panel = $('#panel'); const hide = force === undefined ? !panel.classList.contains('is-hidden') : force;
  panel.classList.toggle('is-hidden', hide); $('#toggle-panel').textContent = hide ? 'Show panel' : 'Hide panel';
  if (!userView) setTarget(selectedId ? focusRect(selectedId) : homeRect());
}

/* wheel zoom about the cursor, drag to pan, double-click home */
canvas.addEventListener('wheel', (e) => {
  if (!view) return; e.preventDefault();
  const rect = canvas.getBoundingClientRect(); const fx = (e.clientX - rect.left) / rect.width, fy = (e.clientY - rect.top) / rect.height;
  const f = Math.exp(e.deltaY * 0.0015); const w = Math.min(Math.max(view.w * f, 160), 6000), h = w / aspect();
  const nx = view.x + fx * (view.w - w), ny = view.y + fy * (view.h - h);
  userView = { x: nx, y: ny, w, h }; setTarget(userView, { immediate: true });
}, { passive: false });
let drag = null;
canvas.addEventListener('pointerdown', (e) => { if (e.target.closest('.node')) return; drag = { x: e.clientX, y: e.clientY, view: { ...view }, moved: false }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-panning'); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  const k = drag.view.w / canvas.clientWidth; userView = { ...drag.view, x: drag.view.x - dx * k, y: drag.view.y - dy * k }; setTarget(userView, { immediate: true });
});
canvas.addEventListener('pointerup', (e) => { const moved = drag && drag.moved; drag = null; canvas.classList.remove('is-panning'); if (!moved && !e.target.closest('.node')) goHome(); });
canvas.addEventListener('dblclick', (e) => { if (!e.target.closest('.node')) goHome(); });
canvas.addEventListener('click', (e) => { const g = e.target.closest('.node'); if (g) { const n = model.nodes.find((x) => x.id === g.dataset.id); if (n && n.kind === 'artifact') openArtifact(n.id); else select(g.dataset.id); } });
window.addEventListener('resize', () => { if (!userView) setTarget(selectedId ? focusRect(selectedId) : homeRect(), { immediate: true }); });

/* =====================================================================
   THE PANEL
   ===================================================================== */
function ladderHtml(rung, { lg = false, flare = false } = {}) {
  const cells = C.RUNGS.map((name, i) => {
    const on = rung !== null && i <= rung; const top = rung !== null && rung >= 1 && i === rung;
    return `<span class="cell${on ? ' is-on' : ''}${top ? ' is-live' : ''}" title="${i} ${esc(name)}"></span>`;
  }).join('');
  return `<span class="ladder${lg ? ' lg' : ''}" role="img" aria-label="Rung ${rung ?? 'none'}">${cells}</span>`;
}
function personBtn(id) { const p = store.person(id); return p ? `<button class="name plain" data-select="${p.id}">${esc(p.displayName)}</button>` : '<span class="dim">unknown</span>'; }

function renderPanel() {
  const panel = $('#panel');
  renderCounts();
  if (current) { panel.innerHTML = readingHtml(); return; }
  const n = selectedId ? model.nodes.find((x) => x.id === selectedId) : null;
  if (!n) { panel.innerHTML = pictureHtml(); return; }
  if (n.kind === 'person') panel.innerHTML = personHtml(n.id);
  else if (n.kind === 'problem') panel.innerHTML = problemHtml(n.id);
  else if (n.kind === 'company') panel.innerHTML = companyHtml(n.id);
  else panel.innerHTML = artifactHtml(n.id);
}

function renderCounts() {
  const people = store.state.persons.length, confirmed = C.problemTable(store).filter((r) => r.confirmed > 0).length, loops = C.openLoops(store).length;
  $('#counts').innerHTML = `<span><b>${people}</b> people</span><span><b>${confirmed}</b> problems confirmed</span><span><b>${loops}</b> open loops</span>`;
  $('#store-badge').innerHTML = mode === 'example' ? `example data, fictional, separate from your log · <b>${store.events().length}</b> events` : `stored in this browser · <b>${store.events().length}</b> events`;
  $('#mode-real').setAttribute('aria-pressed', String(mode === 'real')); $('#mode-example').setAttribute('aria-pressed', String(mode === 'example'));
  $('#paste-example').hidden = mode !== 'example';
}

function pictureHtml() {
  const people = C.peopleTable(store), problems = C.problemTable(store), loops = C.openLoops(store);
  if (!store.events().length) {
    return `<h2>The picture</h2><p class="empty" style="margin-top:10px">Nothing on file. ${mode === 'example' ? 'Load the example history to see what a few weeks of use looks like, or read a post.' : 'Read a post and the first person appears. The picture is only ever what the log holds.'}</p>
      <div class="block">${mode === 'example' ? `<button class="primary" data-load-example>Load the example history</button>` : `<button class="primary" data-open-sheet>Read a post<kbd>/</kbd></button>`}</div>`;
  }
  return `<h2>The picture</h2>
    <p class="meta" style="margin-top:6px">Problems sit at the centre. People orbit the problems they have shown. Dashed lines are evidence the system proposed; solid lines, evidence Jay confirmed. A dashed ring means the ball is theirs.</p>
    <div class="block"><h3>Problems <span>by confirmed evidence</span></h3><ul class="list">${problems.map((r) => `<li><div class="l1"><button class="name plain" data-select="${r.problem.id}">${esc(r.problem.label)}</button></div><div class="l2"><span class="meta"><b>${r.confirmed}</b> confirmed · ${r.proposed} proposed · <b>${r.people}</b> ${r.people === 1 ? 'person' : 'people'}</span></div></li>`).join('') || '<li class="empty">none yet</li>'}</ul></div>
    <div class="block"><h3>People <span>by rung</span></h3><ul class="list">${people.map((r) => `<li><div class="l1">${personBtn(r.person.id)}<span class="meta">${esc(r.company ? r.company.name : r.person.title || '')}</span></div><div class="l2"><span class="meta">${ladderHtml(r.rung)} rung <b>${r.rung ?? '–'}</b> · <b>${r.events}</b> events</span></div></li>`).join('')}</ul></div>
    <div class="block"><h3>Open loops <span>actions with no response yet</span></h3>${loopsHtml(loops)}</div>`;
}

function loopsHtml(loops) {
  if (!loops.length) return `<p class="empty">None. Every action has a recorded response, or there are no actions yet.</p>`;
  return `<ul class="list">${loops.map(({ artifact, action, person, days }) => `<li>
    <div class="l1">${person ? personBtn(person.id) : '<span class="dim">unknown author</span>'}<span class="meta">Jay ${esc(action.payload.kind)} <b>${days}</b>d ago · <button class="row-btn" data-open-artifact="${artifact.id}">post</button></span></div>
    <div class="l2">${['reply', 'like', 'dm', 'connection_accepted', 'meeting_booked', 'none'].map((k) => `<button class="row-btn" data-respond="${artifact.id}" data-kind="${k}">${k.replace('_', ' ')}</button>`).join('')}<label class="check"><input type="checkbox" data-asks="${artifact.id}"> asked about QB</label></div></li>`).join('')}</ul>`;
}

function personHtml(id) {
  const p = store.person(id); const co = p.companyId ? store.company(p.companyId) : null;
  const events = store.eventsFor(id); const rung = C.currentRung(events); const prop = C.proposeRungChange(events);
  const confirmed = events.filter((e) => e.kind === 'problem_evidence' && e.actor === 'jay');
  const inter = events.filter((e) => ['action', 'response_observed'].includes(e.kind)); const last = inter[inter.length - 1];
  const arts = store.state.artifacts.filter((a) => a.authorPersonId === id).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const loops = C.openLoops(store).filter((l) => l.person && l.person.id === id);
  return `<div class="head"><div><h2>${esc(p.displayName)}</h2><p class="meta">${esc([p.title, co && co.name].filter(Boolean).join(', '))}${p.linkedinUrl ? ` · <a class="linkish" style="min-height:0" href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">profile</a>` : ''}</p></div><button class="close" aria-label="Back to the picture" data-home>×</button></div>
    <div class="block"><h3>Evidence ladder</h3>${ladderHtml(rung, { lg: true })}<p class="meta" style="margin-top:8px">rung <b>${rung ?? '–'}</b>${rung !== null ? `, ${esc(C.RUNGS[rung])}` : ''}${prop.kind === 'needs_jay' ? ` · <button class="row-btn" data-confirm-rung="${p.id}">evidence supports rung ${prop.to}, confirm <span class="badge is-ask">only Jay can</span></button>` : ''}</p>
      <div class="ladder-legend">${C.RUNGS.map((n, i) => `<span class="meta">${i} ${esc(n)}</span>`).join('')}</div></div>
    <div class="block"><h3>Ball</h3><p class="meta">${last ? `last move was ${last.kind === 'action' ? 'ours' : 'theirs'}, <b>${C.daysBetween(last.at, store.now())}</b>d ago. Next move is ${last.kind === 'action' ? 'theirs' : 'ours'}.` : 'no moves yet'}</p>${loops.length ? loopsHtml(loops) : ''}</div>
    <div class="block"><h3>Problems they demonstrated <span>confirmed by Jay</span></h3>${confirmed.length ? `<ul class="list">${confirmed.map((e) => { const pr = store.problem(e.problemId); return `<li><div class="l1"><button class="name plain" data-select="${pr.id}">${esc(pr.label)}</button></div><div class="l2"><span class="quote">${esc(e.payload.quote)}</span></div></li>`; }).join('')}</ul>` : '<p class="empty">none confirmed</p>'}</div>
    <div class="block"><h3>Posts <span>${arts.length}</span></h3><ul class="list">${arts.map((a) => `<li><button class="name plain" data-open-artifact="${a.id}" style="font-weight:400;color:var(--line-2)">${esc(shorten(a.rawText.replace(/\s+/g, ' '), 90))}</button><div class="l2"><span class="meta">${esc(a.capturedAt.slice(0, 10))}</span></div></li>`).join('') || '<li class="empty">none</li>'}</ul></div>
    <div class="block"><h3>Everything on file <span>newest first</span></h3><ul class="timeline">${events.slice().reverse().map(timelineRow).join('')}</ul></div>`;
}

function timelineRow(e) {
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
}

function problemHtml(id) {
  const pr = store.problem(id); const evs = store.events().filter((e) => e.kind === 'problem_evidence' && e.problemId === id);
  const byPerson = new Map();
  for (const e of evs) { const k = e.personId || (store.artifact(e.artifactId)?.authorPersonId) || 'unknown'; const cur = byPerson.get(k) || { confirmed: null, proposed: [] }; if (e.actor === 'jay') cur.confirmed = e; else cur.proposed.push(e); byPerson.set(k, cur); }
  const row = C.problemTable(store).find((r) => r.problem.id === id);
  return `<div class="head"><div><h2>${esc(pr.label)}</h2><p class="meta"><b>${row.confirmed}</b> confirmed · ${row.proposed} proposed · <b>${row.people}</b> ${row.people === 1 ? 'person has' : 'people have'} shown it</p></div><button class="close" aria-label="Back to the picture" data-home>×</button></div>
    <div class="block"><h3>In their words</h3><ul class="list">${[...byPerson.entries()].map(([pid, v]) => { const e = v.confirmed || v.proposed[v.proposed.length - 1]; return `<li><div class="l1">${pid === 'unknown' ? '<span class="dim">unknown</span>' : personBtn(pid)}${v.confirmed ? '<span class="badge is-live">confirmed</span>' : '<span class="badge">proposed</span>'}</div><div class="l2"><span class="quote">${esc(e.payload.quote)}</span></div></li>`; }).join('')}</ul></div>`;
}

function companyHtml(id) {
  const co = store.company(id); const rows = C.peopleTable(store).filter((r) => r.person.companyId === id);
  return `<div class="head"><div><h2>${esc(co.name)}</h2><p class="meta"><b>${rows.length}</b> ${rows.length === 1 ? 'person' : 'people'} on file</p></div><button class="close" aria-label="Back to the picture" data-home>×</button></div>
    <div class="block"><h3>People</h3><ul class="list">${rows.map((r) => `<li><div class="l1">${personBtn(r.person.id)}<span class="meta">${esc(r.person.title || '')}</span></div><div class="l2"><span class="meta">${ladderHtml(r.rung)} rung <b>${r.rung ?? '–'}</b></span></div></li>`).join('')}</ul></div>`;
}

function artifactHtml(id) {
  const a = store.artifact(id); const evs = store.eventsForArtifact(id);
  const rec = evs.filter((e) => e.kind === 'recommendation').pop(), dec = evs.filter((e) => e.kind === 'decision').pop();
  const ev = evs.filter((e) => e.kind === 'problem_evidence');
  const loop = C.openLoops(store).find((l) => l.artifact.id === id);
  return `<div class="head"><div><h2 style="font-size:16px">Post${a.authorPersonId ? ` by ${esc(store.person(a.authorPersonId)?.displayName || '')}` : ''}</h2><p class="meta">${esc(a.capturedAt.slice(0, 10))} · ${esc(a.sourceKind.replace('_', ' '))}${a.url ? ` · <a class="linkish" style="min-height:0" href="${esc(a.url)}" target="_blank" rel="noopener">open</a>` : ''}</p></div><button class="close" aria-label="Back to the picture" data-home>×</button></div>
    <div class="block"><div class="text">${esc(a.rawText)}</div></div>
    ${rec ? `<div class="block"><h3>Reading</h3><p>${dec ? `Jay decided <b class="live">${esc(dec.payload.verdict)}</b>${dec.payload.agreedWithSystem ? ', as proposed' : `, overriding ${esc(rec.payload.verdict)}`}` : `proposed ${esc(rec.payload.verdict)}`}</p><ul class="verdict reasons" style="margin-top:6px;border:0;padding:0">${(rec.payload.reasons || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
    ${ev.length ? `<div class="block"><h3>Problem evidence</h3><ul class="obs evidence">${ev.filter((e) => e.actor === 'system').map((e) => { const pr = store.problem(e.problemId); const conf = ev.some((x) => x.actor === 'jay' && x.evidenceEventId === e.id); return `<li><div><div class="label">${esc(pr?.label || '')}</div><div class="quote">${esc(e.payload.quote)}</div></div>${conf ? '<span class="badge is-live">confirmed by Jay</span>' : a.authorPersonId ? `<button class="row-btn" data-confirm-evidence="${e.id}">Confirm <span class="badge">proposed</span></button>` : '<span class="badge is-ask">identify the author first</span>'}</li>`; }).join('')}</ul></div>` : ''}
    ${loop ? `<div class="block"><h3>Open loop <span>Jay ${esc(loop.action.payload.kind)} ${loop.days}d ago</span></h3>${loopsHtml([loop])}</div>` : ''}`;
}

/* ---------- the reading, inside the panel ---------- */
function readingHtml() {
  const a = current.artifact;
  let html = `<div class="head"><div><h2 style="font-size:16px">Reading</h2><p class="meta">${esc(a.capturedAt.slice(0, 16).replace('T', ' '))} · ${esc(a.sourceKind.replace('_', ' '))} · hash ${esc(a.contentHash)}</p></div><button class="close" aria-label="Back to the picture" data-home>×</button></div>`;
  html += `<div class="block"><div class="l1" style="display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline">${authorLine()}</div></div>`;
  html += `<div class="block"><div class="text">${esc(current.text || '')}${current.imageDataUrl ? `<img src="${current.imageDataUrl}" alt="the screenshot being read" style="max-width:100%;display:block;margin-top:8px;border:1px solid var(--rule);border-radius:4px">` : ''}</div></div>`;
  if (!current.result) {
    if (current.error) html += `<div class="block"><p class="empty">${current.error}</p></div>`;
    else html += `<div class="block"><div class="busy"><span class="tick"></span><span>Reading<span class="meta" id="busy-ms"></span></span></div></div>`;
    return html;
  }
  const r = current.result, ctx = current.context, pid = current.person ? current.person.id : null;
  const rung = pid ? C.currentRung(store.eventsFor(pid)) : null;
  const ctxLine = ctx.status === 'ok' ? `<b>${ctx.eventIds.length}</b> prior events carried in${ctx.truncated ? ', trimmed to budget' : ''} · rung ${rung} ${esc(C.RUNGS[rung] || '')} ${ladderHtml(rung)}` : current.person ? 'known person, <b>no</b> prior events' : '<b>no</b> prior context, first time seen';
  const sampleBadge = current.sample ? '<span class="badge is-ask">sample reading, not the model</span>' : `<span class="badge">${esc(current.model || 'model')}${current.ms ? ` · ${(current.ms / 1000).toFixed(1)}s` : ''}</span>`;
  let i = 0;
  html += `<div class="block rise" style="--i:${i++}"><h3>Context</h3><p class="meta">${ctxLine}</p></div>`;
  html += `<div class="block rise" style="--i:${i++}"><h3>Noticed</h3><ul class="obs">${r.observations.map((o) => `<li>${esc(o)}</li>`).join('') || '<li class="dim">Nothing worth noticing.</li>'}</ul></div>`;
  if (current.evidenceEvents.length) {
    html += `<div class="block rise" style="--i:${i++}"><h3>Problem evidence <span>in their words</span></h3><ul class="obs evidence">${current.evidenceEvents.map((ev) => { const pr = store.problem(ev.problemId); const confirmed = store.events().some((e) => e.kind === 'problem_evidence' && e.actor === 'jay' && e.evidenceEventId === ev.id); const btn = confirmed ? '<span class="badge is-live">confirmed by Jay</span>' : pid ? `<button class="row-btn" data-confirm-evidence="${ev.id}">Confirm <span class="badge">proposed</span></button>` : '<span class="badge is-ask">identify the author to confirm</span>'; return `<li><div><div class="label"><button class="name plain" data-select="${pr.id}" style="min-height:0;font-weight:500">${esc(pr.label)}</button></div><div class="quote">${esc(ev.payload.quote)}</div></div>${btn}</li>`; }).join('')}</ul></div>`;
  }
  const d = current.decision; const word = d ? d.payload.verdict : r.verdict;
  html += `<div class="verdict block rise${d ? ' is-decided' : ''}" style="--i:${i++}"><div class="word">${esc(word)}</div><ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="meta" style="margin-top:8px">${d ? `Jay decided <b>${esc(d.payload.verdict)}</b>${d.payload.agreedWithSystem ? ', as proposed' : `, overriding ${esc(r.verdict)}`}` : `proposed ${sampleBadge}`}</p>
    ${d ? '' : `<div class="keys"><button class="key" data-decide="COMMENT"><kbd>C</kbd> Comment</button><button class="key" data-decide="SAVE"><kbd>S</kbd> Save</button><button class="key" data-decide="SCROLL"><kbd>X</kbd> Scroll</button></div>`}</div>`;
  if (d && d.payload.verdict === 'COMMENT') {
    html += current.posted
      ? `<div class="block"><p class="meta"><span class="badge is-live">posted by Jay</span> recorded as an action. When they respond, record it from their dossier.</p></div>`
      : `<div class="block draft"><h3>Draft, in Jay's voice <span class="badge">${current.draft ? (current.draft.sample ? 'sample draft' : 'drafted by system, not sent') : 'drafting'}</span></h3><textarea id="draft-text" aria-label="Comment draft">${esc(current.draft ? current.draft.comment : '')}</textarea><div class="foot"><button class="primary" id="mark-posted" ${current.draft ? '' : 'disabled'}>Copy and mark as posted</button><span class="meta" id="draft-status">${current.draft ? 'edit it, post it in LinkedIn yourself, then mark it here' : ''}</span></div></div>`;
  }
  if (d && d.payload.verdict === 'SAVE') html += `<div class="block"><p class="meta"><span class="badge is-live">saved</span> recorded as an action.</p></div>`;
  if (d && d.payload.verdict === 'SCROLL') html += `<div class="block"><p class="meta">recorded. Nothing else happens.</p></div>`;
  if (pid) { const p = C.proposeRungChange(store.eventsFor(pid)); if (p.kind === 'needs_jay') html += `<div class="block"><button class="row-btn" data-confirm-rung="${pid}">Evidence supports rung ${p.to}, ${esc(C.RUNGS[p.to])}. Confirm <span class="badge is-ask">only Jay can</span></button></div>`; }
  if (d) html += `<div class="block"><button class="plain" data-home>Back to the picture</button></div>`;
  return html;
}

function authorLine() {
  const p = current.person;
  if (p) {
    const co = p.companyId ? store.company(p.companyId) : null; const how = current.resolution && current.resolution.how;
    const badge = how === 'url' ? 'resolved by profile URL' : how === 'alias' ? 'resolved by name' : how === 'manual' ? 'confirmed by Jay' : 'known';
    return `<button class="name plain" data-select="${p.id}" style="font-size:16px">${esc(p.displayName)}</button><span class="meta">${esc([p.title, co && co.name].filter(Boolean).join(', '))}</span><span class="badge">${badge}</span>`;
  }
  const g = current.result && current.result.author;
  if (g && (g.name || g.company)) {
    const conf = Math.round((g.confidence || 0) * 100); const cand = current.resolution && current.resolution.person;
    return `<span class="name" style="font-size:16px;font-weight:500">${esc(g.name || 'Unknown author')}</span><span class="meta">${esc([g.title, g.company].filter(Boolean).join(', '))}</span><span class="badge is-ask">guess, ${conf}% sure</span>${cand ? `<button class="row-btn" data-link-candidate="${cand.id}">This is ${esc(cand.displayName)}</button>` : ''}<button class="row-btn" data-link-existing>Link to someone on file</button><button class="row-btn" data-create-person>New person</button>`;
  }
  return `<span class="name dim" style="font-size:16px">Author not identified</span><span class="badge is-ask">first time seen</span>${current.result ? '<button class="row-btn" data-link-existing>Link to someone on file</button><button class="row-btn" data-create-person>New person</button>' : ''}`;
}

/* =====================================================================
   THE LOOP: capture → read → decide → act → record
   ===================================================================== */
function openSheet() { $('#sheet').classList.add('is-open'); setTimeout(() => $('#artifact-input').focus(), 50); }
function closeSheet() { $('#sheet').classList.remove('is-open'); }
function setImage(file) {
  if (!file || !/^image\/(png|jpeg|gif|webp)$/.test(file.type)) return;
  const reader = new FileReader();
  reader.onload = () => { const dataUrl = String(reader.result); pendingImage = { mediaType: file.type, data: dataUrl.split(',')[1], dataUrl }; $('#thumb').innerHTML = `<img class="thumb" src="${dataUrl}" alt="screenshot to read">`; $('#capture-meta').textContent = 'screenshot attached, read from the image, not stored'; };
  reader.readAsDataURL(file);
}

async function capture() {
  const text = $('#artifact-input').value.trim();
  if (!text && !pendingImage) { notice('Paste a post, a profile URL, or drop a screenshot first.'); return; }
  closeSheet();
  const url = C.extractLinkedIn(text);
  const sourceKind = pendingImage && !text ? 'screenshot' : pendingImage ? 'screenshot' : /^https?:\/\//.test(text) && !/\s/.test(text) ? 'url' : text ? 'linkedin_post' : 'pasted_text';
  const res0 = C.resolveAuthor({ text }, store);
  const artifact = store.addArtifact({ sourceKind, url, rawText: text || '(screenshot, not stored)', authorPersonId: res0.person ? res0.person.id : null, origin: mode });
  store.append({ kind: 'artifact_captured', actor: 'jay', artifactId: artifact.id, personId: res0.person ? res0.person.id : null, origin: mode, payload: { sourceKind, hasImage: Boolean(pendingImage) } });
  if (res0.person) store.append({ kind: 'author_resolved', actor: 'system', artifactId: artifact.id, personId: res0.person.id, origin: mode, payload: { how: res0.how, confidence: res0.confidence } });
  current = { artifact, text, imageDataUrl: pendingImage ? pendingImage.dataUrl : null, person: res0.person, resolution: res0, context: null, result: null, decision: null, draft: null, evidenceEvents: [], posted: false, sample: false, error: null };
  const img = pendingImage; pendingImage = null; $('#thumb').innerHTML = ''; $('#capture-meta').textContent = ''; $('#artifact-input').value = '';

  rebuildModel({ reheat: 0.4 });
  selectedId = res0.person ? res0.person.id : artifact.id; userView = null;
  for (const [nid, g] of el.nodes) g.classList.toggle('is-live', nid === selectedId);
  applyFocusDimming(); setTarget(focusRect(selectedId)); renderPanel(); busyTimer();

  current.context = current.person ? C.contextPack(store, current.person.id) : { status: 'empty', markdown: '', eventIds: [], truncated: false };
  const t0 = Date.now();
  const r = await callApi({ action: 'interpret', text, image: img ? { mediaType: img.mediaType, data: img.data } : null, context: { status: current.context.status, markdown: current.context.markdown } });
  current.ms = Date.now() - t0;
  if (!r.ok) {
    if (r.reason === 'config' && mode === 'example') { current.result = sampleReading(text); current.sample = true; current.model = 'sample'; }
    else { current.error = r.reason === 'config' ? `The model is not configured on this site (${esc(r.detail || 'missing key')}). Nothing was invented in its place.` : r.reason === 'unauthorised' ? 'The access key was rejected. Set it from the header.' : r.reason === 'refused' ? 'The model declined to read this. Nothing was recorded for it.' : `The reading failed: ${esc(r.detail || r.reason)}.`; renderPanel(); if (r.reason === 'unauthorised') askKey(); return; }
  } else { current.result = r.result; current.model = r.model; current.promptVersion = r.promptVersion; }
  afterReading();
}
function busyTimer() { const t0 = Date.now(); const f = () => { const b = $('#busy-ms'); if (!b) return; b.textContent = ` ${((Date.now() - t0) / 1000).toFixed(0)}s`; requestAnimationFrame(f); }; if (!reduced) requestAnimationFrame(f); }

function afterReading() {
  const { artifact, result } = current;
  if (!current.person && result.author && (result.author.name || result.author.linkedinUrl)) {
    const res = C.resolveAuthor({ text: current.text, guessName: result.author.name, guessUrl: result.author.linkedinUrl }, store);
    current.resolution = res;
    if (res.person && res.confidence >= 0.9) linkPerson(res.person, res.how, res.confidence, 'system');
  }
  const pid = current.person ? current.person.id : null;
  store.append({ kind: 'context_retrieved', actor: 'system', artifactId: artifact.id, personId: pid, origin: mode, payload: { status: current.context.status, eventIds: current.context.eventIds, truncated: current.context.truncated, budgetChars: 6000 } });
  result.observations.forEach((text) => store.append({ kind: 'observation', actor: 'system', artifactId: artifact.id, personId: pid, origin: mode, model: current.model, promptVersion: current.promptVersion, payload: { text, cites: [artifact.id], sample: current.sample } }));
  current.evidenceEvents = result.problemEvidence.map((pe) => { const pr = store.addProblem({ label: pe.label, origin: mode }); return store.append({ kind: 'problem_evidence', actor: 'system', artifactId: artifact.id, personId: pid, problemId: pr.id, origin: mode, model: current.model, promptVersion: current.promptVersion, payload: { quote: pe.quote, cites: [artifact.id], sample: current.sample } }); });
  store.append({ kind: 'recommendation', actor: 'system', artifactId: artifact.id, personId: pid, origin: mode, model: current.model, promptVersion: current.promptVersion, payload: { verdict: result.verdict, reasons: result.reasons, rulesApplied: result.rulesApplied || [], contentHash: artifact.contentHash, cites: [artifact.id], sample: current.sample } });
  refresh({ reheat: 0.45 });
}

function linkPerson(person, how, confidence, actor) {
  current.person = person; store.setArtifactAuthor(current.artifact.id, person.id);
  store.append({ kind: 'author_resolved', actor, artifactId: current.artifact.id, personId: person.id, origin: mode, payload: { how, confidence } });
  current.context = C.contextPack(store, person.id);
  selectedId = person.id;
}
function createPersonFromGuess() {
  const a = (current.result && current.result.author) || {};
  const name = window.prompt('Name for this person', a.name || ''); if (!name) return;
  const company = a.company ? store.addCompany({ name: a.company, origin: mode }) : null;
  const person = store.addPerson({ displayName: name.trim(), linkedinUrl: a.linkedinUrl || C.extractLinkedIn(current.text), companyId: company ? company.id : null, title: a.title || null, origin: mode });
  linkPerson(person, 'manual', 1, 'jay'); refresh({ reheat: 0.5 });
}
function linkExisting() {
  const people = C.peopleTable(store); if (!people.length) { createPersonFromGuess(); return; }
  const pick = window.prompt(`Which person is this?\n${people.map((r, i) => `${i + 1}. ${r.person.displayName}${r.company ? ` (${r.company.name})` : ''}`).join('\n')}\n\nNumber, or blank to cancel.`);
  const idx = Number(pick) - 1; if (!Number.isInteger(idx) || !people[idx]) return;
  const person = people[idx].person;
  if (current.result && current.result.author && current.result.author.name) store.addAlias(person.id, current.result.author.name, 'name', 1);
  const url = C.extractLinkedIn(current.text) || (current.result && current.result.author.linkedinUrl);
  if (url && !person.linkedinUrl) { person.linkedinUrl = C.normaliseLinkedIn(url); store.addAlias(person.id, url, 'url', 1); }
  linkPerson(person, 'alias', 1, 'jay'); refresh({ reheat: 0.5 });
}

function decide(verdict) {
  if (!current || !current.result || current.decision) return;
  current.decision = store.append({ kind: 'decision', actor: 'jay', artifactId: current.artifact.id, personId: current.person ? current.person.id : null, origin: mode, payload: { verdict, agreedWithSystem: verdict === current.result.verdict } });
  if (verdict === 'SAVE') { store.append({ kind: 'action', actor: 'jay', artifactId: current.artifact.id, personId: current.person ? current.person.id : null, origin: mode, payload: { kind: 'saved' } }); current.posted = true; if (current.person) flare(C.applySystemRung(store, current.person.id)); }
  refresh();
  if (verdict === 'COMMENT' && !current.draft) draftComment();
}
async function draftComment() {
  const anchors = store.events().filter((e) => e.kind === 'action' && e.payload.kind === 'commented' && e.payload.text && e.actor === 'jay' && e.origin === 'real').slice(-3).map((e) => e.payload.text);
  const r = await callApi({ action: 'draft', text: current.text || '(screenshot)', observations: current.result.observations, reasons: current.result.reasons, context: { status: current.context.status, markdown: current.context.markdown }, anchors });
  if (!r.ok) { if (r.reason === 'config' && mode === 'example') current.draft = { comment: SAMPLE_DRAFT, sample: true }; else { const s = $('#draft-status'); if (s) s.textContent = r.reason === 'config' ? 'model not configured on this site' : r.reason === 'unauthorised' ? 'access key rejected' : `draft failed: ${r.detail || r.reason}`; return; } }
  else current.draft = { comment: r.result.comment, sample: false };
  renderPanel();
}
async function markPosted() {
  const finalText = $('#draft-text').value.trim(); if (!finalText) return;
  try { await navigator.clipboard.writeText(finalText); } catch { /* the text stays on screen */ }
  const ratio = current.draft ? C.editRatio(current.draft.comment, finalText) : 1;
  store.append({ kind: 'action', actor: 'jay', artifactId: current.artifact.id, personId: current.person ? current.person.id : null, origin: mode, payload: { kind: 'commented', text: finalText, draftEditRatio: Number(ratio.toFixed(2)), draftedBySystem: Boolean(current.draft && !current.draft.sample) } });
  current.posted = true; if (current.person) flare(C.applySystemRung(store, current.person.id)); refresh();
}
function confirmEvidence(evId) {
  const ev = store.events().find((e) => e.id === evId); if (!ev) return;
  const pid = ev.personId || store.artifact(ev.artifactId)?.authorPersonId; if (!pid) return;
  store.append({ kind: 'problem_evidence', actor: 'jay', artifactId: ev.artifactId, personId: pid, problemId: ev.problemId, origin: mode, evidenceEventId: ev.id, payload: { quote: ev.payload.quote, cites: ev.payload.cites } });
  flareIds.add(ev.problemId); flareIds.add(pid); refresh();
}
function confirmRung(personId) {
  const events = store.eventsFor(personId); const p = C.proposeRungChange(events); if (p.kind !== 'needs_jay') return;
  flare(store.append({ kind: 'rung_changed', actor: 'jay', personId, origin: mode, evidenceEventId: p.evidenceEventId, payload: { from: C.currentRung(events), to: p.to } })); refresh();
}
function recordResponse(artifactId, kind, asksAboutQb) {
  const a = store.artifact(artifactId); if (!a) return;
  store.append({ kind: 'response_observed', actor: 'jay', artifactId, personId: a.authorPersonId, origin: mode, payload: { kind, by: 'external', asksAboutQb: Boolean(asksAboutQb) } });
  if (a.authorPersonId) { flare(C.applySystemRung(store, a.authorPersonId)); flareIds.add(a.authorPersonId); }
  refresh();
}
function flare(ev) { if (ev && ev.personId) flareIds.add(ev.personId); }
function refresh(opts) { rebuildModel(opts || {}); renderPanel(); }
function openArtifact(id) { current = null; select(id); }

/* ---------- example mode ---------- */
const SAMPLE_DRAFT = 'Five people and two re-typings is the real cost, not the portal. When the vendor goes quiet, who is the first person whose day gets worse, and how long after?';
function sampleReading(text) {
  const known = /priya/i.test(text || '');
  return { author: { name: 'Priya Natarajan', linkedinUrl: 'https://www.linkedin.com/in/priya-natarajan-example', company: 'Harborline Property Group', title: 'Director of Operations', confidence: 0.95 }, isQuestion: true, inLane: true,
    observations: known ? ['She mapped the handoff since her last post: five people, three systems, two re-typings.', 'Vendor confirmations arrive by text to whoever called; the gap has no owner.', 'She rules out another portal before anyone can pitch one.'] : ['A question to peers about a specific failure, with the systems named.'],
    problemEvidence: [{ label: 'Maintenance requests lost between portal, vendor and on-site team', quote: 'two of those steps are someone re-typing what the last person wrote' }, { label: 'Vendor status lives in text messages nobody else can see', quote: 'Vendor confirmations still arrive by text message to whoever happened to call them.' }],
    verdict: 'COMMENT', reasons: ['A direct question, inside QB\'s lane', 'Second post on the same problem, now with a map', 'She asked who solved it, not what to buy'], rulesApplied: [] };
}

/* ---------- import / export / mode ---------- */
function exportLog() { const blob = new Blob([store.export()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `qb-operator-${mode}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function importLog(file) {
  const reader = new FileReader();
  reader.onload = () => { try { const data = JSON.parse(String(reader.result)); if (!data || !Array.isArray(data.events)) throw new Error('not an operator log'); if (!window.confirm(`Replace the ${mode} log in this browser with ${data.events.length} events from the file?`)) return; store.replaceState(data); resetCanvas(); } catch (e) { notice(`Import failed: ${e.message}`); } };
  reader.readAsText(file);
}
function resetCanvas() { current = null; selectedId = null; userView = null; positions = {}; known.nodes = new Set(); known.edges = new Set(); for (const g of el.nodes.values()) g.remove(); for (const l of el.edges.values()) l.remove(); for (const t of el.labels.values()) t.remove(); el.nodes.clear(); el.edges.clear(); el.labels.clear(); alpha = 1; rebuildModel({ reheat: 1 }); setTarget(homeRect(), { immediate: true }); renderPanel(); }
function setMode(next) { if (next === mode) return; mode = next; localStorage.setItem(MODE_KEY, mode); openStore(); resetCanvas(); notice(mode === 'example' ? 'Example mode. Fictional people, fictional history, kept apart from your real log.' : 'Real log.'); }

/* ---------- wiring ---------- */
document.addEventListener('DOMContentLoaded', () => {
  openStore();
  $('#mode-real').addEventListener('click', () => setMode('real'));
  $('#mode-example').addEventListener('click', () => setMode('example'));
  $('#open-sheet').addEventListener('click', openSheet);
  $('#close-sheet').addEventListener('click', closeSheet);
  $('#read').addEventListener('click', capture);
  $('#set-key').addEventListener('click', askKey);
  $('#toggle-panel').addEventListener('click', () => togglePanel());
  $('#export').addEventListener('click', exportLog);
  $('#import').addEventListener('change', (e) => { if (e.target.files[0]) importLog(e.target.files[0]); e.target.value = ''; });
  $('#paste-example').addEventListener('click', () => { $('#artifact-input').value = C.EXAMPLE_ARTIFACT; $('#artifact-input').focus(); });
  $('#artifact-input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); capture(); } if (e.key === 'Escape') closeSheet(); });
  $('#sheet').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSheet(); });
  const box = $('#sheet-box');
  box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('is-over'); }); box.addEventListener('dragleave', () => box.classList.remove('is-over'));
  box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('is-over'); if (e.dataTransfer.files[0]) setImage(e.dataTransfer.files[0]); });
  document.addEventListener('paste', (e) => { const f = [...(e.clipboardData.files || [])][0]; if (f) { e.preventDefault(); openSheet(); setImage(f); } });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-select],[data-home],[data-open-artifact],[data-decide],[data-confirm-evidence],[data-confirm-rung],[data-respond],[data-link-existing],[data-create-person],[data-link-candidate],[data-load-example],[data-open-sheet],#mark-posted');
    if (!t) return;
    if (t.dataset.select) { current = null; select(t.dataset.select); }
    else if (t.hasAttribute('data-home')) goHome();
    else if (t.dataset.openArtifact) openArtifact(t.dataset.openArtifact);
    else if (t.dataset.decide) decide(t.dataset.decide);
    else if (t.dataset.confirmEvidence) confirmEvidence(t.dataset.confirmEvidence);
    else if (t.dataset.confirmRung) confirmRung(t.dataset.confirmRung);
    else if (t.dataset.respond) { const asks = $(`[data-asks="${t.dataset.respond}"]`); recordResponse(t.dataset.respond, t.dataset.kind, asks && asks.checked); }
    else if (t.hasAttribute('data-link-existing')) linkExisting();
    else if (t.hasAttribute('data-create-person')) createPersonFromGuess();
    else if (t.dataset.linkCandidate) { const p = store.person(t.dataset.linkCandidate); if (p) { if (current.result && current.result.author.name) store.addAlias(p.id, current.result.author.name, 'name', 1); linkPerson(p, 'alias', 1, 'jay'); refresh({ reheat: 0.5 }); } }
    else if (t.hasAttribute('data-load-example')) { C.seedExampleWide(store); resetCanvas(); notice('Example history loaded: nine fictional people, five problems, one open loop, a few weeks of use.'); }
    else if (t.hasAttribute('data-open-sheet')) openSheet();
    else if (t.id === 'mark-posted') markPosted();
  });
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase(); const typing = tag === 'textarea' || tag === 'input';
    if (e.key === 'Escape') { if ($('#sheet').classList.contains('is-open')) closeSheet(); else goHome(); return; }
    if (typing) return;
    if (e.key === '/' || e.key.toLowerCase() === 'r') { e.preventDefault(); openSheet(); return; }
    if (e.key.toLowerCase() === 'p') { togglePanel(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const people = C.peopleTable(store).map((r) => r.person.id); if (!people.length) return;
      const i = people.indexOf(selectedId); const next = people[(i + (e.key === 'ArrowRight' ? 1 : people.length - 1) + (i < 0 ? 1 : 0)) % people.length];
      current = null; select(next); return;
    }
    if (!current || !current.result || current.decision) return;
    const k = e.key.toLowerCase(); if (k === 'c') decide('COMMENT'); else if (k === 's') decide('SAVE'); else if (k === 'x') decide('SCROLL');
  });

  alpha = 1; hotTicks = 0; rebuildModel({ reheat: 1 });
  C.layoutSettle(model, positions, 120); // most of the way to rest before the first frame, then the rest on screen
  setTarget(homeRect(), { immediate: true });
  renderPanel();
  if (mode === 'example') notice('Example mode. Fictional people, fictional history, kept apart from your real log.');
});
