/* Quiet Bands Studio: the pure parts of the runtime, kept apart so tools/studio.test.mjs can run them in Node.
   No DOM here. studio.js does the wiring. */

export const KINDS = ['pack', 'workshop', 'commission'];
export const TABLE = 'studio_signups';
export const STORE_KEY = 'qb_studio_v1';

export const validEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

const clip = (s, n) => { const t = String(s ?? '').trim(); return t ? t.slice(0, n) : null; };

/** Turn one form's fields into a studio_signups row, or say what's missing. */
export function buildSignup(kind, data, { campaign = '', where = '', attribution = {}, path = '' } = {}) {
  if (!KINDS.includes(kind)) return { ok: false, error: 'kind', field: null };
  if (data.website) return { ok: false, error: 'bot', field: null };
  const email = String(data.email || '').trim();
  if (!email) return { ok: false, error: 'Add your email and it’s on its way.', field: 'email' };
  if (!validEmail(email)) return { ok: false, error: 'That email doesn’t look right.', field: 'email' };
  if (kind === 'commission') {
    if (!clip(data.first_name, 80)) return { ok: false, error: 'Add your name so the reply can use it.', field: 'first_name' };
    if (!clip(data.what, 2000)) return { ok: false, error: 'Say what you want made, even roughly.', field: 'what' };
  }
  const a = attribution || {};
  const row = {
    kind, email,
    first_name: clip(data.first_name, 80),
    makes: clip(data.makes, 80),
    workshop_optin: kind === 'workshop' || data.workshop_optin === '1' || data.workshop_optin === true,
    brief: kind === 'commission' ? { org: clip(data.org, 120), what: clip(data.what, 2000), use: clip(data.use, 80), when: clip(data.when, 60), budget: clip(data.budget, 80) }
      : kind === 'workshop' && clip(data.idea, 200) ? { idea: clip(data.idea, 200) } : null,
    campaign: clip(campaign, 64),
    source: clip(a.source, 64),
    attribution: { utm_source: a.utm_source || '', utm_medium: a.utm_medium || '', utm_campaign: a.utm_campaign || '', utm_content: a.utm_content || '', src: a.src || '', referrer: (a.referrer || '').slice(0, 300), landing: a.landing || '', where: String(where).slice(0, 64) },
    path: clip(path, 200),
  };
  return { ok: true, row };
}

/** The same row as a Netlify Forms post: flat, url-encoded, named for the form. Netlify keeps only the fields the
    built form declares (lib.mjs), so this sends every column and lets it drop what that form doesn't have. */
export function netlifyBody(formName, row) {
  const b = row.brief || {};
  const fields = {
    'form-name': formName, kind: row.kind, email: row.email, first_name: row.first_name, makes: row.makes,
    workshop_optin: row.workshop_optin ? '1' : '', org: b.org, what: b.what, use: b.use, when: b.when, budget: b.budget, idea: b.idea,
    campaign: row.campaign, where: row.attribution?.where, source: row.source, path: row.path,
    attribution: JSON.stringify(row.attribution || {}),
  };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) if (v != null && v !== '') p.append(k, String(v));
  return p.toString();
}

/** What a Supabase REST insert status means for the visitor. 409 is a repeat address: they're already on the list. */
export function outcome(status) {
  if (status === 201 || status === 200 || status === 204) return 'ok';
  if (status === 409) return 'repeat';
  return 'error';
}

/** Who this browser has already signed up as. `storage` is anything with getItem/setItem. */
export function readState(storage) {
  try { const v = JSON.parse(storage.getItem(STORE_KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
export function writeState(storage, kind, extra = {}) {
  const now = readState(storage);
  const next = { ...now, [kind]: true, ...extra, at: new Date().toISOString() };
  try { storage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* private mode: the page still shows the result */ }
  return next;
}

/** A running film timecode for the hero, hh:mm:ss:ff at 24 fps. */
export function timecode(ms, fps = 24) {
  const f = Math.floor(ms / (1000 / fps));
  const ff = f % fps, s = Math.floor(f / fps), ss = s % 60, mm = Math.floor(s / 60) % 60, hh = Math.floor(s / 3600) % 100;
  return [hh, mm, ss, ff].map((n) => String(n).padStart(2, '0')).join(':');
}
