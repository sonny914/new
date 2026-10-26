-- Email signups from /bands (the BANDS comment-to-DM landing page).
-- The page inserts with the publishable anon key, so anon may INSERT only: no reads, updates or deletes.
-- Read the list from the Supabase dashboard or with the service role key.
create table if not exists public.bands_signups (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null check (char_length(email) <= 254 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  guide       text not null default 'first-automation' check (char_length(guide) <= 64),
  source      text check (char_length(source) <= 64),
  attribution jsonb not null default '{}'::jsonb check (pg_column_size(attribution) <= 4096),
  unsubscribed_at timestamptz
);

-- one row per address; a repeat signup returns 409 and the page treats it as success
create unique index if not exists bands_signups_email_key on public.bands_signups (lower(email));

alter table public.bands_signups enable row level security;

drop policy if exists "anon can sign up" on public.bands_signups;
create policy "anon can sign up" on public.bands_signups
  for insert to anon
  with check (unsubscribed_at is null);
