// netlify/functions/brain-api.js
//
// The brain for AI agents: an outreach, pre-call, content or reporting bot asks here before it writes, so it says
// what sales says. Same answers, same fixes and same sources as #ask-the-brain; each call is logged as an AI read.
//
//   POST /.netlify/functions/brain-api
//   Authorization: Bearer <key from BRAIN_API_KEYS>
//   { "question": "How do we price the annual plan?" }
//   → { "answer": "...", "sources": [...], "fixes": [...], "confidence": "high", "needs_person": false }

import { config as loadConfig } from './lib/brain/config.js';
import { createStore } from './lib/brain/store.js';
import { createClaude } from './lib/brain/claude.js';
import { sameSecret } from './lib/brain/slack.js';
import { answerQuestion } from './lib/brain/answer.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** The agent a bearer token belongs to, or null. Exported for tests. */
export function agentFor(authHeader, keys) {
  const token = /^Bearer\s+(.+)$/i.exec(authHeader ?? '')?.[1]?.trim();
  if (!token) return null;
  return keys.find((k) => sameSecret(token, k.key))?.name ?? null;
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST a JSON body with a question' });
  const cfg = loadConfig();
  const agent = agentFor(req.headers.get('authorization'), cfg.apiKeys);
  if (!agent) return json(401, { error: 'missing or unknown API key' });
  let question;
  try { question = String((await req.json()).question ?? '').trim(); } catch { return json(400, { error: 'body must be JSON' }); }
  if (!question || question.length > 2000) return json(400, { error: 'question must be 1 to 2000 characters' });
  try {
    const r = await answerQuestion({ question, actor: agent, actorKind: 'agent', store: createStore({ url: cfg.supabaseUrl, key: cfg.supabaseKey }), ask: createClaude({ model: cfg.model, effort: cfg.effort }) });
    return json(200, { answer: r.answer, sources: r.sources, fixes: r.fixes, confidence: r.confidence, needs_person: r.needs_person });
  } catch (err) {
    console.error('brain-api failed', err.message);
    return json(err.code === 'refusal' ? 422 : 502, { error: err.code === 'refusal' ? 'declined' : 'the brain could not answer right now' });
  }
};
