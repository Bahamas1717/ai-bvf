-- Re-enable Row Level Security on public.mcp_calls.
-- The Supabase linter flagged this table as RLS-disabled on the live DB
-- (the table predates or had RLS toggled off after 20260421_mcp_calls.sql).
-- Idempotent: safe to run even if RLS is already enabled.

alter table public.mcp_calls enable row level security;

-- Anon key may insert telemetry rows but cannot read/update/delete.
-- Service role bypasses RLS for dashboard queries.
drop policy if exists "mcp_calls_insert_anon" on public.mcp_calls;
create policy "mcp_calls_insert_anon" on public.mcp_calls
  for insert to anon
  with check (true);
