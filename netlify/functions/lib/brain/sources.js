// Company Brain: turning source material into searchable chunks. HubSpot deals over its API, and any text
// (call transcripts, playbooks, briefs) through tools/brain-ingest.mjs.

/** Split text on paragraph breaks into chunks of about `size` characters. Pure; exported for tests. */
export function chunkText(text, size = 1800) {
  const paras = String(text).replace(/\r/g, '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  let cur = '';
  for (const p of paras) {
    if (p.length > size) {
      if (cur) { out.push(cur); cur = ''; }
      for (let i = 0; i < p.length; i += size) out.push(p.slice(i, i + size));
      continue;
    }
    if (cur && cur.length + p.length + 2 > size) { out.push(cur); cur = ''; }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}

/** One document as chunk rows for brain_chunks. Pure; exported for tests. */
export function documentChunks({ source, id, title, url = null, text }) {
  return chunkText(text).map((body, i) => ({ source, source_id: `${id}#${i}`, title, url, body, updated_at: new Date().toISOString() }));
}

const DEAL_PROPS = ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'description', 'hs_lastmodifieddate', 'hs_next_step', 'closed_lost_reason', 'closed_won_reason'];

/** A HubSpot deal as one readable document. Pure; exported for tests. */
export function dealText(p) {
  const line = (k, v) => (v ? `${k}: ${v}` : null);
  return [
    line('Deal', p.dealname), line('Amount', p.amount), line('Stage', p.dealstage), line('Pipeline', p.pipeline),
    line('Close date', p.closedate?.slice(0, 10)), line('Next step', p.hs_next_step), line('Won because', p.closed_won_reason),
    line('Lost because', p.closed_lost_reason), p.description ? `\n${p.description}` : null,
  ].filter(Boolean).join('\n');
}

/** Every deal changed since `sinceIso` (or all of them), as chunk rows. Pages through the CRM search API. */
export async function hubspotDeals({ token, portalId = '', sinceIso = null, fetch: f = fetch, limit = 2000 }) {
  if (!token) return [];
  const rows = [];
  let after;
  do {
    const body = {
      limit: 100, properties: DEAL_PROPS, sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
      ...(sinceIso ? { filterGroups: [{ filters: [{ propertyName: 'hs_lastmodifieddate', operator: 'GTE', value: String(Date.parse(sinceIso)) }] }] } : {}),
      ...(after ? { after } : {}),
    };
    const res = await f('https://api.hubapi.com/crm/v3/objects/deals/search', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`hubspot deals search failed: ${res.status}`);
    const data = await res.json();
    for (const d of data.results ?? []) {
      const url = portalId ? `https://app.hubspot.com/contacts/${portalId}/record/0-3/${d.id}` : null;
      rows.push(...documentChunks({ source: 'hubspot', id: `deal:${d.id}`, title: d.properties.dealname || `Deal ${d.id}`, url, text: dealText(d.properties) }));
    }
    after = data.paging?.next?.after;
  } while (after && rows.length < limit);
  return rows;
}
