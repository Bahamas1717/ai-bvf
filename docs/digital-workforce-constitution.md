# The Digital Workforce Constitution — v0.1 (DRAFT)

> **Status:** category-defining document. The management model for organisations
> that employ humans and agents together, written as seven articles, each with
> its evidence and its executable form. The AI BVF engine and estate model are
> the reference implementation; the articles stand on their own.

## Why a constitution

A company can now hire a thousand digital workers in an afternoon. It has a
purchasing agreement for them, and nothing else: no job description, no span of
control, no capital-allocation discipline, no performance review, no dismissal
procedure. The technology arrived at machine speed and the management model did
not arrive at all, which is why MIT (NANDA, 2025) finds 95 percent of GenAI
pilots deliver no measurable P&L impact, and why Hamel and Zanini price the
bureaucratic drag underneath at over a trillion dollars a year across the OECD.

The last durable advantage is management innovation, because tools are copied
in months and systems take decades, General Motors toured Toyota's plants for
twenty years and replicated nothing. What follows is a management system for
the hybrid workforce, small enough to adopt in a quarter, strict enough to
survive an audit, and executable today.

## The seven articles

### Article 1 · No digital worker without a mandate

Every agent operates under a written mandate: scope, exclusions, value floors,
confidence floors, hard limits, reporting line. Set once, amended deliberately,
never implied. An agent without a mandate is an intern with admin rights.

*Executable form:* the mandate object (autonomy-spec §3, `bvf_mandate`).

### Article 2 · Delegation is tiered, and irreversibility always gates

Digital workers earn autonomy the way people do. Tier 0 advises, tier 1 drafts
for human approval, tier 2 executes reversible actions alone, and an
irreversible action meets a human gate at every tier, permanently. Trust is
granted per process, not per platform.

*Executable form:* T0/T1/T2 tiers with approval queue (autonomy-spec §2 ⑤).

### Article 3 · Someone owns the word No

Every proposed expansion of the digital workforce gets a verdict before it gets
a budget: Accelerate, Fix or Stop, from declared rules, with the reasoning
attached. A fully-estimated case never earns an Accelerate, evidence does. The
organisation names who owns the word No, and the verdict gives that owner
something better than courage, it gives them arithmetic. Gartner (2025) counts
30 percent of GenAI projects abandoned after proof of concept; the cheaper
abandonment happens before the spend.

*Executable form:* `score_initiative`, `score_portfolio`, the Stop-first
classify rule, `signal_completeness` honesty governor.

### Article 4 · Absorption is a budget, and humans set it

An organisation's capacity to change is finite and function-specific. No
function absorbs more than its set number of concurrent changes per period,
overflow defers visibly rather than failing quietly. Ten good agents can still
break an organisation if they all land on Finance in the same quarter. BCG puts
70 percent of transformation value in people and process; the people set the
pace or the value does not arrive.

*Executable form:* `sequence_portfolio` capacity constraints,
`max_parallel_per_function`, the three-wave plan with gates.

### Article 5 · Every promise is audited by its own author

Each deployment records its predicted value before it runs. After a set period
the actual is measured against the promise, the variance is written down, and
future confidence is recalibrated by it. A digital workforce that marks its own
homework honestly is the only kind a CFO should fund twice.

*Executable form:* `bvf_verification`, promised-versus-realised variance,
confidence recalibration (autonomy-spec §2 ⑥).

### Article 6 · Stop conditions are written before deployment, not after incidents

Every agent carries its dismissal procedure from day one: the conditions under
which it pauses, escalates or stops, who can invoke them, and how fast. The
kill switch is a design requirement, not an incident response. Under the EU AI
Act this is arriving as law; under this constitution it was already policy.

*Executable form:* stop conditions in every change play, `hard_limits`,
the kill switch and escalation rules (autonomy-spec §2 ⑦).

### Article 7 · The human floor does not delegate

Some work is constitutionally human: owning trust, giving care, bearing
accountability to people, and deciding what the organisation refuses to
automate. Transformation lands through the moment a person's work changes, and
EY/Oxford (2022) measures human-centred transformations at 2.6 times the
success rate, 73 percent against 28. An organisation that delegates its
humanity has not transformed, it has resigned.

*Executable form:* none, deliberately. This article is implemented by people,
and the change plans (Kotter coalition, ADKAR sequence, named owners, listening
before tooling) exist to protect the time in which they do it.

## Adoption in one quarter

Month one, mandates and verdicts: write the mandate for every agent already
running, score every proposed one, publish who owns the word No. Month two,
tiers and stop conditions: classify every agent T0 to T2, write the dismissal
procedures, wire the approval queue. Month three, absorption and audit: set the
per-function change budget, sequence the surviving portfolio in waves, book the
first promised-versus-realised reviews. The instruments for every step are open,
MIT-licensed, and running at mcp.aibvf.com.

## Lineage

Built on the AI BVF engine (`@aibvf/core`), the autonomy architecture
(autonomy-spec.md), the Brain (brain-spec.md) and the evidence table, and on
the shoulders of Deming, Drucker, Hamel and the EY/Oxford Saïd research on
human-centred transformation. Deming never had an API. This constitution does.

---
*v0.1 — the articles are stable, the wording is not. Field evidence revises it;
opinions do not.*
