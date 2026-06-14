# The Compounding Firm — learning-loop

A runnable reference implementation of the **learning loop** (the hill-climbing
machine) that sits on top of the AI Business Value Framework. It demonstrates, end
to end, the thesis that a firm's durable AI advantage is not the model it picks but
the **learning loop it owns**, where human capital and token capital compound.

This is experimental, Brief-grade applied research. It is a sibling of the BVF
packages, not part of the certified protocol. It deliberately keeps the BVF
scoring engine pure: BVF stays the deterministic judge, and nothing here injects
an LLM or ML into BVF's scoring path.

**Provenance.** The thesis is Satya Nadella's: human capital and token capital
compounding inside a firm-owned learning loop, and a frontier ecosystem rather than
just a frontier model. The original contribution here is the operational layer that
makes it testable: the Veteran Capital artifact and its spec, the runnable learning
loop, and the Veteran Test and moat proofs. His thesis, the proof built here.

## The idea in one line

BVF is the deterministic **judge** a firm trusts. The learning loop is the firm's
**veteran apprentice** that gets measurably better at briefing that judge over
time, and the expertise it accumulates is a file the firm owns, versions, and
audits: the **Veteran Capital** artifact.

## What it proves (falsifiable)

A firm-owned, model-external Veteran Capital artifact (a learned calibration policy
+ a knowledge base + private evals) makes any base model better at a firm-specific
judgment task, improves over loop iterations, **survives a base-model swap, and its
advantage persists as base models commoditise.**

The task (reused from the Workflow Coroner): given a process-mined workflow, derive
the four BVF pillar inputs a Craig-Horton-calibrated senior practitioner would
assign. The base rubric is what a generalist produces; the firm's **gold** judgment
adds the systematic senior-practitioner adjustments that are its tacit knowledge.
The learning loop closes that gap and packages it as a portable artifact.

## Run it

Everything runs with **no API key** (deterministic offline pseudo-models), so the
full loop, evals, and demos are reproducible in CI and reviewable without spend.

```bash
cd learning-loop
python -m loop.run_loop          # the hill-climb: writes artifacts/veteran-capital.json + curves
python -m sovereignty.swap_demo  # money demo #1: the Veteran Test (model swap)
python -m sovereignty.moat_demo  # money demo #2: the moat / commoditisation test
```

Set `ANTHROPIC_API_KEY` to run the base derivation through the Claude API
(`claude-opus-4-8` by default, with `claude-haiku-4-5` as the swap counterpart and
a Haiku→Sonnet→Opus capability ladder for the moat). Force offline even with a key
via `AIBVF_LL_OFFLINE=1`. Validate the live path cheaply with a single call:

```bash
pip install -e '.[agent]'        # installs the Anthropic SDK
python -m sovereignty.live_smoke # one Claude call: derive one case and print
```

The live derivation uses forced tool use, omits sampling parameters (removed on
Opus 4.8), handles the `refusal` stop reason, and backs off on rate-limit/overload.

Representative offline results (5 seeds): cold private-eval reward **0.954** →
lifted **0.984** over 8 iterations; the Veteran Test transfers to a model the
policy was never fit on; the moat advantage stays positive across the ladder.
A flat or negative curve would be a real, reportable result, not a bug.

## How it works

```
candidate ──> base model derivation ──> + Veteran Capital (learned calibration) ──> BVF score() ──> ruling
   (firm)        (offline rubric or            (model-external                       (deterministic
                  Claude, forced tool use)      adjustment + KB)                       judge, unchanged)
                                                      ^
                              private evals (business outcomes) ── reward ── fit policy + promote exemplars
                                                      └──────────── loop ────────────┘
```

The portable artifact (`spec/veteran-capital.schema.json`) bundles the learned
`calibration_policy`, the `institutional_memory` knowledge base, the private
`eval_suite`, and the `provenance` reward history.

## Real vs stubbed (v0 honesty)

| Component | Status in v0 |
|---|---|
| Agentic derivation (Claude, forced tool use) | **Real** (live mode); deterministic rubric agent offline |
| Private evals against business outcomes (not public benchmarks) | **Real** |
| Trace capture + reward | **Real** |
| Learned calibration policy (ridge-linear residual, standardised features) | **Real** — genuine least-squares learning, model-external, fit from traces |
| Knowledge base: seeded notes, exemplar promotion, feature-similarity retrieval | **Real** loop mechanics; influences the base derivation in live mode (prompt context) |
| Train/holdout split enforced (curve cannot cheat) | **Real** |
| Veteran Capital artifact: portable, schema-validated, round-trips | **Real** |
| Embedding / vector retrieval | **Stubbed** — feature-similarity stands in behind the same interface |
| Gradient SFT / RL on the base model | **Deferred to v1** — traces are exported in a fine-tune-ready schema (`artifacts/traces.finetune.jsonl`) so the step plugs in unchanged |

The v0 policy is a **learned calibration policy**, not reinforcement learning. We
do not call it RL.

## Layout

```
../spec/veteran-capital.schema.json   the portable, model-agnostic firm-AI artifact
config.py            models (bare aliases), dataset, loop, reward knobs
domain/cases.py      featuriser, base BVF rubric, the firm's gold "veteran" labels, dataset
capital/policy.py    the learned calibration policy (ridge, pure Python)
capital/artifact.py  the Veteran Capital artifact (save/load/validate/apply)
kb/store.py          institutional memory (notes + exemplars + retrieval)
agent/derive.py      base derivation (live Claude / offline rubric)
loop/                reward, trace, optimize, run_loop (the hill-climbing machine)
evals/harness.py     private evals over the holdout
sovereignty/         swap_demo (Veteran Test) + moat_demo
viz/hill_climb.py    ASCII + SVG charts (navy / burnt-orange)
docs/                the framework: The Compounding Firm
```

## Relationship to BVF

A separate package with its own `pyproject.toml`. It imports `aibvf.score` read-only
via the file-path loader (mirroring `examples/workflow-coroner`) and never adds a
dependency to the BVF core, so BVF's "no LLM, no ML in the scoring path" positioning
stays intact.
