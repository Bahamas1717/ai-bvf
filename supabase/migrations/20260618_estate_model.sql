-- AI BVF — Estate Model (autonomy-spec §2 organ ② "Memory")
-- =========================================================================
-- The agent's persistent world-state: the process estate, signal history,
-- verdict history, actions taken, and promised-vs-realised verification.
-- This is the substrate the autonomy loop reads (Prioritise) and writes
-- (Perceive / Judge / Act / Verify). See docs/autonomy-spec.md + brain-spec.md.
--
-- STATUS: design migration. NOT YET APPLIED to any live project. Holds
-- sensitive client process data, so the posture is the INVERSE of mcp_calls:
-- default-deny RLS, NO anon access, service-role (the in-tenant agent) only.
-- Intended to run inside the CLIENT'S OWN Supabase / Postgres (zero egress).
-- Run in the SQL editor of the in-tenant project. Idempotent.
-- =========================================================================

-- ── shared: updated_at touch trigger (append-only tables don't use it) ────
create or replace function public.bvf_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── 1. mandate ── the one thing a human sets (autonomy-spec §3) ───────────
create table if not exists public.bvf_mandate (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  scope          jsonb not null default '{}'::jsonb,   -- {functions:[], exclude_processes:[]}
  autonomy_tier  text  not null default 'T0' check (autonomy_tier in ('T0','T1','T2')),
  act_floor      jsonb not null default '{"min_saving_eur":0,"min_confidence":0.7}'::jsonb,
  hard_limits    jsonb not null default '[]'::jsonb,
  cadence        jsonb not null default '{"sweep":"nightly","verify_after_days":30}'::jsonb,
  report_to      text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
drop trigger if exists bvf_mandate_touch on public.bvf_mandate;
create trigger bvf_mandate_touch before update on public.bvf_mandate
  for each row execute function public.bvf_touch_updated_at();

-- ── 2. process ── the estate inventory (stable identity per process) ──────
create table if not exists public.bvf_process (
  id           uuid primary key default gen_random_uuid(),
  mandate_id   uuid not null references public.bvf_mandate(id) on delete cascade,
  external_ref text,                                   -- source-system id (ticket queue, SAP txn type…)
  function     text not null check (function in
                 ('finance','hr','sales','supply','cx','risk','it','rd')),  -- kernel FunctionId
  name         text not null,
  status       text not null default 'active' check (status in ('active','dormant','eliminated')),
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (mandate_id, external_ref)
);
create index if not exists bvf_process_mandate_idx on public.bvf_process (mandate_id, status);
drop trigger if exists bvf_process_touch on public.bvf_process;
create trigger bvf_process_touch before update on public.bvf_process
  for each row execute function public.bvf_touch_updated_at();

-- ── 3. signal_snapshot ── ProcessSignals over time (brain-spec §2, append-only)
create table if not exists public.bvf_signal_snapshot (
  id                     uuid primary key default gen_random_uuid(),
  process_id             uuid not null references public.bvf_process(id) on delete cascade,
  captured_at            timestamptz not null default now(),
  source                 text,                         -- e.g. 'servicenow', 'sap', 'csv'
  instances_per_year     numeric,
  fte_hours_per_instance numeric,
  loaded_hourly_rate_eur numeric,
  cycle_time_days        numeric,
  touch_ratio            numeric check (touch_ratio between 0 and 1),
  handoffs               numeric,
  rework_rate            numeric check (rework_rate between 0 and 1),
  automation_level       numeric check (automation_level between 0 and 1),
  direct_spend_eur       numeric,
  signal_completeness    numeric not null check (signal_completeness between 0 and 1),
  raw                    jsonb                         -- provenance / extra extracted fields
);
create index if not exists bvf_snapshot_process_idx
  on public.bvf_signal_snapshot (process_id, captured_at desc);

-- ── 4. verdict ── BrainVerdict history (brain-spec §5, append-only) ───────
create table if not exists public.bvf_verdict (
  id                  uuid primary key default gen_random_uuid(),
  process_id          uuid not null references public.bvf_process(id) on delete cascade,
  snapshot_id         uuid references public.bvf_signal_snapshot(id) on delete set null,
  created_at          timestamptz not null default now(),
  baseline_cost_eur   numeric not null,
  heaviness           numeric not null check (heaviness between 0 and 100),
  drag_decomposition  jsonb,                           -- {manual,handoffs,wait,rework}
  intervention        text not null,
  net_saving_low_eur  numeric not null,
  net_saving_high_eur numeric not null,
  efficiency_gain_pct numeric,
  verdict             text not null check (verdict in ('Accelerate','Fix','Stop')),
  decision_confidence numeric not null check (decision_confidence between 0 and 1),
  assumptions         jsonb not null default '[]'::jsonb,
  offer_to_execute    boolean not null default false,
  brain_version       text not null default '0.1'
);
create index if not exists bvf_verdict_process_idx
  on public.bvf_verdict (process_id, created_at desc);

-- ── 5. action ── what got actioned (tiered + gated, autonomy-spec §2 ⑤) ───
create table if not exists public.bvf_action (
  id                   uuid primary key default gen_random_uuid(),
  verdict_id           uuid not null references public.bvf_verdict(id) on delete cascade,
  tier                 text not null check (tier in ('T0','T1','T2')),
  status               text not null default 'proposed'
                         check (status in ('proposed','approved','rejected','executing','done','failed')),
  -- the promise, snapshotted at action time, so verification compares to it:
  predicted_saving_low_eur  numeric,
  predicted_saving_high_eur numeric,
  artifact_ref         text,                           -- ticket/epic/business-case link
  approved_by          text,
  approved_at          timestamptz,
  executed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists bvf_action_status_idx on public.bvf_action (status);
drop trigger if exists bvf_action_touch on public.bvf_action;
create trigger bvf_action_touch before update on public.bvf_action
  for each row execute function public.bvf_touch_updated_at();

-- ── 6. verification ── promised-vs-realised, closes the loop (organ ⑥) ────
create table if not exists public.bvf_verification (
  id                         uuid primary key default gen_random_uuid(),
  action_id                  uuid not null references public.bvf_action(id) on delete cascade,
  verify_due_at              timestamptz not null,
  verified_at                timestamptz,
  realised_saving_eur        numeric,
  realised_efficiency_pct    numeric,
  variance_pct               numeric,                  -- (realised - predicted_mid) / predicted_mid
  confidence_calibration_delta numeric,                -- feedback into intervention_evidence
  notes                      text,
  created_at                 timestamptz not null default now()
);
-- the heartbeat finds due, not-yet-run verifications with this index:
create index if not exists bvf_verification_due_idx
  on public.bvf_verification (verify_due_at) where verified_at is null;

-- ── Prioritiser view ── implements autonomy-spec §3 attention_score ───────
-- Latest verdict per active process, Accelerate, not yet committed to an
-- action, ranked by euros-at-stake. This is what the agent self-tasks from.
create or replace view public.bvf_attention as
with latest as (
  select distinct on (process_id) *
  from public.bvf_verdict
  order by process_id, created_at desc
)
select
  p.id   as process_id,
  p.name,
  p.function,
  v.id   as verdict_id,
  v.verdict,
  v.baseline_cost_eur,
  v.heaviness,
  v.decision_confidence,
  v.net_saving_low_eur,
  v.net_saving_high_eur,
  round(v.baseline_cost_eur * (v.heaviness / 100.0) * v.decision_confidence) as attention_score
from latest v
join public.bvf_process p on p.id = v.process_id
where p.status = 'active'
  and v.verdict = 'Accelerate'
  and not exists (
    select 1 from public.bvf_action a
    where a.verdict_id = v.id and a.status in ('approved','executing','done')
  )
order by attention_score desc;

-- ── Security ── in-tenant, zero-egress: default-deny, service-role only ───
-- RLS on, NO anon/authenticated policies created. The anon key has zero
-- access (unlike mcp_calls, which is anon-insert telemetry). The in-tenant
-- agent connects with the service role, which bypasses RLS. Process data
-- never leaves the client boundary and never touches a public key.
alter table public.bvf_mandate          enable row level security;
alter table public.bvf_process          enable row level security;
alter table public.bvf_signal_snapshot  enable row level security;
alter table public.bvf_verdict          enable row level security;
alter table public.bvf_action           enable row level security;
alter table public.bvf_verification      enable row level security;

revoke all on public.bvf_mandate, public.bvf_process, public.bvf_signal_snapshot,
               public.bvf_verdict, public.bvf_action, public.bvf_verification
  from anon, authenticated;

-- Multi-tenant note: for a shared deployment, add tenant_id to bvf_mandate
-- and a USING (tenant_id = auth.jwt()->>'tenant') policy down the chain.
-- v0.1 assumes single-tenant in-tenant deploy, so default-deny suffices.

-- Verification queries (run after applying in a test project):
--   select * from public.bvf_attention;            -- the prioritised work queue
--   select * from public.bvf_verification
--     where verified_at is null and verify_due_at <= now();  -- due checks
