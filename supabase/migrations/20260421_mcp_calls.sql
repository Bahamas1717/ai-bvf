-- aibvf-mcp anonymous usage telemetry
-- Run this in the Supabase SQL editor after creating a new project.
-- Grants INSERT only to the anon key, no SELECT, no UPDATE, no DELETE.

create table if not exists public.mcp_calls (
  id          uuid primary key default gen_random_uuid(),
  ts          timestamptz not null default now(),
  tool_name   text not null,
  bvf_version text not null,
  caller_hash text not null,
  industry    text,
  function    text,
  ai_tier     text,
  readiness   text
);

create index if not exists mcp_calls_ts_idx on public.mcp_calls (ts desc);
create index if not exists mcp_calls_caller_idx on public.mcp_calls (caller_hash, ts desc);
create index if not exists mcp_calls_tool_idx on public.mcp_calls (tool_name, ts desc);

alter table public.mcp_calls enable row level security;

-- Anon key may insert but not read. Service role (your dashboard queries) reads everything.
create policy "mcp_calls_insert_anon" on public.mcp_calls
  for insert to anon
  with check (true);

-- Deny SELECT/UPDATE/DELETE to anon by omission. RLS default-deny handles it.

-- Useful query for daily unique callers
-- select date_trunc('day', ts) as day,
--        count(distinct caller_hash) as unique_callers,
--        count(*) as total_calls
-- from public.mcp_calls
-- group by 1 order by 1 desc;
