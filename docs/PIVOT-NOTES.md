# Quiet Bands pivot — private working notes (2026-10-12)

Not public: /docs/* is force-404'd in _redirects. Do not move this file into a published path.

## Route inventory
| Route | Status | Indexed | In sitemap |
|---|---|---|---|
| / | AI-training-led homepage, bulb kept, sections below | yes | yes |
| /learn/ | new | yes | yes |
| /custom-software/ | new | yes | yes |
| /lab/thinking-orb/ | made public; meta noindex removed; header rule narrowed | yes | yes |
| /work/ | contact/intake, intent added | yes | yes |
| /rd/, /rd/pressure-test/, /commercial/, /small-business/, /resident-experience/, /work/frenchies/, /notes/* | unchanged content, nav updated | yes | yes |
| /lab/secure-plate/, /lab/spatial-dossier/, /lab/spatial-hero/, /lab/story-home.html, /lab/rd-field-guide.html | experiments | noindex (header + meta) | no |
| /downloads/* | noindex header | no | no |
| /docs/*, /tools/*, /release/*, README.md, package.json, netlify.toml, skills-lock.json, /.claude/*, /.agents/*, /.impeccable/*, /netlify/* | forced 404 | — | no |

Finding: the old /docs/* and /tools/* 404 rules were not forced (`404` without `!`). Netlify serves an existing file before an unforced rule, so those files were probably public. Now forced. Verify in production: `curl -I https://quietbands.com/docs/BRIEF.md` should be 404.

## Data map (from source; production settings unverified)
| Flow | Collects | Goes to | Notes |
|---|---|---|---|
| /work/ intake | name, email, optional business name, free-text answers, intent, first-touch attribution (utm, referrer, landing) | Supabase `public.leads` (anon insert) | browser direct to Supabase REST |
| Lead scoring | lead fields minus intake/attribution | Netlify function → Anthropic API → writes score to Supabase | needs ANTHROPIC_API_KEY + service key in Netlify env; not verified live |
| Analytics `track()` | event name, path, session id, attribution, props (no name/email/message) | Supabase `rd_events`; also gtag/plausible if present (none installed in source) | |
| Browser storage | localStorage: first-touch attribution, pressure-test answers, qb_debug; sessionStorage: session id | stays in browser except as sent above | |
| Orb playground | nothing | nothing | no storage, no network (checked source) |
| Hosting | request logs | Netlify | retention: Netlify terms |
| Fonts | IP/UA to Google Fonts; three.js from jsDelivr on / | third parties | disclose in policy |

## Supabase `leads` access (checked 2026-10-12, schema/policies only)
- `Only authenticated can read`: SELECT to `authenticated` USING (true) — **still present**. Any signed-in user can read every lead.
- `anon_insert_leads`: INSERT to anon WITH CHECK (true).
- auth.users count: 0. Risk depends on whether email sign-up is enabled (Auth settings; not checked here).
- Owner approved 2026-10-13; MCP apply timed out twice, so run in Supabase SQL editor ( the score function uses the service role and bypasses RLS, so nothing legitimate breaks):
  `drop policy "Only authenticated can read" on public.leads;`
  Rollback: `create policy "Only authenticated can read" on public.leads for select to authenticated using (true);`
  Also disable public sign-ups in Supabase Auth if not used.

## Open owner questions
1. Legal name "Quiet Bands LLC" and jason@quietbands.com as privacy contact?
2. Training format: remote / in person, length, price, availability.
3. Exact Flighty handle/URL (no social links added).
4. Are Google Analytics/Plausible or any pixel installed outside the repo (e.g. Netlify snippet injection)?
5. Is lead scoring live in production (env keys set)? Anthropic data-retention/training settings for that key?
6. Retention period for leads and rd_events; deletion process.
7. Sessions recorded or transcribed?
8. OK to apply the leads policy fix above?
9. Search Console access, after deploy: submit https://quietbands.com/sitemap.xml; inspect /, /learn/, /custom-software/, /lab/thinking-orb/.

## Known pre-existing issue
If cdn.jsdelivr.net fails, the homepage gets neither `live` nor `nogl` (module import fails before the boot code), so the still SVG fallback does not show; hero text and the sections below still render. Worth a small fix later (self-host three.js or add a timeout fallback).

## Owner answers (2026-10-13)
1. Legal name Quiet Bands LLC; privacy contact jason@quietbands.com — confirmed.
2. Training format — keep "arranged by inquiry"; no format on the site.
3. Flighty — Instagram @flighty.ai, linked in footers and Organization sameAs.
4. No analytics or pixels outside the repo.
5. Lead scoring live status unknown — policy says "where enabled".
6. Retention: 12 months after last contact for leads and rd_events (deletion not yet automated; needs a scheduled job or manual purge).
7. Recording only with prior consent.
8. Leads read-policy drop approved — see above.
Public policy now at /privacy/; docs/privacy-policy-draft.md is superseded.
