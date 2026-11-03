// The instruments: numbers the night shift reads at the start of every shift. Counts only, never rows,
// so no customer data reaches the model, the journal or the inbox through this path.
//
// A metric that cannot be read comes back with value null and a note saying why. The prompt tells the
// agent to report that honestly instead of estimating.

const UNIT = { h: 3_600_000, d: 86_400_000 };

export function parseSince(since) {
  const m = /^(\d+)([hd])$/.exec(String(since ?? ''));
  if (!m) throw new Error(`since must look like 24h or 7d, got "${since}"`);
  return Number(m[1]) * UNIT[m[2]];
}

async function supabaseCount(def, env, fetchImpl, now) {
  const base = (env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '';
  if (!base || !key) return { value: null, note: 'not connected (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY unset)' };
  if (!/^[a-z_][a-z0-9_]*$/.test(def.table ?? '')) return { value: null, note: `bad table name "${def.table}"` };
  const q = new URLSearchParams({ select: 'id' });
  if (def.since) q.set('created_at', `gte.${new Date(now.getTime() - parseSince(def.since)).toISOString()}`);
  for (const [col, expr] of Object.entries(def.filter ?? {})) q.set(col, String(expr));
  const res = await fetchImpl(`${base}/rest/v1/${def.table}?${q}`, {
    method: 'HEAD',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
  });
  if (!res.ok) return { value: null, note: `Supabase answered ${res.status}` };
  const total = Number(String(res.headers.get('content-range') ?? '').split('/')[1]);
  return Number.isFinite(total) ? { value: total } : { value: null, note: 'no count in the response' };
}

const SOURCES = { supabase: supabaseCount };

export async function readMetrics(defs = [], env = {}, fetchImpl = fetch, now = new Date()) {
  return Promise.all(
    defs.map(async (def) => {
      const base = { name: def.name, label: def.label ?? def.name };
      const source = SOURCES[def.source];
      if (!source) return { ...base, value: null, note: `unknown source "${def.source}"` };
      try {
        return { ...base, ...(await source(def, env, fetchImpl, now)) };
      } catch (e) {
        return { ...base, value: null, note: e.message };
      }
    }),
  );
}

export function metricsTable(metrics) {
  if (!metrics.length) return '_No metrics configured._';
  return ['| Metric | Value |', '| --- | --- |', ...metrics.map((m) => `| ${m.label} | ${m.value ?? `— (${m.note})`} |`)].join('\n');
}
