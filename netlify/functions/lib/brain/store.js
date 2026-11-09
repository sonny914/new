// Company Brain: the Supabase store (db/brain.sql), over PostgREST with the service-role key.
// Every call goes through one request() so tests can hand in a fake fetch.

export function createStore({ url, key, fetch: f = fetch }) {
  if (!url || !key) throw new Error('Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  async function request(path, { method = 'GET', body, prefer } = {}) {
    const res = await f(`${url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`supabase ${method} ${path.split('?')[0]} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  const one = (rows) => (Array.isArray(rows) ? rows[0] : rows) ?? null;

  return {
    search: (q, n = 8) => request('rpc/brain_search', { method: 'POST', body: { q, n } }).then((r) => r ?? []),
    searchFixes: (q, n = 5) => request('rpc/brain_fix_search', { method: 'POST', body: { q, n } }).then((r) => r ?? []),
    upsertChunks: (rows) => rows.length
      ? request('brain_chunks?on_conflict=source,source_id', { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' })
      : null,
    addFix: (fix) => request('brain_fixes', { method: 'POST', body: fix, prefer: 'return=representation' }).then(one),
    addChange: (c) => request('brain_changes', { method: 'POST', body: c, prefer: 'return=representation' }).then(one),
    getChange: (id) => request(`brain_changes?id=eq.${Number(id)}&select=*`).then(one),
    /** Decide a change only while it is still pending, so two clicks cannot both win. */
    decideChange: (id, patch) => request(`brain_changes?id=eq.${Number(id)}&status=eq.pending`, { method: 'PATCH', body: patch, prefer: 'return=representation' }).then(one),
    setChangeMessage: (id, slack_channel, slack_ts) => request(`brain_changes?id=eq.${Number(id)}`, { method: 'PATCH', body: { slack_channel, slack_ts }, prefer: 'return=minimal' }),
    log: (entry) => request('brain_log', { method: 'POST', body: entry, prefer: 'return=representation' }).then(one),
    getLog: (id) => request(`brain_log?id=eq.${Number(id)}&select=*`).then(one),
    logSince: (iso) => request(`brain_log?created_at=gte.${encodeURIComponent(iso)}&select=kind,actor,actor_kind&limit=10000`).then((r) => r ?? []),
  };
}
