# FounderOS file map

Maps the important files and directories of `Bennettxai/FounderOS-DEMO` (commit `ef75fe8`, 2026-09-30, MIT) to what they actually do, so the implementation can be revisited without re-reading 115k lines. Companion to `founderos-deep-dive.md`.

**Class tags** used in the "What it really does" column:
`REAL` works as described with no external dependency · `INTEGRATION` works only with credentials or an external service · `CANNED` returns fixed or seeded content · `DISPLAY` catalogue or presentation only · `EXTERNAL-PROXY` reads from or posts to a system that is not in the repository · `DEAD` well-formed code with no callers · `THEATER` presents capability the code does not have.

Line numbers are for commit `ef75fe8` and are approximate to within a few lines where noted "~".

---

## Root

| File | What it really does | Class |
|---|---|---|
| `README.md` | Public pitch plus architecture notes. Accurate on stack and repo layer; overclaims on knowledge layer ("hybrid retrieval with reciprocal-rank fusion", "Optimal Engine… promotion-gated") which exist only as external services or prose. Links to placeholder `founderos.example.com`. | DISPLAY |
| `CLAUDE.md` | Contributor guide for humans and agents: ports, commands, "demo-first, real-ready" rule, token values, frozen `/org` markup, TDD convention. The most honest single description of the system. | REAL |
| `LICENSE` | MIT, "Copyright (c) 2026 FounderOS". | — |
| `package.json` | Next 14, React 18, Tailwind 3, better-sqlite3, zod, `ai` (Vercel AI SDK), d3-force, lucide-react, simple-icons, imapflow, nodemailer, stripe, @slack/web-api, @notionhq/client, node-ical. Scripts: dev on 4100, test (vitest), typecheck, seed, brain:docs. | — |
| `.env.example` | Every credential slot with honest comments ("Without a key, agent chat reports 'not configured'"; "Trakyo… status-only until Trakyo ships an API"). Reveals the operator's real stack: 4 IMAP inboxes, Slack, Stripe, PayPal, Square, Whop, Notion, WebinarJam, Trakyo, GoHighLevel, Beehiiv, ManyChat, PayKit ×2, Wise ×2, Fathom, Plaud, Whisper, Phantom, Hermes. | — |
| `instrumentation.ts` | Boot hook: warms `/api/analytics/refresh` after 4 s; starts a 5-minute Paperclip model-failover tick and a 60-second cron tick, both as HTTP calls to itself (edge-bundle constraint). Comment admits `agent_crons` "had held schedules since the beginning but nothing ever fired them". | REAL |
| `middleware.ts` | Optional whole-app cookie gate via `FOUNDER_OS_ACCESS_TOKEN`. Off by default. | REAL |
| `tailwind.config.ts` | `os.*` colour aliases over CSS vars; radii (`ctl 6px, panel 10px, tile 12px`); durations (`lens 630ms, press 200ms`); keyframes `om-pop`, `om-shimmer`; both `sans` and `mono` resolve to JetBrains Mono. | REAL |
| `next.config.mjs`, `postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts` | Standard config. | — |
| `.github/workflows/ci.yml` | Tests, typecheck, production build on PR and push. Node 22. | REAL |

## `docs/`

| File | What it really does | Class |
|---|---|---|
| `docs/demo-ui-refresh-2026-09-30.md` | Release note for the public refresh. States the source baseline is "BennettOS 53ca999", that cursor spotlights render nothing, that privacy guards stop the demo reading WhatsApp chats, installed skills, usage transcripts and the G-Brain store, and that 3,464 tests across 313 files pass. The key document for understanding that the demo is a scrubbed port of a private system. | — |

## `agents/`

| File | What it really does | Class |
|---|---|---|
| `agents/brand-deals/skill.md` (208 lines) | System prompt for the brand-deal agent, loaded verbatim. Negotiating persona "Vera". Contains `- [ ]` checkboxes that `skill-file.ts` surfaces as "awaiting from founder". FounderOS's voice; do not copy content. | REAL (prompt) |
| `agents/newsletter/skill.md` (64 lines) | System prompt for the newsletter agent. | REAL (prompt) |

## `lib/` core data layer

| File | What it really does | Class |
|---|---|---|
| `lib/db.ts` (2083) | `openDb(path)`: DDL for 45 tables and 4 indices (`:92-505`), eight hand-written `migrate*` ALTER functions run on every open (`:666-674`, base DDL lags them), 33 repository objects returning Zod-parsed rows (`:676-2041`). All inserts are `INSERT OR REPLACE`. `agentRuns.countReal()` excludes `seed-run-%` (`:925-930`). `deliverableDecisions.set` replaces per id, "one open call per deliverable" (`:1767`). | REAL |
| `lib/data.ts` (59) | `getDb()` singleton; seeds on first touch or when `SEED_VERSION` differs or any key table is empty; `syncSeededProposals` every boot. | REAL |
| `lib/seed.ts` (2000) | All demo content: 6 departments, 32 agents (`:55-495`), 5 people, 37 SOP tasks (`:551-1015`), 35 tools (duplicate `tool-ollama`), 22 roadmap items, 4 metrics ("honest zeros"), 5 social accounts × 91-day synthetic follower ramp (`:1133-1184`), 9 DM messages, 14 funnel journeys / 61 touches with days-ago offsets (`:1296-1491`), 2 workflows, 11 tasks, 12 skills, 309 synthetic agent runs with random token costs and summaries `"${name} completed a run."` (`:1753-1791`), 7 crons (`:1859-1923`), trading fixtures. Reconciling deletes for seed-owned tables (`:1944-1965`). `SEED_VERSION = '2026-09-30-alex-first-name'`. | CANNED |
| `lib/schemas.ts` (892) | ~88 Zod schemas. Every state vocabulary lives here: agent status/tier, task status, funnel stage/channel/source/relationship, deliverable decision kinds, workflow owner/automation state, skill status, brain graph node/edge types. | REAL |
| `lib/paths.ts` (28) | Resolves the data directory: `DATA_DIR` → `/tmp` on Vercel → `cwd/data`. | REAL |
| `lib/personas-seed.ts` (862) | 11 "persona" templates (file says ten) that reskin the OS for other business types. | CANNED / DISPLAY |
| `lib/ledger.ts`, `lib/bank.ts`, `lib/paykit-history.ts`, `lib/statements.ts`, `lib/bank-statements.ts`, `lib/pdf-text.ts` | Sidecar SQLite files for uploaded card/bank statements and PayKit snapshots, deliberately outside the repo layer. | REAL |

## `lib/` demo gate and connectors

| File | What it really does | Class |
|---|---|---|
| `lib/gate.ts` (15) | `isGated()`: true when `DEMO_GATE=1` or `VERCEL` or `RAILWAY_ENVIRONMENT` is set. | REAL |
| `lib/connectors/demo-status.ts` (14) | `GATED` constant and `connected(id, name, kind, detail)`. **On any gated deployment every connector reports `connected` with invented detail.** This is the file that turns the honest-status layer into a façade on the hosted demo. | THEATER |
| `lib/connectors/types.ts` (25) | `ConnectorStatus { id, name, kind, state: connected | not_configured | error, detail, meta? }`, 13 kinds. | REAL |
| `lib/connectors/index.ts` (125) | `CHECKS`: the 25 connectors on the board and `allConnectorStatuses()` / `connectorStatusById()` with error-to-status wrapping. G-Brain reports "knowledge base · 900+ pages · live" when gated (`:33`). | REAL + THEATER when gated |
| `lib/connectors/llm.ts` (208) | Vercel AI SDK through the AI Gateway. Default `anthropic/claude-sonnet-5`; `FREE_TIER_MODELS` fallback chain walked only on model-unavailable errors; `stepCountIs(6)` tool loop; `stub` provider returns `stub-reply: <msg>`; no key throws. | INTEGRATION |
| `lib/connectors/paperclip.ts` (606) | Client for the external Paperclip agent board that "owns the REAL company: Conductor (CEO) → department leads → Hermes worker pool". Agents, org tree, issues, comments, cockpit issue upkeep, model PATCHes for failover, circuit breaker. No creds → `[]` / throw. | EXTERNAL-PROXY |
| `lib/connectors/gbrain.ts` (377) | Shell-out to external `gbrain` CLI (`doctor`, `query`, `stats`, `capture`), text parsing of its output, `localSearch` grep fallback (`:74-95`), `readStoreNotes` walker. Store default `cwd/knowledge/brain-store` (absent). Gated → `demo` provider that refuses capture and returns nothing. | EXTERNAL-PROXY |
| `lib/connectors/optimal.ts` (208) | Fetch client to "Optimal Engine" at `http://127.0.0.1:4200` (`/api/health`, `/api/workspaces`, `/api/grep`, `/api/rag`, `/api/ingest {extract_claims:true}`). The Source → Signal → Claim → Fact → Memory lifecycle is attributed to this service; none of it is in the repo. | EXTERNAL-PROXY |
| `lib/connectors/reranker.ts` (119) | POST to a local llama-server `/v1/rerank` (`qwen3-reranker-0.6b`), 6 s, fails soft. | INTEGRATION |
| `lib/connectors/email.ts` (508) | IMAP via imapflow (up to 4 inboxes), thread fetch, search, flags, attachments; SMTP send via nodemailer. Gated status "4 inboxes · IMAP". | INTEGRATION |
| `lib/connectors/slack.ts` (194) | `auth.test`, channel history, `chat.postMessage`. | INTEGRATION |
| `lib/connectors/whatsapp.ts` (213) | Reads the local macOS WhatsApp `ChatStorage.sqlite` in a SIGKILL-bounded child process. Read-only. | INTEGRATION (local) |
| `lib/connectors/gcal.ts`, `gcal-write.ts` | CalDAV read; OAuth write for attendees. | INTEGRATION |
| `lib/connectors/payments.ts` (518) | Stripe SDK (balance, charges), PayKit, Wise; PayPal/Square/Whop are presence booleans. | INTEGRATION |
| `lib/connectors/attio.ts` (145) | Attio deals query with retry; people/companies join lives in `funnel-live.ts`. Gated "CRM · 42 deals in pipeline". | INTEGRATION |
| `lib/connectors/ghl.ts` (30) | GoHighLevel status by key presence only; data fetch in `funnel-ghl.ts`. | INTEGRATION |
| `lib/connectors/trakyo.ts` (122) | Trakyo attribution: `/v1/metrics`, `/v1/leads`. | INTEGRATION |
| `lib/connectors/zernio.ts` (368) | Late (getlate.dev) posting API: accounts, history, publish, media upload. **Really posts.** When gated and unkeyed returns 10 fabricated posts and a 30-day calendar (`:382-403`). | INTEGRATION + THEATER when gated |
| `lib/connectors/beehiiv.ts` (190) | Newsletter stats per issue. | INTEGRATION |
| `lib/connectors/manychat.ts`, `manychat-webhook.ts` | Instagram DM automation: `getInfo`, `sendContent`; inbound only via webhook because the API cannot list DMs. | INTEGRATION |
| `lib/connectors/plaud.ts` (280), `fathom.ts`, `docusign.ts`, `loom.ts`, `miro.ts`, `arcads.ts`, `foreplay.ts`, `meta-ads.ts` | Recorders, e-sign, oEmbed, boards, creative, ad library, ads. `meta-ads.ts` is key-presence only (no HTTP). | INTEGRATION (meta-ads CANNED) |
| `lib/connectors/wispr.ts`, `obsidian.ts`, `local-stack.ts` | Local SQLite dictation reader, vault walker, port/binary pings. | INTEGRATION (local) |
| `lib/connectors/superset.ts` (130) | Shells `superset workspaces create --agent claude` for the Conductor's `/ui` dispatch. | EXTERNAL-PROXY |
| `lib/connectors/claude-usage.ts`, `codex-usage.ts`, `ollama-usage.ts` | Parse local Claude Code / Codex JSONL transcripts for the `/usage` board. | INTEGRATION (local) |
| `lib/connectors/brand-deals.ts` (209) | Notion data-source query for brand deals, else 4 seeded examples. Note `db.brandDeals` has no writer anywhere. | INTEGRATION / CANNED |
| `lib/connectors/robinhood.ts`, `phantom.ts` | Status from pushed trading snapshots; public Solana RPC. | INTEGRATION |
| `lib/creds.ts` (151), `lib/keys.ts` (108), `lib/oauth/*` | Credential resolution (`.env.local` → `process.env` → `~/.founder-os/.env`), admin key slots, OAuth providers (github, google PKCE, slack, notion, hubspot, linear, stripe-connect, zoom, jira, vercel) saving tokens into `.env.local`. | REAL |
| `lib/integrations-catalog.ts`, `lib/integrations-volume.ts` | Catalogue of integrations for the Connections board; meter numbers. | DISPLAY |
| `lib/mail-guard.mjs` (85) | Outbound mail guard: refuses recipients not in an internal allowlist unless `MAIL_ALLOW_EXTERNAL=1`; bans the `founder@` From. Tested. | REAL |

## `lib/agents/`

| File | What it really does | Class |
|---|---|---|
| `lib/agents/runtime.ts` (104) | `RuntimeAgent { id, name, description, departmentId, run(), respond?(), chatTools?() }`; `createRuntime` with `run(id)` → `agent_runs` insert and `broadcast(message)` → every agent in parallel → `broadcast_replies`. | REAL |
| `lib/agents/real.ts` (533) | The 32 agents. Two call a model (via `brand-deal-agent.ts`, `newsletter-agent.ts`); about 26 return a connector status; `plannedLaneRun` always fails with "lane planned" (`:87-89`); `envIntegrationRun` is ok iff an env var exists (`:78-85`); `client-roster` counts seeded funnel rows. Only `data-agent` implements `respond()`. | CANNED / INTEGRATION |
| `lib/agents/conductor.ts` (65) | In-process router: `@slug` match, else one LLM call "Reply with ONLY that agent id", else `(found ?? routable[0]).id` (`:38`) which is `brand-deal-agent`. Reached only via `POST /api/agents/conductor/chat`; no component calls it. | REAL but unused by UI |
| `lib/agents/chat.ts` (86) | Per-agent chat: system prompt (identity, "READ-ONLY", ambient pack, screen context ≤4000 chars), full `agent_messages` history replayed every turn, `searchBrain` tool. | INTEGRATION |
| `lib/agents/ambient.ts` (110) | 900-char "what the OS knows right now" pack: own last run, up to 3 failing agents, open task count, "use searchBrain before stating any fact". 60 s cache. SQLite only. | REAL |
| `lib/agents/brain-tool.ts` (36) | `searchBrain` tool returning `{ranked, hits}` or `{error, hits: []}` so the model can tell unreachable from empty. | REAL |
| `lib/agents/brand-deal-agent.ts` (85), `brand-deal-triage.ts` (135) | Rules compute an urgency-ranked action list (`overdue 100 … stale-inbound 20`); the model writes the prose from `skill.md` and may not add, drop or reorder. In the demo the table is all seeded, so it returns without calling the model. Description claims a contact governor gates threads; the code never calls it. | REAL rules; INTEGRATION prose |
| `lib/agents/contact-governor.ts` (133) | Deal-thread cadence state machine: 9 states → `reply-now | wait | bump | revival | none`, `MAX_BUMPS=5`, 3 business-day bump interval, 30-day revival minimum, 180-day cooldown, human override, every refusal with a reason. 14 tests. **No callers.** | DEAD (good) |
| `lib/agents/newsletter-agent.ts`, `newsletter-brief.ts` | Beehiiv stats → deterministic brief → model prose. Fails before the model without keys. | INTEGRATION |
| `lib/agents/skill-file.ts` (40) | Reads `agents/<folder>/skill.md`; extracts `- [ ] **…**` as open questions. | REAL |
| `lib/agents/activity.ts`, `run-digest.ts` | Derived activity feed (runs + messages + broadcasts); run digests. | REAL |
| `lib/agent-failover.ts` (303) | Pure planner that moves Paperclip seats off exhausted models along an acyclic ladder; applied by `/api/agents/failover`. Nothing to do with the in-repo gateway. | EXTERNAL-PROXY |
| `lib/agent-costs.ts` (149) | Hard-coded model pricing table; prices runs. Seeded runs get random costs. | REAL / CANNED |
| `lib/agents-volume.ts`, `lib/agent-wiki.ts`, `lib/agent-avatars.ts` | Meter numbers; wiki lookups per agent/tool with hard-coded `MCP_SLUGS`; avatar mapping. | DISPLAY |

## `lib/` knowledge, graph, memory

| File | What it really does | Class |
|---|---|---|
| `lib/knowledge-graph.ts` (268) | `buildKnowledgeGraph(agents, departments, people, sopTasks, boardAgents)` → `KGNode { id, kind, label, ring, color? }`, `KGEdge { source, target, kind }` (no weight). Edge kinds pillar/sop/does/member/uses/reports/board, each from a seeded relationship. Shared tools duplicated per department. `graphDirectory` for the side list. | REAL derivation |
| `lib/tree-layout.ts` (415) | Radial sunburst rest layout with density-weighted sectors, bottom-up department tree with depth bands, focus wheel, quadratic edge arcs. | REAL |
| `lib/graph-lens.ts` (140) | Entity / function / action lenses. Entity by node kind; function and action lenses are hard-coded dept sets and agent-id rosters ("honest best-fit"). | DISPLAY |
| `lib/neural-layout.ts` (127) | Fixed-column layout for the neural view; `strandWeight` = hash of id pair → sign and magnitude. Fake weights. | THEATER |
| `lib/memory-core.ts` (633) | Misnamed: the centre "memory disc" visualisation. `distillMemoryGraph` (cap 120 pages), `demoMemoryGraph` (8 folders × 15 pages, random wikilinks, `:43-95`), server-side O(n²) spring layout, camera rects. No memory lifecycle. | REAL viz; CANNED in demo |
| `lib/brain-graph.ts` (465) | Parses markdown notes, resolves `[[wikilinks]]`, "embeds" with a hashed bag-of-words → PCA 2D ("lexical stand-in"), nearest-neighbour `similar` edges. ~9 s for ~2,000 notes. | REAL (lexical) |
| `lib/brain-constellation.ts` (128) | Composes store + vault → graph → distil → fallback to demo; 5-minute cache. | REAL |
| `lib/brain.ts` (60) | Provider selection: `federated` (default) / `optimal` / `gbrain` / `stub`; gated → `demo`. | REAL |
| `lib/brain-federated.ts` (123) | Optimal + gbrain merged by concatenation and title dedupe; 60 s write-off after a refusal. Not RRF. | REAL |
| `lib/brain-retrieval.ts` (101) | Pool 15 → optional cross-encoder rerank → top 3; `ranked: 'rerank' | 'provider'`. | REAL |
| `lib/memory-provider.ts` (427) | Read-only brief for external workers: `MEMORY_BUDGET_CHARS 6000`, weight table, strict-priority truncation, honesty banners, `remember()` → brain capture. Facts from `agent_runs`, `agent_tasks`, `comms_digests`. | REAL |
| `lib/memory-search.ts` (29) | Label-prefix > substring > folder > excerpt scoring for the vault search. | REAL |
| `lib/brain-wiki.ts` (152), `lib/brain-docs.ts` (192), `lib/brain-dump.ts` (100), `lib/brain-audit.ts`, `lib/brain-satellites.ts`, `lib/brain-viz.ts` | Wiki index from notes; generator of markdown pages from seeded tables (not shipped; "Trigger / Definition of done / Escalation" templated); brain dump writes a markdown file then tries capture; store audit; satellites and old ring viz. Three different default store paths across `gbrain.ts`, `brain-dump.ts`, `scripts/generate-brain-docs.ts`. | REAL tooling; unused in demo |
| `lib/life-map.ts` (236) | Static taxonomy: 7 life areas with colours, agents, brain folders; `CONTACT_TIERS` (T1 client/student, T2 brand/partner/lead, T3 personal/friend/community). | DISPLAY |
| `lib/screen-context.ts` (235) | Route-switched one-line context for chat ("<title> view of Founder OS.") plus a static quick-action table; funnel route gets 3–4 real lines. | REAL, shallow |
| `lib/kg-colors.ts`, `lib/raf-throttle.ts`, `lib/hooks/useLens.ts` | Theme-remappable node colours; one React tick per frame; document-level pointer listener for hover tilt (unrelated to graph lenses). | REAL |

## `lib/` CRM, comms, content, social, finance

| File | What it really does | Class |
|---|---|---|
| `lib/funnel.ts` (245) | Stages `first_touch → engaged → nurtured → opted_in → converted`; `journeyMeta` (stalled >7 d, decayed >90 d, decay ramp day 21–90); `attentionQueue` pushNow / saveNow; organic vs ads by first touch channel. | REAL rules |
| `lib/funnel-compose.ts` (78) | `Promise.all([attio, ghl, stripe])` → live if any, else seeded journeys. | REAL |
| `lib/funnel-live.ts` (283) | Attio deals → journeys: 10 Attio stages mapped to 5; `icpScore` = field-completeness points; synthesised "Progressed to X" touches; venture by regex on deal name. | INTEGRATION |
| `lib/funnel-ghl.ts` (186), `funnel-stripe.ts` (230), `funnel-trakyo.ts` (160) | GHL pipeline position → stage; Stripe charge → converted/hot/100 by email or name match; Trakyo first-touch attribution swapping the first touch. | INTEGRATION |
| `lib/funnel-contact.ts` (36) | `lastMessageFor`: scans the live comms feed in memory by exact email or ≥5-char name substring. The only bridge between funnel and comms. | REAL, fragile |
| `lib/funnel-radial.ts` (136), `funnel-viz.ts` (53), `funnel-volume.ts` | Acquisition wedge by Trakyo stamp else keyword regex over the touch label; colours; meters. | REAL / regex |
| `lib/comms.ts`, `comms-lanes.ts` (139), `comms-panes.ts`, `comms-feed.ts`, `comms-volume.ts` | `CommsItem` shape; one lane per IMAP inbox plus WhatsApp; three-pane derivations; optimistic local archive/snooze. | INTEGRATION |
| `lib/comms-digest.ts` (369), `comms-digest-run.ts` (140) | Rules-only morning report: tiers `call > client > people > branddeal > group > noise` by calendar names, Attio names, regexes; carried entries keep `firstSeenAt` up to 30 days; stored as a JSON blob. No LLM. | REAL rules |
| `lib/comms-gravity.ts` (96) | Work / personal / misc lanes with priority-tier "gravity". Component is unmounted. | DEAD |
| `lib/email-thread.ts`, `email-list.ts`, `slack-clients.ts`, `call-archive.ts` (448), `plaud-ingest.ts` (209), `recordings*.ts`, `telegram-bridge.ts` | Thread shaping; Beehiiv subscriber snapshots; Slack client cards (`waiting: 'you'` hard-coded); Attio/Fathom transcript export to markdown; Plaud → markdown + Optimal claims ("No LLM runs anywhere in this path"); phone front door to the Paperclip cockpit (allowlist). | INTEGRATION |
| `lib/content.ts`, `content-volume.ts`, `posting-activity.ts`, `newsletters.ts`, `newsletter-volume.ts`, `lead-magnet-volume.ts` | Content crew = marketing agents; meters; posting activity from Late history; 4 seeded newsletter issues labelled as seeded. | DISPLAY / CANNED |
| `lib/social.ts` (379), `social-live.ts`, `social-chart.ts`, `social-volume.ts`, `growth.ts`, `engagement.ts` | Follower series (seeded ramp, live today-point), `postingSeries` deterministic fake ("Seeded dummy until a real published-posts pull lands"), charts, growth windows. | CANNED / INTEGRATION |
| `lib/brand-deals-view.ts` (211) | Deal board derivations. Reads Notion or 4 seeded deals. | DISPLAY |
| `lib/finances.ts`, `finances-volume.ts`, `spend-report.ts`, `operating-metrics.ts`, `live-metrics.ts` (153), `pulse-history.ts`, `analytics*.ts`, `metric-snapshots` | Finance views over Stripe/PayKit/Wise and uploaded statements; `live-metrics.ts` enforces `null ≠ 0` because "seeded zeros were being quoted to the operator as fact". | REAL / INTEGRATION |
| `lib/ventures.ts` (102) | Two hard-coded ventures: Vantage (AI agency, `#00ffaa` "sampled from the Vantage logo") and Launchpad Cohort (`#d9263f`). | CANNED |
| `lib/trading-*.ts`, `crypto-*.ts`, `etf-candles.ts` | Guardrails (deny-by-default `checkOrder`, `LIMIT_BOUNDS`), strategy, backtest, indicators. Data pushed by an external runner. | REAL rules / INTEGRATION |
| `lib/adpilot.ts`, `adpilot-data.ts`, `foreplay/*` | Paid-media planner over a staged JSON and the Foreplay ad library. | CANNED / INTEGRATION |

## `lib/` boards, workflows, skills, blueprint, scheduling

| File | What it really does | Class |
|---|---|---|
| `lib/board-live.ts` (174), `board-deliverables.ts` (261), `board-approvals.ts` (212) | Reads Paperclip issues/agents; reads deliverable files from `~/.paperclip/instances/default/workspaces/*/deliverables/`; classifies approval kind by filename regex (`staged, decision, gate, request, draft, done, output`) and ranks overdue → person → deadline → rest ("ranked by the Conductor"). | EXTERNAL-PROXY |
| `lib/deliverable-decisions.ts`, `deliverable-revision.ts`, `deliverable-snooze.ts`, `deliverable-brief.ts`, `deliverable-preview.ts`, `deliverables-opened.ts`, `deliverables-seen.ts` | Decision upsert bound to a revision hash (mtime|size or meta|url|code); snooze in localStorage only; briefs and previews. | REAL |
| `lib/sop-playbooks.ts` (717) | Hand-authored prose per SOP (autonomy ladder, "replaces a $90–120k ops lead", build notes); `skillFileMarkdown` template ending "Dummy skill file" (header admits it). Feeds one card on `/brain`. | DISPLAY / THEATER |
| `lib/skills-catalog.ts` (196), `skills-volume.ts` | Reads `~/.claude/skills/*/SKILL.md` and plugins for display; `[]` when gated. Seeded `skills` table is never read by any agent. | DISPLAY |
| `lib/scheduled-jobs.ts`, `cron-scheduler.ts` (119), `cron.ts` | `dueCrons` with 8-day catch-up; fired by the 60 s tick. `cron.ts` header is stale ("the actual runner lands with the dedicated host"). | REAL |
| `lib/blueprint/compile.ts` (367), `graph.ts`, `hierarchy.ts` (486), `hierarchy-layout.ts` (453) | Compiles a system graph from the agent/department/skill/people tables, runtime registry, connector statuses, nav and a hand-written infra inventory; `validateGraph` rejects dangling edges. `hierarchy.ts:252` synthesises a "Department routing" node whose rule text describes routing that does not exist. | REAL self-description + one THEATER node |
| `lib/interject.ts` (72) | Two-regex router: task / agent → Paperclip issue; note → brain capture. | REAL |
| `lib/hierarchy.ts`, `personnel.ts`, `org-live.ts` | Org tree from `parentId`; two hard-coded department heads; live overlay by name match against Paperclip. | REAL / CANNED |
| `lib/nav.ts` (89) | Single source of truth for sidebar groups; `DIGIT_VIEWS` = first nine. | REAL |
| `lib/palette.ts` (131) | ⌘K entries: Go (views + aliases), Run (agents), Ask (Conductor prompts); every-word-must-match filter. | REAL |
| `lib/theme.ts` (47) | Six themes, `DEFAULT_THEME = 'mono'`, pre-paint inline script, localStorage key `alex-theme`. | REAL |
| `lib/cohort.ts` (37) | Cohort CTA copy and URL (`founderos.example.com`) for banner and first-run modal. | DISPLAY |
| `lib/access-gate.ts`, `lib/gate.ts` | Cookie gate decision logic; demo gate predicate. | REAL |
| `lib/usage.ts` (629), `usage-volume.ts` | Token-burn board from pushed snapshots and local transcripts. | INTEGRATION (local) |
| `lib/markdown-blocks.ts`, `cards.ts`, `short-labels.ts`, `calendar-layout.ts`, `composer.ts`, `cockpit-issue.ts` | Markdown rendering, card helpers, label dedupe, calendar lane packing, composer state, cockpit-issue repair invariants. | REAL |

## `app/` pages and API

| Path | What it really does | Class |
|---|---|---|
| `app/layout.tsx` (70) | Shell: Sidebar, Topbar, LensProvider, ConductorPanel, CohortModal, CohortBanner after every view; theme script; JetBrains Mono. | REAL |
| `app/globals.css` (3345) | The entire visual system: six theme token blocks (`:68-349`), motion tokens on bare `:root` (`:11-13, 397-411`), `.pressable` hover lens and press sink (`:413-497`), rise/draw/fill/grow/sweep keyframes (`:592-659`), reduced-motion guards, status dots (`:758-786`), agent-live orbit (`:1213-1270`), knowledge-graph synapse flows (`:886-915`), slab kit (`:3236-3345`), Blueprint and AdPilot fenced exceptions. | REAL |
| `app/template.tsx`, `app/loading.tsx`, `app/*/loading.tsx` | Per-navigation `view-in` slide; slab-shaped skeletons. | REAL |
| `app/page.tsx` (374) | Operator console: pulse tiles (honest zeros), connections strip, agent list, "Needs You", G-Brain core. `ConnectorBars` is "an honest stand-in for a time series we don't store"; `HealthMeter` is ten cells. | REAL display of seeded/empty data |
| `app/brain/page.tsx` (127) | Builds the knowledge graph from four tables plus a live Paperclip call, the memory constellation, the wiki index, and recent runs; hands them to `BrainGraphView`. Reads several tables 2–3 times. | REAL |
| `app/funnel/page.tsx` (606) | Space and radial funnel views, attention rail, journeys table, stage filters, live last-message fetch. | REAL over seeded/live |
| `app/comms/page.tsx` (171) | Three-pane inbox plus digest and recordings tabs. Empty without creds. | INTEGRATION |
| `app/org/page.tsx` (331) | Operator → Conductor card → pillars → worker pills. Data-driven inside frozen JSX; operator "Alex" hard-coded. | REAL / CANNED |
| `app/agents/page.tsx`, `chats/page.tsx`, `tasks/page.tsx`, `skills/page.tsx`, `workflows/page.tsx`, `blueprint/page.tsx` | Roster with Run; chat hub (Paperclip proxy); task board with crons; skills catalogue; workflow tree + builder; blueprint canvas. | REAL / EXTERNAL-PROXY / DISPLAY |
| `app/social/**`, `content/**`, `brand-deals/`, `finances/`, `trading/`, `adpilot/`, `doctor/`, `usage/`, `integrations/`, `analytics/`, `roadmap/`, `reference/`, `personas/` | Remaining views; see deep dive section 3.3. | mixed |
| `app/api/agents/[id]/run/route.ts` | `runtime.run(id)` → `agent_runs`. | REAL |
| `app/api/agents/[id]/chat/route.ts` | Per-agent LLM chat; `conductor` id routes through `lib/agents/conductor.ts`. Not called by UI for the Conductor. | INTEGRATION |
| `app/api/agents/broadcast/route.ts`, `activity/`, `work/`, `failover/` | Broadcast to all agents; derived activity feed; task and cron CRUD; Paperclip failover application. | REAL / EXTERNAL-PROXY |
| `app/api/conductor/chat/route.ts` | POST → comment on the Paperclip "Founder OS Cockpit" issue; GET → thread. 502 without creds. **This is what every Conductor surface in the UI calls.** | EXTERNAL-PROXY |
| `app/api/conductor/context/route.ts`, `dispatch/route.ts` | Route-keyed context + quick actions; `/ui` → shells `superset`. | REAL / EXTERNAL-PROXY |
| `app/api/brain/route.ts`, `brain/graph`, `brain/dump`, `brain/overview`, `brain/satellites` | `?q=` → `retrieveBrain`; bare GET → provider status; markdown graph with vectors (unpaginated); dump writes a file then tries capture. | INTEGRATION |
| `app/api/memory/route.ts` (90) | GET budgeted markdown brief for external workers; POST → brain capture. Optional bearer token. | REAL / INTEGRATION |
| `app/api/board/**` | Paperclip issues, deliverables, decisions (bulk is dismiss-only: "approve means send"), agent run. | EXTERNAL-PROXY / REAL |
| `app/api/cron/tick/route.ts`, `cron/run/route.ts` | Due-cron execution and manual fire → `cron_runs`. | REAL |
| `app/api/funnel/route.ts`, `funnel/lead-message/` | GET journeys; live last message (4 s budget). No writes. | REAL |
| `app/api/comms/**` | Digest run/read, email thread/search/attachment/action, reply (SMTP/Slack behind the mail guard). | INTEGRATION |
| `app/api/social/**`, `webhooks/manychat/` | Follower sync, posts (really publishes via Late), media upload, DM reply, ManyChat inbound. | INTEGRATION |
| `app/api/workflows/**` | CRUD; `draft/logic.ts` shells `claude -p --output-format json`, retries once, never writes DB. | REAL / EXTERNAL-PROXY |
| `app/api/connections/**`, `oauth/**`, `admin/keys/**` | Statuses, connect (writes `.env.local`), OAuth start/callback, key slots with test. | REAL |
| `app/api/lead-magnets/**`, `contacts/tags/`, `interject/`, `plaud/ingest/`, `trading/**`, `usage/**`, `analytics/refresh/`, `blueprint/ask/` | Lead magnet CRUD; tag upsert (no UI); interject router; Plaud ingest; trading pushes; usage push; 15-minute refresh sweep; blueprint Q&A (real LLM, 503 without key). | REAL / INTEGRATION |

## `components/`

| File | What it really does | Class |
|---|---|---|
| `components/KnowledgeGraph.tsx` (2858) | The radial knowledge graph: d3-force sim with six forces plus a custom stage force (`:641-773`), rest/tree/wheel targets, home tween (`:896-925`), rAF loop for wheel rotation, disc rotation, 14 hash-walked synapse sparks and time-driven comm pulses (`:875-1083`), viewBox camera with counter-scaled labels, hover chain lighting (`:380-406`), click focus (`:1684-1737`), drag/zoom/pan (`:1939-2047`), lenses, vault search, memoised constellation (`:1254-1376`), detail cards, injected keyframes (`:2558-2634`). | REAL derivation, THEATER motion |
| `components/KnowledgeDetail.tsx` (1082) | Detail cards: agent harness, tool (demo: "no page in the brain-store yet"), SOP (playbook prose; help button has no handler `:891-893`), head, human, memory note (templated excerpt), memory core (static overclaiming prose `:677-682`), person (unverified path). | DISPLAY |
| `components/KnowledgeGraphFullscreen.tsx` (259), `BrainGraphView.tsx` (103), `GraphDirectory.tsx`, `GraphNodeCard.tsx` | Fullscreen portal with resizable directory; code-split loader with pillar chips and Radial/Neural tabs; side directory; sticky node card with a real `gbrain ›` query. | REAL |
| `components/NeuralGraph.tsx` (335), `NeuralDetail.tsx` | Neural view with hash-weighted strands, bloom passes, hover zoom; detail overlay "so the network never reflows". | THEATER weights, REAL interaction |
| `components/BrainViz.tsx`, `BrainCore.tsx`, `BrainQuery.tsx`, `BrainDump.tsx`, `BrainSatellites.tsx`, `PersonaBrainGraph.tsx` | Older ring viz; home core; `gbrain ›` query card; dump form; satellites; persona graph with hash dot field. | DISPLAY / INTEGRATION |
| `components/FunnelSpace.tsx` (304), `FunnelRadial.tsx` (373), `FunnelNodeCard.tsx` (234), `FunnelGraphsLazy.tsx`, `FunnelLayoutToggle.tsx` | Space view (x = stage hub, radius by likelihood 2.5–5.5 px, orbit by likelihood + noise, colour by decay, entry replay of real stage path, Fullscreen API "built to be filmed"); radial wheel (wedge = acquisition, ring = stage, depth partly noise); pinned 340px dossier WHO / WHERE / HOW with live last message. | REAL encoding + noise |
| `components/ConductorPanel.tsx` (468), `ConductorChat.tsx` (210), `ConductorComposer.tsx`, `ConductorCard.tsx` (141), `ConductorEmblem.tsx`, `ChatHub.tsx` (316) | Dock that pushes content; chat that posts to `/api/conductor/chat` and polls every 4 s up to 150 s; composer with `/ui` dispatch; `/org` card that broadcasts to all agents; emblem that sweeps only while thinking. | EXTERNAL-PROXY |
| `components/CommandPalette.tsx` (239) | ⌘K: Go / Run / Ask, digit jumps, raw text to the Conductor, kind-coloured glyph tiles, "Conductor listening" LED. | REAL |
| `components/Sidebar.tsx` (246), `Topbar.tsx`, `PageHeader.tsx`, `PageSkeleton.tsx` | Resizable sidebar publishing `--sidebar-w`; footer "7/12 systems live" from a real fetch and host from `window.location.host`; breadcrumb; 25px uppercase title with `//` eyebrow; slab skeletons. | REAL |
| `components/terminal.tsx` (166) | Shared primitives: `Dot` (state mapping table), `Badge` (oklab tints), `Label` (10px caps + fill rule), `SectionHead`, `Kbd`, `SparkBars` (3px floor), `Spark`. | REAL |
| `components/slab.tsx` (213), `slab-charts.tsx` (123), `motion.tsx` (34) | Slab kit: `Slab`, `SlabTitle`, `SlabCard`, `BigStat`, `Chip`, `MeterStack`, `InsightCard` ("the ONE gradient card a page may carry"); `StepLine`, `DotMatrix`; `Rise` sets `--rise-i`. | REAL |
| `components/Pressable.tsx`, `AsyncButton.tsx` (89), `SlidingTabs.tsx`, `CountUp.tsx`, `Spotlight.tsx` (3), `Toaster.tsx`, `Synthesizing.tsx`, `VolumeMeter.tsx` | Hover-lens control; idle → busy → done button; sliding tab indicator; count-up from last value; **Spotlight is a stub returning null**; toast with 1px timer; braille spinner with verbs; glowing meter. | REAL |
| `components/CommsThreePane.tsx` (439), `CommsBoard.tsx`, `CommsDigestPanel.tsx`, `CommsTabs.tsx`, `CommsGravity.tsx` (345), `InstagramDmInbox.tsx`, `SlackClientBoard.tsx`, `WeekCalendar.tsx`, `RecordingsBoard.tsx` | Inbox panes (reply without threading headers), digest, tabs, **CommsGravity unmounted**, DM inbox, Slack cards, meetings calendar, recordings. | INTEGRATION / DEAD |
| `components/NeedsYouList.tsx` (362), `TaskReviewPanel.tsx` (250), `DeliverablesList.tsx`, `HomeNeedsYou.tsx`, `useDeliverables.ts` (306), `BoardLive.tsx` (394), `BoardTasks.tsx`, `BoardTaskCard.tsx`, `board-live-store.ts` | Approval queue over external deliverable files; "send it" button writes a decision row; "ranked by the Conductor" = sort; board views over Paperclip. | EXTERNAL-PROXY |
| `components/AgentsTabs.tsx`, `AgentReasoning.tsx`, `AgentAvatar.tsx`, `ContentAgentCard.tsx`, `OrgWorkerPill.tsx`, `RunVolumeCard.tsx`, `AgentsVolumePanel.tsx`, `ScheduledTasks.tsx` (335), `TaskBoard.tsx`, `TaskCronStrip.tsx` | Agent roster tabs; trading reasoning rows; avatars; run pills; cron add/run/pause/delete; task board. | REAL |
| `components/WorkflowBuilder.tsx` (589), `WorkflowTree.tsx` (654) | CRUD form and tree renderer for non-executing workflows. | DISPLAY |
| `components/blueprint/*` (HierarchyCanvas 441, HierarchyWorkspace 291, HierarchyInspector, HierarchyNode, HierarchySearch, AskBar, icons) | Blueprint canvas with focus blur, inspector, search, LLM ask bar. Fenced colour exception. | REAL |
| `components/SkillsGrid.tsx`, `PersonasViewer.tsx`, `PersonaOrgChart.tsx`, `RoadmapBoard.tsx`, `PillarRadar.tsx` | Catalogue grids; persona viewer; roadmap; layer-sifting radar. | DISPLAY |
| `components/HomeSocialGraph.tsx` (408), `AudienceConsistency.tsx` (397), `AudienceConsistencyLazy.tsx`, `SocialStatStrip.tsx` (430), `SocialStats.tsx`, `FollowerBarChart.tsx`, `SharePie.tsx`, `AudiencePie.tsx`, `PostComposer.tsx` (254), `NewsletterList.tsx` | Follower charts (not a graph despite the name), fullscreen modals, stat strips, pies with clockwise sweep, composer that really posts via Late. | REAL / INTEGRATION |
| `components/brand-deals/DealBoard.tsx` (553), `trading/TradingBoard.tsx` (547), `adpilot/*` (AdLibrary 916, AdPilotDeck 449, Globe 303) | Slab pages with hatched funnels, meters, 460px drawers, honest badges; 2D canvas globe with inertia. | REAL display over seeded/live |
| `components/BusinessIncomeChart.tsx`, `MonthlyExpenses.tsx`, `ExpenditureReport.tsx`, `StatementUploader.tsx`, `PipelineChart.tsx` (273) | Finance charts; statement upload; pipeline chart with column-header filters and masks. | REAL |
| `components/IntegrationBrowser.tsx`, `IntegrationCategory.tsx`, `ConnectFlow.tsx` (232), `ConnectionCard.tsx`, `ApiKeys.tsx` (190) | Connections board; paste-a-key flows; masked key slots with test. | REAL |
| `components/CohortBanner.tsx`, `CohortModal.tsx` | Footer CTA on every view; one-time welcome modal (localStorage). | DISPLAY |
| `components/Markdown.tsx`, `LeadMagnets.tsx`, `NewLeadMagnet.tsx`, `LeadMagnetRowActions.tsx`, `DoctorChecks.tsx`, `DoctorRun.tsx`, `DoctorRerun.tsx`, `UsageBoard.tsx` (529), `ThemeToggle.tsx`, `OsMark.tsx`, `VantageMark.tsx`, `XLogo.tsx`, `SparkIcon.tsx`, `CopyLink.tsx`, `TradingLimits.tsx`, `AgentTradeChart.tsx`, `InterjectComposer.tsx`, `useSvgCamera.ts` (137) | Misc. `useSvgCamera` is a rAF camera for other SVG scenes, not used by `KnowledgeGraph`. | REAL |

## `public/`, `scripts/`

| Path | What it really does | Class |
|---|---|---|
| `public/logos/*.png` | Vendored favicons for Attio, Beehiiv, DocuSign, GoHighLevel. No licence grant; do not copy. | — |
| `public/os-emblem.png`, `vantage-emblem.png`, `vantage-mark.png` | The operator's own marks. Do not copy. | — |
| `public/adpilot/globe-dots.json` | Baked coastline samples for the canvas globe (empty in this checkout). | — |
| `scripts/seed.ts` | Opens the DB file and runs `seedDatabase`. | REAL |
| `scripts/generate-brain-docs.ts` | Writes generated markdown pages to `BRAIN_DOCS_DIR ?? GBRAIN_STORE ?? ~/knowledge/brain-store`. | REAL tooling |

## `tests/` (313 files, ~37k lines) — the ones that reveal contracts

| File | What it pins |
|---|---|
| `tests/seed.test.ts` | Every seeded agent has a `RuntimeAgent` (`:37-45`); re-seed idempotent; reading every table parses. |
| `tests/demo-refresh.test.ts` | No cursor glow rendered; home uses the slab and a generic operator; **source must not match** `bennett|merydian|larps-mac|tail090dce|clue-agent|agency accelerant`. |
| `tests/demo-host-privacy.test.ts` | Gated demo never reads local chats, installed skills, or the brain CLI/store. |
| `tests/interaction-layer.test.ts` | "Bennett OS Interaction Rebrand, 2026-09-07": `.pressable`, lens durations, no `.hoverable`, border-radius never in transitions, reduced motion kills transforms, round dots, pill badges, `useLens` single listener. |
| `tests/rebrand-acceptance-1i.test.ts` | Motion tokens verbatim; `transition-all` / `transition-colors` banned; status colours banned from selection; radius never animates. |
| `tests/css-vars-defined.test.ts` | Every `var(--…)` used in app/components/lib is defined somewhere. |
| `tests/os-motion-pages.test.ts`, `tests/home-slab.test.ts`, `tests/slab-kit.test.ts`, `tests/brand-deals-slab.test.ts` | Minimum staggered `Rise` blocks per page; `[data-part]` only inside `.os-slab`; insight card exactly 8 ticks and a token base; derived tokens never raw hex. |
| `tests/knowledge-graph.test.ts`, `tests/brain-canvas.test.ts`, `tests/graph-lens.test.ts` | Graph derivation and monogamy rule; demo graph >100 nodes, deterministic, no personal data; lens sets. |
| `tests/conductor.test.ts`, `tests/llm.test.ts`, `tests/agent-chat.test.ts` | Router picks "a valid non-conductor agent"; stub provider; chat prompt shape. |
| `tests/brand-deal-agent.test.ts`, `tests/contact-governor.test.ts`, `tests/mail-guard.test.ts`, `tests/deliverable-decisions.test.ts`, `tests/board-approvals.test.ts`, `tests/cron-scheduler.test.ts`, `tests/failover-no-flap.test.ts` | The rule engines and guards that are genuinely tested. |
| `tests/brain.test.ts`, `tests/brain-retrieval.test.ts`, `tests/memory-provider.test.ts`, `tests/gbrain.test.ts` | Provider selection, pool/rerank/top-3, brief budget and banners, CLI parsing and grep fallback. |
| `tests/cohort.test.ts` | Banner and modal contract; `COHORT_URL` is `https://founderos.example.com`. |
| `tests/blueprint.test.ts`, `tests/workflows-draft.test.ts`, `tests/sop-playbooks.test.ts` | Blueprint completeness; `claude -p` draft parsing; playbook coverage. |
| `tests/code-splitting.test.ts`, `tests/loading-states.test.ts`, `tests/empty-states.test.ts`, `tests/client-boundary.test.ts` | Heavy visuals behind `next/dynamic`; every route has a skeleton; empty states are sentences; server/client boundaries. |

## Quick lookups

- **Where the demo lies:** `lib/connectors/demo-status.ts`, `lib/gate.ts`, `lib/connectors/zernio.ts:382-403`, `lib/connectors/index.ts:33`, `components/KnowledgeDetail.tsx:677-682`, `lib/blueprint/hierarchy.ts:252`, `lib/sop-playbooks.ts:12-14`.
- **Where the model is actually called:** `lib/connectors/llm.ts`, `lib/agents/chat.ts`, `lib/agents/conductor.ts`, `lib/agents/brand-deal-agent.ts`, `lib/agents/newsletter-agent.ts`, `app/api/blueprint/ask/route.ts`; via CLI in `app/api/workflows/draft/logic.ts`.
- **Where context is assembled:** `lib/agents/ambient.ts`, `lib/screen-context.ts`, `lib/memory-provider.ts`, `lib/agents/brain-tool.ts`.
- **Where the good rule engines live:** `lib/agents/brand-deal-triage.ts`, `lib/agents/contact-governor.ts` (unused), `lib/comms-digest.ts:171-216`, `lib/trading-guardrails.ts`, `lib/mail-guard.mjs`, `lib/deliverable-revision.ts`.
- **Where the visual grammar lives:** `app/globals.css`, `tailwind.config.ts`, `components/terminal.tsx`, `components/slab.tsx`, `components/motion.tsx`, `lib/hooks/useLens.ts`, and the acceptance tests above.
- **Where the graph lives:** `lib/knowledge-graph.ts` → `app/brain/page.tsx` → `components/BrainGraphView.tsx` → `components/KnowledgeGraph.tsx` with `lib/tree-layout.ts`, `lib/memory-core.ts`, `lib/graph-lens.ts`.
- **What is not in the repo at all:** the `gbrain` CLI and its markdown store, Optimal Engine, Paperclip, the Hermes worker pool, Supabase pgvector, the local reranker, the `claude` and `superset` CLIs, and every credential.
