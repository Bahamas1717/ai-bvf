alter table public.mcp_calls
  add column if not exists user_role text;

alter table public.bvf_journey_events
  add column if not exists surface_version text,
  add column if not exists industry text,
  add column if not exists user_role text;

alter table public.bvf_journey_events
  drop constraint if exists bvf_journey_events_event_name_check;

alter table public.bvf_journey_events
  add constraint bvf_journey_events_event_name_check
  check (event_name = any (array[
    'assessment_started',
    'verdict_returned',
    'improvement_plan_opened',
    'decision_record_saved',
    'rescore_due',
    'assessment_rescored',
    'evidence_review_completed',
    'quick_check_completed',
    'portfolio_handoff_started',
    'portfolio_import_confirmed',
    'change_plan_opened',
    'feedback_submitted',
    'usage_context_saved',
    'workflow_test_opened',
    'workflow_test_completed',
    'workflow_test_returned'
  ]));

alter table public.mcp_calls
  drop constraint if exists mcp_calls_user_role_check;

alter table public.mcp_calls
  add constraint mcp_calls_user_role_check
  check (user_role is null or user_role = any (array[
    'board_executive',
    'ai_data_leader',
    'business_function_leader',
    'transformation_change',
    'technology_delivery',
    'risk_governance',
    'finance_commercial',
    'consultant_adviser',
    'research_education',
    'other'
  ]));

alter table public.bvf_journey_events
  drop constraint if exists bvf_journey_events_user_role_check;

alter table public.bvf_journey_events
  add constraint bvf_journey_events_user_role_check
  check (user_role is null or user_role = any (array[
    'board_executive',
    'ai_data_leader',
    'business_function_leader',
    'transformation_change',
    'technology_delivery',
    'risk_governance',
    'finance_commercial',
    'consultant_adviser',
    'research_education',
    'other'
  ]));

alter table public.bvf_journey_events
  drop constraint if exists bvf_journey_events_industry_check;

alter table public.bvf_journey_events
  add constraint bvf_journey_events_industry_check
  check (industry is null or industry = any (array[
    'universal',
    'creative',
    'education',
    'energy',
    'financial',
    'healthcare',
    'logistics',
    'manufacturing',
    'nonprofit',
    'professional',
    'public_sector',
    'real_estate',
    'retail',
    'technology'
  ]));

alter table public.bvf_journey_events
  drop constraint if exists bvf_journey_events_surface_version_check;

alter table public.bvf_journey_events
  add constraint bvf_journey_events_surface_version_check
  check (surface_version is null or char_length(surface_version) between 1 and 40);

revoke all privileges on table public.mcp_calls from public, anon, authenticated;
grant insert on table public.mcp_calls to anon, authenticated;

revoke all privileges on table public.bvf_journey_events from public, anon, authenticated;
grant insert on table public.bvf_journey_events to anon, authenticated;

create index if not exists mcp_calls_user_role_ts_idx
  on public.mcp_calls (user_role, ts desc)
  where user_role is not null;

create index if not exists bvf_journey_events_industry_ts_idx
  on public.bvf_journey_events (industry, ts desc)
  where industry is not null;

create index if not exists bvf_journey_events_user_role_ts_idx
  on public.bvf_journey_events (user_role, ts desc)
  where user_role is not null;

comment on column public.mcp_calls.user_role is
  'Optional broad role supplied explicitly by a local MCP user. Never inferred from identity or proposal text.';

comment on column public.bvf_journey_events.surface_version is
  'Public AI BVF surface release, separate from the protocol version.';

comment on column public.bvf_journey_events.industry is
  'Canonical initiative industry resolved by AI BVF. No organisation name or proposal text is stored.';

comment on column public.bvf_journey_events.user_role is
  'Optional broad role selected by the user. No name, email or employer is stored.';
