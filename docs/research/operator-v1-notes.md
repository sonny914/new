# Operator v0.1: what was built, how to run it, what it is not

Built from `founderos-deep-dive.md` section 13 (the minimum architecture) as a working slice, not a mock. Lives at `/lab/operator/` (noindex, like every lab page).

## What it does

Paste a LinkedIn post, a profile URL, or drop a screenshot. The page resolves the author (profile URL first, then a confirmed name alias, then a model guess that Jay confirms), assembles a budgeted context pack from everything on file for that person, sends artifact plus pack to one model call, and shows: who this is, what we already know, what is worth noticing, problem evidence in the author's own words, and a verdict with reasons: COMMENT, SAVE or SCROLL. Jay presses C, S or X. On COMMENT a second call drafts one comment in Jay's voice from `jay-voice.md` and his last three real comments; he edits it, posts it in LinkedIn himself, and marks it posted. Later, from Open loops, he records what came back. The ladder moves only on evidence: the system may write rungs 1 and 2 from observed responses; rungs 3, 4 and 5 need an event whose actor is Jay. Every rung change cites the event that proves it.

## Files

| File | Role |
|---|---|
| `lab/operator/index.html` | The one screen. Site header lockup, capture, artifact, reading, open loops, people, problems, dossier panel. |
| `assets/lab/operator-core.js` | Pure logic: identity, the append-only event log, author resolution, the evidence ladder, the context pack, open loops, example data. No DOM, no network. Runs in the browser and under `node --test`. |
| `assets/lab/operator.js` | Wiring and render. Talks to the function, writes events, draws the ladder. |
| `assets/lab/operator.css` | Black, cream at three tiers, safety orange as the one live item. Glow exists in one rule: the ladder cell that just flipped, for about a second. |
| `netlify/functions/operator-interpret.js` | The model boundary. Actions `interpret` and `draft`. Zero dependencies, same pattern as `score-lead.js`. Validates everything the model returns; a rung in the output is dropped. Applies the first-encounter rule (a stranger's COMMENT becomes SAVE unless the post is a direct question in QB's lane). |
| `netlify/functions/operator-prompts/interpreter-rules.md` | What Jay notices and ignores, the rules, the output contract. Editable. |
| `netlify/functions/operator-prompts/jay-voice.md` | How Jay writes a comment. Editable. |
| `tools/operator.test.mjs` | 19 tests: identity, append-only log, ladder permissions, context pack, open loops, example data integrity, prompt assembly, output validation, the first-encounter rule, and five visual-rule tests over the CSS. |

## Running it

Static site, no build. `npm run serve` and open `/lab/operator/`. Tests: `npm test`.

For readings the function needs two environment variables on the Netlify site:

- `ANTHROPIC_API_KEY` (already used by `score-lead.js`)
- `OPERATOR_KEY`: a shared secret of your choosing. Enter the same value once in the page under "Access key"; it is stored only in that browser.

Optional: `ANTHROPIC_MODEL` (default `claude-opus-5-5`), `ANTHROPIC_BASE_URL`.

Without those two, the page says the model is not configured and records nothing in its place. In Example mode only, it offers a reading and a draft that are labelled "sample, not the model" so the loop can be shown before the site is keyed.

The function sends `fallbacks: "default"` with the matching beta header, so a refusal by the safety classifiers re-runs on Anthropic's recommended fallback model instead of failing. Remove the header and the field if that is not wanted.

## Where the data lives

In the browser, in `localStorage`, under `qb-operator-real` and `qb-operator-example`. Two separate logs; example rows all carry `origin: "example"` and never mix with real ones. Export writes the whole log as JSON; Import replaces it. This is enough for one operator on one machine, which is what V1 is for. When a second machine or person needs it, the same shape moves to Supabase (the schema in the deep dive, section 13.2) and `persistFor()` in the controller is the only thing that changes.

Screenshots are read, not stored.

## What it deliberately is not

No outbound action of any kind. No scraping, no LinkedIn API, no extension. No agents, no chat. No graph. No embeddings or vector store. No funnel or pipeline. No metrics dashboards. No scheduler. No seeded data in the real log. No ambient motion. One glow, gated.

## Kill test checkpoints (from the deep dive, section 15)

After four weeks of daily use: 60 or more artifacts with a decision each; outcomes recorded on at least half of actions within 7 days; five people at rung 2 and two at rung 3 with Jay-confirmed evidence; two decisions where the context changed Jay's call; one piece of content born from a confirmed problem. Fewer than 20 artifacts, or outcomes on under a quarter of actions, or drafts rewritten more than 60% of the time, are stop signals.
