// netlify/functions/brain-sync.js
//
// Scheduled every hour: pulls HubSpot deals changed in the last two hours into the brain. Without HUBSPOT_TOKEN it
// does nothing. Call text sources (transcripts, playbooks) in with tools/brain-ingest.mjs.

import { config as loadConfig } from './lib/brain/config.js';
import { createStore } from './lib/brain/store.js';
import { hubspotDeals } from './lib/brain/sources.js';

export const config = { schedule: '@hourly' };

export default async () => {
  const cfg = loadConfig();
  if (!cfg.hubspotToken) { console.log('brain-sync: HUBSPOT_TOKEN not set, nothing to sync'); return new Response('skipped'); }
  const since = new Date(Date.now() - 2 * 3600e3).toISOString();
  const rows = await hubspotDeals({ token: cfg.hubspotToken, portalId: cfg.hubspotPortal, sinceIso: since });
  const store = createStore({ url: cfg.supabaseUrl, key: cfg.supabaseKey });
  for (let i = 0; i < rows.length; i += 200) await store.upsertChunks(rows.slice(i, i + 200));
  await store.log({ kind: 'check', actor: 'brain-sync', actor_kind: 'system', summary: `HubSpot: ${rows.length} deal chunks refreshed` });
  console.log(`brain-sync: ${rows.length} chunks`);
  return new Response(String(rows.length));
};
