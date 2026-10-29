-- Quiet Bands Studio signups: the free pack, the Mini-Drama Workshop list and commission briefs (/studio/).
-- The pages insert with the publishable anon key, so anon may INSERT only: no reads, updates or deletes.
-- Read the list from the Supabase dashboard or with the service role key.
-- Apply this before the Studio goes live; until it exists every Studio form shows its error message.
create table if not exists public.studio_signups (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  kind            text not null check (kind in ('pack', 'workshop', 'commission')),
  email           text not null check (char_length(email) <= 254 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  first_name      text check (char_length(first_name) <= 80),
  makes           text check (char_length(makes) <= 80),
  workshop_optin  boolean not null default false,
  brief           jsonb check (brief is null or pg_column_size(brief) <= 8192),
  campaign        text check (char_length(campaign) <= 64),
  source          text check (char_length(source) <= 64),
  attribution     jsonb not null default '{}'::jsonb check (pg_column_size(attribution) <= 4096),
  path            text check (char_length(path) <= 200),
  unsubscribed_at timestamptz
);

-- One pack and one workshop row per address; a repeat returns 409 and the page treats it as success.
-- Commission briefs can repeat: someone may send a second brief.
create unique index if not exists studio_signups_kind_email_key
  on public.studio_signups (kind, lower(email)) where kind in ('pack', 'workshop');

create index if not exists studio_signups_created_at_idx on public.studio_signups (created_at desc);

alter table public.studio_signups enable row level security;

drop policy if exists "anon can sign up" on public.studio_signups;
create policy "anon can sign up" on public.studio_signups
  for insert to anon
  with check (unsubscribed_at is null);

-- Who wants the workshop, newest first (pack signups who ticked the box, plus direct workshop signups).
create or replace view public.studio_workshop_list with (security_invoker = true) as
  select distinct on (lower(email)) lower(email) as email, first_name, makes, brief ->> 'idea' as idea, created_at, source, campaign
  from public.studio_signups
  where (kind = 'workshop' or workshop_optin) and unsubscribed_at is null
  order by lower(email), created_at desc;
