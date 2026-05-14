-- Repair aibvf-mcp telemetry RLS.
--
-- Diagnostic 2026-05-14: an INSERT with the published anon key was rejected
-- with PostgREST error 42501 ("new row violates row-level security policy
-- for table mcp_calls"). The intent in 20260421_mcp_calls.sql was to allow
-- anon INSERT, deny everything else. Either that migration was never applied
-- to the live project, or the policy was dropped/renamed since.
--
-- Re-asserts the policy idempotently. Safe to re-run.
-- Run in the Supabase SQL editor.

alter table public.mcp_calls enable row level security;

drop policy if exists "mcp_calls_insert_anon" on public.mcp_calls;

create policy "mcp_calls_insert_anon" on public.mcp_calls
  for insert to anon
  with check (true);

-- Defensive: ensure the anon role has table-level INSERT grant. RLS gates
-- row-level access but PostgREST also requires the table grant. The 42501
-- error above is RLS-specific, but a missing table grant produces 42501 too,
-- so we cover both.
grant insert on public.mcp_calls to anon;

-- Service role (dashboard, server-side queries) bypasses RLS by default,
-- so SELECT/UPDATE/DELETE are intentionally not granted to anon.

-- Verification queries (run after applying):
--
-- 1. Confirm policy exists:
--    select polname, polcmd, polroles::regrole[] from pg_policy
--    where polrelid = 'public.mcp_calls'::regclass;
--
-- 2. Confirm RLS is on:
--    select relname, relrowsecurity from pg_class
--    where relname = 'mcp_calls';
--
-- 3. After a real tool call lands, you should see rows here:
--    select date_trunc('day', ts) as day,
--           count(distinct caller_hash) as unique_callers,
--           count(*) as total_calls
--    from public.mcp_calls
--    group by 1 order by 1 desc limit 14;
