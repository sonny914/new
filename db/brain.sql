-- Company Brain: the store behind #ask-the-brain.
-- Run once in Supabase → SQL editor. Every table is service-role only: RLS is on with no policies, so the
-- publishable (anon) key the site ships cannot read or write any of it. Only the Netlify functions, which hold
-- SUPABASE_SERVICE_KEY, touch these tables.

-- What the brain reads: one row per chunk of a source document (a HubSpot deal, a call transcript, a doc).
create table if not exists brain_chunks (
  id          bigserial primary key,
  source      text not null,                 -- hubspot | calls | docs | analytics
  source_id   text not null,                 -- stable id within the source, e.g. "deal:123#0"
  title       text not null default '',
  url         text,
  body        text not null,
  updated_at  timestamptz not null default now(),
  tsv         tsvector generated always as (to_tsvector('english', coalesce(title, '') || ' ' || body)) stored,
  unique (source, source_id)
);
create index if not exists brain_chunks_tsv on brain_chunks using gin (tsv);

-- Fix once, fixed for all: a correction outranks every source on its topic, for every person and every AI.
create table if not exists brain_fixes (
  id           bigserial primary key,
  topic        text not null,
  correction   text not null,
  question     text,
  wrong_answer text,
  created_by   text,
  origin       text not null default 'fix' check (origin in ('fix', 'change')),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  tsv          tsvector generated always as (to_tsvector('english', topic || ' ' || correction || ' ' || coalesce(question, ''))) stored
);
create index if not exists brain_fixes_tsv on brain_fixes using gin (tsv);

-- The 1-3-1 queue: a big change is held as 3 options, 1 pick and a risk level until a person says yes.
create table if not exists brain_changes (
  id            bigserial primary key,
  request       text not null,
  summary       text not null,
  options       jsonb not null,                -- [{ "title": "...", "detail": "..." }] x3
  pick          int not null check (pick between 0 and 2),
  why           text not null default '',
  risk          text not null check (risk in ('low', 'medium', 'high')),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by  text,
  decided_by    text,
  decided_at    timestamptz,
  slack_channel text,
  slack_ts      text,
  created_at    timestamptz not null default now()
);

-- The brain log: every answer, AI read, fix, held change and decision, for the weekly numbers.
create table if not exists brain_log (
  id          bigserial primary key,
  kind        text not null check (kind in ('answer', 'read', 'fix', '1-3-1', 'yes', 'no', 'check')),
  actor       text,
  actor_kind  text not null default 'person' check (actor_kind in ('person', 'agent', 'system')),
  question    text,
  summary     text,
  sources     jsonb not null default '[]'::jsonb,
  fixes       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists brain_log_created on brain_log (created_at desc);

alter table brain_chunks  enable row level security;
alter table brain_fixes   enable row level security;
alter table brain_changes enable row level security;
alter table brain_log     enable row level security;

-- Any-word search, so a natural question still finds chunks that share only some of its words.
create or replace function brain_query(q text) returns tsquery language sql immutable as $$
  select case when plainto_tsquery('english', q)::text = '' then null
              else replace(plainto_tsquery('english', q)::text, '&', '|')::tsquery end
$$;

create or replace function brain_search(q text, n int default 8)
returns table (id bigint, source text, source_id text, title text, url text, body text, rank real)
language sql stable as $$
  select c.id, c.source, c.source_id, c.title, c.url, c.body, ts_rank(c.tsv, brain_query(q)) as rank
  from brain_chunks c
  where c.tsv @@ brain_query(q)
  order by rank desc, c.updated_at desc
  limit n
$$;

create or replace function brain_fix_search(q text, n int default 5)
returns table (id bigint, topic text, correction text, created_by text, created_at timestamptz, rank real)
language sql stable as $$
  select f.id, f.topic, f.correction, f.created_by, f.created_at, ts_rank(f.tsv, brain_query(q)) as rank
  from brain_fixes f
  where f.active and f.tsv @@ brain_query(q)
  order by rank desc, f.created_at desc
  limit n
$$;

revoke all on function brain_search(text, int), brain_fix_search(text, int) from anon, authenticated;
