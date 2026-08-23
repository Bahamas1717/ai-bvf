-- AI BVF adoption and retention readout.
-- Run as an owner or service role; public browser roles cannot read either telemetry table.

with web as (
  select *
  from public.bvf_journey_events
  where ts >= now() - interval '30 days'
),
web_counts as (
  select
    count(distinct journey_hash) filter (where event_name = 'assessment_started') as assessment_starters,
    count(distinct journey_hash) filter (where event_name = 'verdict_returned') as verdict_recipients,
    count(distinct journey_hash) filter (where event_name = 'decision_record_saved') as decision_savers,
    count(distinct journey_hash) filter (where event_name = 'assessment_rescored') as returning_rescorers,
    count(distinct journey_hash) filter (where event_name = 'feedback_submitted') as feedback_respondents
  from web
),
mcp_installs as (
  select
    install_hash,
    count(*) as calls,
    count(distinct ts::date) as active_days,
    bool_or(assessment_stage = 'verdict') as reached_verdict
  from public.mcp_calls
  where ts >= now() - interval '30 days'
    and install_hash is not null
  group by install_hash
)
select
  assessment_starters,
  verdict_recipients,
  round(100.0 * verdict_recipients / nullif(assessment_starters, 0), 1) as web_activation_pct,
  decision_savers,
  round(100.0 * decision_savers / nullif(verdict_recipients, 0), 1) as decision_save_pct,
  returning_rescorers,
  round(100.0 * returning_rescorers / nullif(decision_savers, 0), 1) as rescore_return_pct,
  feedback_respondents,
  (select count(*) from mcp_installs) as local_mcp_installs,
  (select count(*) from mcp_installs where reached_verdict) as local_mcp_installs_reaching_verdict,
  (select count(*) from mcp_installs where active_days > 1) as returning_local_mcp_installs
from web_counts;

-- Event detail for finding the point where the journey loses people.
select
  event_name,
  entry_route,
  count(*) as events,
  count(distinct journey_hash) as anonymous_browsers
from public.bvf_journey_events
where ts >= now() - interval '30 days'
group by event_name, entry_route
order by events desc;

-- Feedback split; free-text comments remain visible only to the database owner.
select
  feedback_response,
  count(*) as responses,
  count(*) filter (where feedback_more is not null or feedback_stop is not null) as responses_with_comments
from public.bvf_journey_events
where ts >= now() - interval '30 days'
  and event_name = 'feedback_submitted'
group by feedback_response
order by responses desc;
