# Quiet Bands — site + R&D triage funnel

> **V7.2 (R&D funnel):** see `DEPLOYMENT_NOTES.md` for the current build/publish settings, routes, analytics and the Field Guide asset. The sections below are the V3–V7.1 guide and remain accurate for the lead-scoring function and Supabase setup.

## Triage Bot Deployment Guide (V7.1)

Complete site with integrated lead form that automatically scores inbound leads using Claude.

## What's Included

✅ **index.html** — Main site with triage form + mobile SMS + desktop form fallback
✅ **404.html** — 404 page  
✅ **favicon.svg** — Brand icon
✅ **og.png** — Social share image
✅ **_redirects** — Legacy URL redirects
✅ **netlify.toml** — Netlify config with CSP headers
✅ **netlify/functions/score-lead.js** — Claude scoring function (zero dependencies, built-in fetch)
✅ **package.json** — No dependencies; scripts for tests and QA

## Deploy to Netlify (2 min)

**Option A: Drag & Drop (easiest)**
1. Go to **Netlify → Quiet Bands site → Deploys**
2. Drag this entire folder (or zip it first) into the deploy zone
3. Wait 2–3 minutes
4. Done!

**Option B: CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

## Pre-Deploy Setup (5 min)

### 1. Supabase: Create `leads` Table

Go to **Supabase → SQL Editor → New Query** and paste:

```sql
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  current_tech text,
  pain_point text not null,
  budget_range text,
  timeline text,
  triage_score text,
  triage_reasoning text,
  flagged_for_review boolean default false,
  created_at timestamp with time zone default now()
);

alter table leads enable row level security;

create policy "Anon can insert leads"
  on leads
  for insert
  with check (true);

create policy "Only authenticated can read"
  on leads
  for select
  to authenticated
  using (true);
```

### 2. Netlify: Add Environment Secrets

Go to **Netlify → Quiet Bands → Settings → Build & deploy → Environment**

Add these three secrets:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://jkilmecbhjepltbianof.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (from Supabase → Settings → API → Service Role Key) |
| `ANTHROPIC_API_KEY` | (from https://console.anthropic.com → API keys) |
| `ANTHROPIC_MODEL` | optional, default `claude-opus-5` |

## After Deploy: Test It

1. **Go to your site** (https://quietbands.com)
2. **Scroll to form section** ("Let's see if we're a fit")
3. **Fill out test form** and submit
4. **Check Supabase** → leads table → should see your entry
5. **Wait 30 sec** → refresh table → `triage_score` should populate (HOT/WARM/COLD)

If scoring didn't work:
- Check **Netlify → Deploys → recent → Functions** for error logs
- Verify all three environment secrets are set (not blank)

## How It Works

### Mobile Users
- Click **"Text me to see it live"** → Opens SMS to +1-832-421-7542
- Works automatically (native SMS handler)

### Desktop Users
- Click **"Text me to see it live"** → Scrolls to triage form
- Fill form → Claude scores automatically

### Lead Scoring
**Claude evaluates:**
- Timeline urgency (ASAP = HOT)
- Pain point clarity (specific issues = HOT)
- Budget alignment ($1,500+ = HOT)

**Scores:**
- **HOT** — call/text immediately
- **WARM** — follow up this week  
- **COLD** — follow up later or pass

## Daily Workflow

1. Check **Supabase → leads table**
2. Filter by `triage_score = 'HOT'`
3. Email/call same day
4. Track conversions (manual for now)

## Customizing

### Change pricing text
Pricing lives in the "Engagements" section (id="see") in index.html. The small-business price:
```html
<div class="path-spec"><span class="k">Starts at</span><span class="v brass">$600</span></div>
```
The commercial path intentionally publishes no price — it routes to a project-inquiry email. Keep it that way.

### Add form fields
Add a new `<div class="form-group">` in the form, then:
```sql
ALTER TABLE leads ADD COLUMN new_field_name text;
```

### Change CTA text
Find buttons with `data-mobile-link="true"` and edit the text.

### Styling
All CSS is in `<style>` tags in index.html. Colors:
- `--brass: #C79A4B` (accent)
- `--ink: #16181D` (dark bg)
- `--bone: #ECE6DA` (light text)

## Troubleshooting

**Form doesn't submit:**
- Open browser console (F12)
- Check for errors
- Verify Supabase anon key is correct in the form code

**No triage score after submission:**
- Check Netlify function logs (Deploys → recent → Functions)
- Verify `ANTHROPIC_API_KEY` is set in Netlify
- Verify Supabase credentials are correct

**SMS button not working on mobile:**
- Should automatically open SMS app with +1-832-421-7542
- If not, check device/browser supports `sms:` protocol

**CORS error:**
- Go to Supabase → Settings → API → CORS Allowed Origins
- Add your domain (e.g., https://quietbands.com)

## Support

- **Supabase docs:** https://supabase.com/docs
- **Netlify functions:** https://docs.netlify.com/functions/overview/
- **Anthropic API:** https://docs.anthropic.com

---

**You're live.** Form captures leads → Claude scores → you follow up.


## V3 site structure (multi-page)

```
/                      Homepage — positioning, registry, philosophy, contact form
/work/frenchies/       Registry 001 case study (in production)
/resident-experience/  Registry 002 product page (in development)
/commercial/           Property & commercial engagements (no published pricing)
/small-business/       The $600 productized build (relocated from homepage)
/notes/                Notes architecture (publish only real observations)
/assets/site.css       Shared design system (paper palette)
sitemap.xml, robots.txt
```

- The contact form (homepage only) now sends: contact_name, company_name, email, pain_point, timeline. The unused `budget_range`/`current_tech`/`phone` columns stay in Supabase — nullable, no migration needed.
- `/for-property-teams` and `/property-technology` 301 to `/commercial/` via `_redirects`.
- The SPA catch-all was removed from netlify.toml so unknown URLs return a real 404 (Netlify serves 404.html automatically).
- Adding future work: copy `work/frenchies/index.html` to `work/<slug>/index.html`, add a registry entry on the homepage, and add the URL to sitemap.xml.


## V7.2 site structure (R&D funnel)

```
/                      Homepage — "Software built around the work", two ways in (real work / an idea)
/work/                 Project intake — "Tell us about the work" (Supabase leads + score-lead)
/rd/                   R&D landing — Field Guide + method, from Flighty.ai
/rd/pressure-test/     Interactive evidence review → research / humans / manual / build / park
/downloads/flighty-rd-field-guide.pdf   The Field Guide (replace the file to ship a new edition)
/field-guide           Short link → the PDF
assets/qb.js           Attribution + analytics (rd_events) + Supabase REST insert
assets/triage.js       Triage rules (pure; `npm test`)
assets/pressure-test.js, assets/intake.js   Page runtimes
tools/                 Unit tests and the Playwright QA runner (never served)
```

## Homepage story engine (cinematic rebuild)

The homepage (`/`) is a single scroll-driven scene: seven operational objects (email, spreadsheet, decision, approval, database, document, API) that persist across seven scenes and resolve into the two doors (`/work/`, `/rd/pressure-test/`). Plan and storyboard: `docs/CINEMATIC-EXPERIENCE-PLAN.md`.

```
assets/story/story.js    the narrative as data: scenes, object poses (desktop + mobile), links, camera
assets/story/engine.js   scroll → progress → poses → transforms; static plates for reduced motion
assets/story/scene.css   stage, objects, links, copy layer, mobile choreography, no-JS fallback
assets/story/boot.js     wiring, reduced-motion switch, story_scene analytics via qb.js
tools/story.test.mjs     unit tests for the engine's pure functions (`npm test`)
```

To change the choreography, edit poses in `story.js`; the engine needs no changes. Every other route, `qb.js`, `triage.js`, `pressure-test.js`, `intake.js` and the Netlify function are untouched by the rebuild.
