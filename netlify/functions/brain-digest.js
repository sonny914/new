// netlify/functions/brain-digest.js
//
// Scheduled Mondays: posts last week's numbers to BRAIN_CHANNEL. Questions asked in Slack, AI reads, fixes saved,
// changes held and decided, and how many people used it.

import { config as loadConfig } from './lib/brain/config.js';
import { createStore } from './lib/brain/store.js';
import { createSlack } from './lib/brain/slack.js';

export const config = { schedule: '17 14 * * 1' };   // Mondays 14:17 UTC

/** Count a week of log rows. Pure; exported for tests. */
export function weekNumbers(rows) {
  const n = (k) => rows.filter((r) => r.kind === k).length;
  const people = new Set(rows.filter((r) => r.actor_kind === 'person' && r.actor).map((r) => r.actor));
  const agents = new Set(rows.filter((r) => r.actor_kind === 'agent' && r.actor).map((r) => r.actor));
  return { questions: n('answer'), reads: n('read'), fixes: n('fix'), held: n('1-3-1'), approved: n('yes'), rejected: n('no'), people: people.size, agents: agents.size };
}

/** The digest message text. Pure; exported for tests. */
export function digestText(w) {
  return [
    '*The brain, last 7 days*',
    `• *${w.questions}* questions asked in Slack by *${w.people}* people`,
    `• *${w.reads}* AI reads before work, from *${w.agents}* agents`,
    `• *${w.fixes}* answers fixed once, for everyone`,
    `• *${w.held}* big changes held · *${w.approved}* approved · *${w.rejected}* rejected`,
  ].join('\n');
}

export default async () => {
  const cfg = loadConfig();
  if (!cfg.channel) return new Response('BRAIN_CHANNEL not set');
  const store = createStore({ url: cfg.supabaseUrl, key: cfg.supabaseKey });
  const rows = await store.logSince(new Date(Date.now() - 7 * 864e5).toISOString());
  await createSlack({ token: cfg.slackToken })('chat.postMessage', { channel: cfg.channel, text: digestText(weekNumbers(rows)) });
  return new Response('posted');
};
