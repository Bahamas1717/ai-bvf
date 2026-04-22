-- Adds classification + confidence to aibvf-mcp telemetry.
-- Optional columns. Safe to apply on an existing populated table.
-- Run in the Supabase SQL editor.

alter table public.mcp_calls
  add column if not exists classification text,
  add column if not exists confidence     int;

-- Useful aggregate:
--   how many Accelerate vs Fix vs Stop decisions have been scored
--   per industry per week.
--
-- select date_trunc('week', ts) as week,
--        industry, classification, count(*) as n
-- from public.mcp_calls
-- where tool_name = 'score_initiative'
-- group by 1, 2, 3
-- order by 1 desc, n desc;
