# Company Brain: setup

One brain in Slack for every person and every AI agent. People ask `@brain` (or DM it). Every answer cites its source. A wrong answer is fixed once and stays fixed for everyone. Big changes are held as 1-3-1 (3 options, 1 pick, a risk level) until a person approves them.

## What is built

| Piece | File | Status |
|---|---|---|
| Slack endpoint (events + buttons + fix modal) | `netlify/functions/brain-slack.js` | Built, tested offline |
| Background worker (answers, fixes, 1-3-1, decisions) | `netlify/functions/brain-worker-background.js` | Built, tested offline |
| Agent API for outreach / pre-call / content / reporting bots | `netlify/functions/brain-api.js` | Built, tested offline |
| HubSpot deal sync, hourly | `netlify/functions/brain-sync.js` | Built, needs a HubSpot token |
| Weekly digest to the channel, Mondays | `netlify/functions/brain-digest.js` | Built |
| Call transcripts and docs loader | `tools/brain-ingest.mjs` | Built (text and markdown files) |
| Database | `db/brain.sql` | Run once in Supabase |
| Slack app definition | `slack/manifest.yml` | Paste into Slack |
| Tests | `tools/brain.test.mjs` | `npm test` |

Not built yet: live Google Drive sync (export to `.md`/`.txt` and use the loader for now), a live call-recorder connector (same), and GA4 numbers.

## Turn it on (about 30 minutes)

1. **Database.** Supabase → SQL editor → run `db/brain.sql`.
2. **Slack app.** api.slack.com/apps → Create New App → From an app manifest → paste `slack/manifest.yml` with `YOUR-SITE` replaced by the Netlify domain → Install to workspace. Copy the Bot token (`xoxb-…`) and the Signing secret.
3. **Netlify env vars** (Site configuration → Environment variables):
   - `ANTHROPIC_API_KEY`
   - `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
   - `BRAIN_CHANNEL`: the channel id of `#ask-the-brain` (channel details → bottom)
   - `BRAIN_WORKER_SECRET`: any long random string, e.g. `openssl rand -hex 32`
   - `SUPABASE_SERVICE_KEY` (`SUPABASE_URL` is already set)
   - Optional: `BRAIN_APPROVERS` (Slack user ids allowed to approve changes), `BRAIN_API_KEYS` (`name:key` pairs for AI agents, keys at least 16 characters), `HUBSPOT_TOKEN` + `HUBSPOT_PORTAL_ID`, `BRAIN_MODEL`, `BRAIN_EFFORT`.
4. **Deploy**, then in Slack: `/invite @brain` to `#ask-the-brain`.
5. **Load knowledge.** HubSpot syncs itself hourly. For transcripts and playbooks:
   `SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node tools/brain-ingest.mjs ./calls --source calls`

## Using it

- `@brain how do we price the annual plan?` → answer in the thread, with sources and a **Wrong? Fix it** button.
- **Fix it** → write the right answer once. Every later answer, for people and AIs, uses it and says so.
- `@brain change: raise the annual prepay discount to 15%` → held as 1-3-1. Nothing changes until an approver clicks Approve; the approved option becomes the rule.
- Agents: `POST /.netlify/functions/brain-api` with `Authorization: Bearer <key>` and `{"question": "…"}`.

## Model and cost

Answers use `claude-opus-5-5` at `medium` effort with server-side fallbacks on (a declined request is retried on Anthropic's recommended model in the same call). Change `BRAIN_MODEL` / `BRAIN_EFFORT` to trade quality for cost. Questions with nothing on file are answered without calling Claude.
