-- Add adoption fields without changing the existing anonymous insert policy.
-- No proposal text, organisation name, revenue, score or portfolio content is stored.

alter table public.mcp_calls
  add column if not exists package_version text,
  add column if not exists install_hash text,
  add column if not exists entry_route text,
  add column if not exists assessment_stage text,
  add column if not exists work_architecture_status text;

create index if not exists mcp_calls_install_idx
  on public.mcp_calls (install_hash, ts desc)
  where install_hash is not null;

create index if not exists mcp_calls_release_idx
  on public.mcp_calls (package_version, ts desc);

comment on column public.mcp_calls.package_version is
  'Published aibvf-mcp package version, separate from the AI BVF protocol version.';
comment on column public.mcp_calls.install_hash is
  'Stable one-way hash of the random local installation seed, sent by stdio clients only.';
comment on column public.mcp_calls.entry_route is
  'stdio for a local MCP installation, remote for mcp.aibvf.com, unknown for older clients.';
comment on column public.mcp_calls.assessment_stage is
  'needs_input or verdict for assess_ai_initiative, null for other tools.';
comment on column public.mcp_calls.work_architecture_status is
  'ready, gap or unknown when an initiative verdict includes the work architecture gate.';

-- Verification after the first 0.14.1 calls arrive:
-- select package_version, entry_route, assessment_stage,
--        work_architecture_status, count(*) as events
-- from public.mcp_calls
-- where ts >= now() - interval '7 days'
-- group by 1, 2, 3, 4
-- order by events desc;
