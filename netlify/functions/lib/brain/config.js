// Company Brain: settings, read from the environment once per cold start.
//
// Netlify → Site configuration → Environment variables:
//   ANTHROPIC_API_KEY        Anthropic API key
//   BRAIN_MODEL              optional, default claude-opus-5-5
//   BRAIN_EFFORT             optional, low | medium | high (default medium)
//   SLACK_BOT_TOKEN          xoxb-… from the Slack app's OAuth page
//   SLACK_SIGNING_SECRET     from the Slack app's Basic Information page
//   BRAIN_CHANNEL            channel id for the weekly digest and held changes, e.g. C0123ABCD
//   BRAIN_APPROVERS          optional, comma-separated Slack user ids allowed to approve a held change
//                            (empty: anyone in the channel can approve)
//   BRAIN_WORKER_SECRET      a long random string; the Slack endpoint uses it to call the background worker
//   BRAIN_API_KEYS           comma-separated name:key pairs for AI agents, e.g. outreach:9f…,precall:3c…
//   SUPABASE_URL             already set for the site
//   SUPABASE_SERVICE_KEY     service-role key (server only; never ship it to a page)
//   HUBSPOT_TOKEN            optional, a HubSpot private-app token with crm.objects.deals.read
//   HUBSPOT_PORTAL_ID        optional, your HubSpot account id, so answers link to the deal
// Netlify sets URL itself.

const env = (k, d = '') => (process.env[k] ?? d).trim();

export function config() {
  return {
    model: env('BRAIN_MODEL', 'claude-opus-5-5'),
    effort: env('BRAIN_EFFORT', 'medium'),
    slackToken: env('SLACK_BOT_TOKEN'),
    slackSecret: env('SLACK_SIGNING_SECRET'),
    channel: env('BRAIN_CHANNEL'),
    approvers: env('BRAIN_APPROVERS').split(',').map((s) => s.trim()).filter(Boolean),
    workerSecret: env('BRAIN_WORKER_SECRET'),
    apiKeys: parseKeys(env('BRAIN_API_KEYS')),
    supabaseUrl: env('SUPABASE_URL').replace(/\/$/, ''),
    supabaseKey: env('SUPABASE_SERVICE_KEY'),
    hubspotToken: env('HUBSPOT_TOKEN'),
    hubspotPortal: env('HUBSPOT_PORTAL_ID'),
    siteUrl: env('URL', 'https://quietbands.com').replace(/\/$/, ''),
  };
}

/** "outreach:abc,precall:def" → [{ name: 'outreach', key: 'abc' }, …]. Pure; exported for tests. */
export function parseKeys(s) {
  return s.split(',').map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.indexOf(':');
    return i > 0 ? { name: p.slice(0, i).trim(), key: p.slice(i + 1).trim() } : null;
  }).filter((k) => k && k.key.length >= 16);
}
