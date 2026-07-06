# AI BVF Autonomy Architecture — Specification v0.1 (DRAFT)

> **Status:** design blueprint. Not wired to any package, tool, or CI path.
> Changes nothing published. This is the **loop** that wraps the judgment organ
> defined in [`brain-spec.md`](./brain-spec.md) and turns "a brain" into an
> autonomous agent.

## 0. The thesis of autonomy

The Brain *decides*. It is a function: signals in, verdict out. A function is not
autonomous — a human still has to call it, feed it, and act on it.

**Autonomy is the standing loop around the Brain.** The unit of human input drops
from *a task* (or a form) to **a mandate, set once** + an access grant + approval
gates. Then it runs.

The test of "fully autonomous":

> Grant read access, set the mandate once — *"keep HR and supply chain lean, fix
> the safe stuff, ask before anything irreversible"* — close the laptop. It keeps
> finding heavy processes, fixing the safe ones, and pinging only for approvals
> and exceptions. Indefinitely. No re-prompting.

## 1. The control loop

```
            ┌─────────── heartbeat (self-trigger) ───────────┐
            ▼                                                 │
  ① PERCEIVE → ② REMEMBER → ③ PRIORITISE → ④ JUDGE → ⑤ ACT → ⑥ VERIFY ─┘
   (connectors)  (estate)    (self-task)   (Brain)  (gated)  (did it land?)
```

Each pass: pull fresh signals, fold them into the estate model, decide what's
worth attention, judge it with the Brain, act within mandate bounds, and schedule
a check that the saving actually materialised. The heartbeat means it loops
*without being asked*.

## 2. The seven organs (Brain is #4)

### ① Perception — connectors
Source-agnostic adapters that pull `ProcessSignals` (brain-spec §2) into the
agent. **Read-only by default. In-tenant. MCP-native.** A ServiceNow ticket, a
SAP event log, and a CSV reduce to the same signal shape — that is what keeps the
whole agent vendor-neutral. Continuous ingestion, not on-request.

### ② Memory — the estate model
Persistent world-state: every process, its **signal history**, its **verdict
history**, what's been actioned, and **promised-vs-realised** savings. This is the
organ that stops the goldfish problem — the agent doesn't re-recommend what it
already proposed, and it *sees drift* because it remembers yesterday. (Supabase is
the natural home; the project already runs one.)

### ③ Prioritiser — self-tasking
Given the whole estate + the mandate, rank what to diagnose or act on next.
Deterministic, so it's auditable:

```
attention_score = baseline_cost × heaviness × decision_confidence
                  ↳ filtered to mandate scope, minus already-actioned
```

The agent allocates its *own* attention to the highest euros-at-stake. Nobody
tells it "look at onboarding."

### ④ Judge — the Brain
Invoke [`brain-spec.md`](./brain-spec.md). Returns a `BrainVerdict`
(Accelerate / Fix / Stop + € + confidence + assumptions).

### ⑤ Action — bounded execution
For an **Accelerate** verdict within mandate bounds, the agent acts. Autonomy is
**tiered**, set per-process by the mandate:

| Tier | Behaviour | Default for |
|---|---|---|
| **T0 — Advise** | emit the one-pager only | everything, until trust is earned |
| **T1 — Draft** | prepare the change artifact (ticket/epic/business case) for human approval | most processes |
| **T2 — Act (reversible)** | execute reversible changes automatically; irreversible → approval gate | proven, low-risk processes |

Every write is logged. Irreversible actions **always** hit a gate, regardless of
tier. This is the line that lets a CISO say yes to autonomy at all.

### ⑥ Verification — the learning loop
On every action, schedule a re-perception after N days. Measure **actual delta vs
promised**, write it back to memory, and **re-calibrate confidence** for that
(function × intervention). This is what makes the agent get *better* — and what
keeps its euro claims honest over time, because every promise is later audited
against reality by the agent itself.

### ⑦ Guardrails — bounded autonomy
The constitution the loop runs inside:

- **Hard limits** — never-touch list (e.g. payroll run, anything legal-hold).
- **Floors** — only act on `saving > €X` and `confidence > Z` (mandate-set).
- **Approval queue** — all gated actions surface here.
- **Kill switch** — pause the whole agent instantly.
- **Escalation** — ambiguous signals, high risk, or low `signal_completeness`
  route to a human instead of a guess.
- **Security posture** — in-tenant deploy, zero egress, read-only-until-approved,
  full audit trail (every read, judgment, and action). Autonomy without this is a
  liability; autonomy *with* it is the product.

## 3. The mandate — the one thing the human sets

A single declarative object, authored once:

```jsonc
{
  "scope": { "functions": ["hr", "supply"], "exclude_processes": ["payroll-run"] },
  "autonomy_tier": "T1",                      // default ceiling; per-process overrides allowed
  "act_floor": { "min_saving_eur": 50000, "min_confidence": 0.70 },
  "hard_limits": ["no irreversible action without approval", "no PII egress"],
  "cadence": { "sweep": "nightly", "verify_after_days": 30 },
  "report_to": "craig@…  (weekly digest + real-time approvals)"
}
```

Set this + grant access = the agent runs. Everything else it does itself.

## 4. Trigger taxonomy — the heartbeat

The agent wakes on:

- **Scheduled sweep** — full re-perception on the mandate cadence (e.g. nightly).
- **Event triggers** — a process crosses a threshold (cost spike, cycle-time
  drift, rework climbing), a *new* process appears, or shadow spend is detected.
- **Verification due** — a prior action's check-date arrives.

Self-initiation is the capability that separates this from every tool aibvf ships
today.

## 5. "Fully autonomous" — the acceptance checklist

The agent is fully autonomous when *all* of these are true without per-task human
input:

- [ ] **Perceives** on its own (connectors, no paste)
- [ ] **Self-triggers** (heartbeat: schedule + events)
- [ ] **Self-tasks** (picks what to work on)
- [ ] **Judges** (the Brain) ✅ *spec exists*
- [ ] **Acts** within bounds (tiered, gated)
- [ ] **Remembers** (estate model, drift, promised-vs-realised)
- [ ] **Verifies** (checks the saving landed, re-calibrates)
- [ ] **Stays bounded** (guardrails, escalation, kill switch)

Today: **1 of 8** (Judge). This spec defines the other seven.

## 6. Build order (each additive; none touches live until you approve a bump)

1. **Memory + estate model** — schema for processes, signal/verdict history,
   promised-vs-realised. Cheap, unblocks everything, no live risk.
2. **One read-only connector** — the highest-signal source (ITSM or spend
   ledger). Proves perception end-to-end on real exhaust.
3. **Prioritiser + heartbeat** — deterministic ranking + a scheduled sweep. Now
   it self-tasks and self-triggers — the autonomy switch flips.
4. **T1 action + approval queue** — draft artifacts for human sign-off. Safe
   first taste of "act."
5. **Verification loop** — close it. Now it learns.

Brain evidence-table calibration (brain-spec §6) runs in parallel — the loop is
only as honest as the judgment inside it.

## 7. Why the whole thing stays uncopyable

Incumbents can build this loop — but only inside their own platform, only to
upsell it, and never neutral. The agnostic, in-tenant, MCP-native autonomous loop
*with a vendor-neutral value brain at its core* is the quadrant the 2026 analyst
landscape calls empty. This spec + `brain-spec.md` are the two halves of the
claim.

---
*v0.1 — design blueprint. Wraps `brain-spec.md`; reuses the kernel's determinism
and security invariants. No runtime dependency yet. Next: estate-model schema.*
