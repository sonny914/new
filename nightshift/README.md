# Night Shift

Claude agents that run a company overnight. Every night a shift wakes up, reads the company's numbers and the founder's notes, picks one to three bets, does the work (research, drafts, product changes) and leaves a brief. Anything that leaves the building waits for a tick from the founder.

It is built on the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk): one `query()` per shift with the night shift's own tools mounted as an in-process MCP server, three subagents (builder, growth, analyst), a permission guard and hard budget caps. GitHub Actions is the scheduler, so there is no server to run.

## The loop

```
          ┌───────────────────────────── one shift ───────────────────────────────┐
 inbox ──▶│ 1 read ticks + founder notes → 2 execute what was approved, verbatim   │
 (ticks,  │ 3 read metrics → 4 agent works (tools, subagents, guard, $ cap)       │──▶ brief + new proposals → inbox
  notes)  │ 5 write journal, memory, outbox → 6 PR for product changes            │──▶ draft PR → you merge → deploy
          └────────────────────────────────────────────────────────────────────────┘
```

## What it may do on its own, and what it may not

| On its own | Only after you tick a box | Never |
| --- | --- | --- |
| Read the product, research the web, analyse metrics | Send an email (exactly the text you saw) | Move money |
| Draft emails, posts and proposals | Post (through your webhook, or you post it) | Edit config, functions, workflows, secrets or itself |
| Edit files under the company's `writable` paths, as a draft PR | Bigger site changes and anything else outward | Run shell commands (off by default) |
| Keep memory and a journal | | Read credentials: the agent process never gets them |

What you approve is what ships. The model writes the email when it proposes it; the runner sends that stored text. Nothing is regenerated after you approve.

## Where things live

- **This folder (public):** the engine, and each company's `company.json` (settings) and `charter.md` (the brief the agent works from).
- **The HQ repo (private, yours):** `state/<company>/` holds memory, the journal, the outbox and meta, plus one issue per company that is the approval inbox. The runner refuses to use a public repo as HQ: briefs carry leads, drafts and strategy.

## Set it up (about 10 minutes)

1. **Create the HQ repo.** On GitHub, create a new private repo (for example `nightshift-hq`) with "Add a README" ticked, so it isn't empty.
2. **Create a token.** Settings → Developer settings → Fine-grained tokens. Access to the HQ repo: Contents read/write and Issues read/write. Access to this repo: Contents read/write and Pull requests read/write.
3. **Add to this repo** (Settings → Secrets and variables → Actions):
   - variable `NIGHTSHIFT_HQ_REPO` = `owner/nightshift-hq`
   - secret `NIGHTSHIFT_TOKEN` = the token
   - secret `ANTHROPIC_API_KEY`
   - optional: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (metrics: counts only, no rows), `RESEND_API_KEY` (sends approved emails; also set `actions.email.from` in `company.json` to a verified sender), `NIGHTSHIFT_POST_WEBHOOK` (receives approved posts as JSON `{id, channel, text}`)
4. **Edit the charter.** `companies/quiet-bands/charter.md` is the job description. Fix the lines marked ASSUMPTION.
5. **Run it once by hand.** Actions → Night Shift → Run workflow. Tick "dry run" first if you want to see it end to end without a model.

After that it runs every night at 03:17 Houston time. Change the `cron` line in `.github/workflows/nightshift.yml` to move it.

## Working with it from your phone

- **The brief** arrives as a comment on the company's issue in the HQ repo, so the GitHub app notifies you.
- **Approve** by ticking a box in the issue body. The next shift carries it out. Unticked proposals expire after `proposalTtlDays` (7).
- **Give direction** by commenting on the issue. Only comments from logins in `founders` count; the agent reads them at the start of the next shift.
- **Product changes** arrive as draft pull requests on this repo. Merging deploys; not merging is a no.

## Cost

Each shift is capped by `budget.maxUsdPerShift` ($3) and `budget.maxTurns` (60). `budget.taskTokens` lets the model see its remaining budget so it wraps up with a brief instead of being cut off. The worst case for one company running nightly is about $90 a month on the default model. Read the real cost from the brief's footer for the first week, then tune it.

## Run it locally

```bash
cd nightshift
npm install
npm test                       # 27 tests, no network
npm run dry                    # the whole loop with a scripted agent, nothing sent
ANTHROPIC_API_KEY=… npm run shift -- --company quiet-bands
```

Without `NIGHTSHIFT_TOKEN`/`NIGHTSHIFT_HQ_REPO`, the inbox is `.state/<company>/INBOX.md` (tick boxes in any editor) and notes go in `.state/<company>/NOTES.md`. `.state/` is git-ignored.

## Add a company

Copy `companies/quiet-bands/` to `companies/<slug>/`, edit `company.json` and `charter.md`. Every enabled company gets a shift each night. Today all companies share one workspace (this repo checkout); a company whose product lives in another repo needs a second checkout step in the workflow.

Connect a company's own tools through MCP in `company.json`:

```json
"mcp": {
  "stripe": { "type": "http", "url": "https://mcp.stripe.com", "headers": { "Authorization": "Bearer ${STRIPE_KEY}" }, "allow": ["list_customers", "list_payments"] }
}
```

Only the tools in `allow` run without asking. Anything else from that server is denied, and the agent is told to propose it instead. Header values take `${ENV}` references; a server with an unset variable is skipped.

## Known limits

- One shift is one context window. Long-term continuity is only as good as the memory file and the journal, which the agent maintains itself.
- The builder edits files; it doesn't run the site's tests or take screenshots (no shell). Review its PRs.
- The guard decides tool calls the SDK asks about. Reads inside the workspace are allowed by the SDK itself, which is why the product checkout carries no credentials.
- Outreach volume is deliberately low (5 emails a shift). Raise `actions.email.maxPerShift` only once replies show the drafts are good.
