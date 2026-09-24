/* Quiet Bands — shared runtime: attribution, analytics, first-party insert.
   No framework. Loaded as an ES module by pages that need it.

   Events are dispatched to every sink that exists:
     1. window.dataLayer (GTM) and window.gtag (GA4) if a tag is installed
     2. window.plausible if Plausible is installed
     3. the first-party Supabase table rd_events (anon insert only)
     4. a DOM CustomEvent 'qb:track' for anything else on the page
   Set localStorage.qb_debug = '1' to mirror events to the console. */

export const SUPABASE_URL = 'https://jkilmecbhjepltbianof.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable__s8Dc6XKGrrw_fZjBDvDeg_Nv7c0nYg';

const ATTR_KEY = 'qb_attr_v1';
const SESSION_KEY = 'qb_sid_v1';
const PT_KEY = 'qb_pt_v1';

const has = (k) => { try { return typeof window !== 'undefined' && k in window; } catch { return false; } };
const store = {
  get(area, k) { try { const v = window[area].getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(area, k, v) { try { window[area].setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(area, k) { try { window[area].removeItem(k); } catch { /* ignore */ } },
};

/* ---------- attribution ---------- */

/** Classify a visit into the buckets we compare. Pure; exported for tests. */
export function classifySource({ utm_source = '', utm_medium = '', utm_campaign = '', src = '', referrer = '' } = {}) {
  const s = utm_source.toLowerCase(), m = utm_medium.toLowerCase(), c = utm_campaign.toLowerCase();
  const short = src.toLowerCase();
  let host = '';
  try { host = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''; } catch { host = ''; }
  const blob = [s, m, c, short].join(' ');

  const mentions = (re) => re.test(blob);
  if (short === 'tramp-talk' || mentions(/tramp[\s_-]?talk/)) return 'tramp_talk';
  if (short === 'jay-tiktok' || (mentions(/tiktok/) && mentions(/\bjay\b|jay[_-]/))) return 'jay_tiktok';
  if (short === 'flighty-tiktok' || (mentions(/tiktok/) && mentions(/flighty/))) return 'flighty_tiktok';
  if (short === 'flighty-ig' || short === 'flighty-instagram' || (mentions(/instagram|\big\b/) && mentions(/flighty/))) return 'flighty_instagram';
  if (short === 'linkedin' || mentions(/linkedin/) || host.endsWith('linkedin.com') || host === 'lnkd.in') return 'linkedin';
  if (!s && !short && !host) return 'direct';
  if (!s && !short && (host === location_host())) return 'direct';
  return 'other';
}
function location_host() { try { return window.location.hostname.replace(/^www\./, ''); } catch { return ''; } }

/** First-touch attribution for this browser. Captured once, kept in localStorage. */
export function getAttribution() {
  if (typeof window === 'undefined') return { source: 'other' };
  let attr = store.get('localStorage', ATTR_KEY);
  const q = new URLSearchParams(window.location.search);
  const incoming = {
    utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '',
    utm_campaign: q.get('utm_campaign') || '', utm_content: q.get('utm_content') || '',
    utm_term: q.get('utm_term') || '', src: q.get('src') || q.get('ref') || '',
  };
  const hasIncoming = Object.values(incoming).some(Boolean);
  if (!attr || (hasIncoming && !attr.locked)) {
    attr = {
      ...incoming,
      referrer: document.referrer || '',
      landing: window.location.pathname,
      ts: new Date().toISOString(),
      locked: hasIncoming, // a tagged visit wins over an earlier untagged one, then sticks
    };
    attr.source = classifySource({ ...incoming, referrer: attr.referrer });
    store.set('localStorage', ATTR_KEY, attr);
  }
  return attr;
}

/** Append the stored UTM/src params to an internal link so attribution survives a new tab. */
export function preserveUtm(url) {
  const attr = getAttribution();
  try {
    const u = new URL(url, window.location.origin);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src'].forEach((k) => {
      if (attr[k] && !u.searchParams.has(k)) u.searchParams.set(k, attr[k]);
    });
    return u.pathname + u.search + u.hash;
  } catch { return url; }
}

function sessionId() {
  let id = store.get('sessionStorage', SESSION_KEY);
  if (!id) {
    id = (has('crypto') && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    store.set('sessionStorage', SESSION_KEY, id);
  }
  return id;
}

/* ---------- first-party insert ---------- */

/** Insert one row through Supabase REST. Resolves true/false; never throws. */
export async function qbInsert(table, row, { keepalive = false } = {}) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', keepalive,
      headers: {
        'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    return res.ok;
  } catch { return false; }
}

/* ---------- analytics ---------- */

export function track(event, props = {}) {
  if (typeof window === 'undefined') return;
  const attr = getAttribution();
  const payload = { event, source: attr.source, path: window.location.pathname, session_id: sessionId(), props, attribution: attr };

  try { if (store.get('localStorage', 'qb_debug')) console.debug('[qb:track]', event, payload); } catch { /* ignore */ }

  try { (window.dataLayer = window.dataLayer || []).push({ event, source: attr.source, ...props }); } catch { /* ignore */ }
  try { if (typeof window.gtag === 'function') window.gtag('event', event, { source: attr.source, ...props }); } catch { /* ignore */ }
  try { if (typeof window.plausible === 'function') window.plausible(event, { props: { source: attr.source, ...flat(props) } }); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('qb:track', { detail: payload })); } catch { /* ignore */ }

  // first-party sink, fire-and-forget
  qbInsert('rd_events', {
    event, source: attr.source, path: payload.path, session_id: payload.session_id,
    props, attribution: { utm_source: attr.utm_source, utm_medium: attr.utm_medium, utm_campaign: attr.utm_campaign, utm_content: attr.utm_content, src: attr.src, referrer: attr.referrer, landing: attr.landing },
    user_agent: navigator.userAgent.slice(0, 200),
  }, { keepalive: true });
}
function flat(o) { const out = {}; for (const k in o) out[k] = typeof o[k] === 'object' ? JSON.stringify(o[k]) : o[k]; return out; }

/** Wire declarative tracking: any element with data-track="event_name" (optional data-track-props='{}'). */
export function bindTracking(root = document) {
  root.querySelectorAll('[data-track]').forEach((el) => {
    if (el.__qbBound) return; el.__qbBound = true;
    el.addEventListener('click', () => {
      let props = {}; try { props = JSON.parse(el.getAttribute('data-track-props') || '{}'); } catch { /* ignore */ }
      track(el.getAttribute('data-track'), { label: (el.textContent || '').trim().slice(0, 60), ...props });
    });
  });
}

/* ---------- pressure-test persistence (shared with /work intake) ---------- */
export const pt = {
  load() { return store.get('localStorage', PT_KEY); },
  save(v) { store.set('localStorage', PT_KEY, v); },
  clear() { store.del('localStorage', PT_KEY); },
};

/* ---------- boot ---------- */
if (typeof window !== 'undefined') {
  getAttribution();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => bindTracking());
  else bindTracking();
  const pv = document.body && document.body.getAttribute('data-page-view');
  if (pv) track(pv, { page: window.location.pathname });
}
