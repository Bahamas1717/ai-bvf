# The Learning Loop: Reference Architecture

By Craig Horton, Craig Horton Advisory.

This is the named architecture behind The Compounding Firm, mapped to the runnable
reference implementation in this package.

## The Loop

```
            human agency sets goals, supplies judgment, defines outcomes
                 |            |              |               |
                 v            v              v               v
  candidate -> agentic     -> trace      -> private        -> learned
  (the firm)  workflow        capture        evals             calibration
              (derive)        (trace)        (business         policy + KB
                 |            |              outcomes)          (improvement)
                 |            |              |               |
                 +-----------------------> Veteran Capital artifact <-----+
                                                  |
                                  applied on top of any base model
                                                  |
                                                  v
                                         BVF score() (deterministic judge)
                                                  |
                                                  v
                                       Accelerate / Fix / Stop
```

## The Six Named Components

1. Agentic workflow. A base model derives the firm's judgment inputs. Code:
   `agent/derive.py` (Claude via forced tool use, or a deterministic offline
   rubric agent).
2. Trace capture. Every derivation is logged with the reward it earned, in a
   fine-tune-ready schema. Code: `loop/trace.py`.
3. Private knowledge base. Institutional memory: firm notes plus high-reward
   exemplars, retrieved for similar new cases. Code: `kb/store.py`.
4. Private evals. Held-out cases scored against business outcomes the firm
   defines, never public benchmarks, never fit on. Code: `evals/harness.py`,
   `loop/reward.py`.
5. Learned calibration policy. A model-external adjustment fit from real traces.
   This is the learned core of token capital and the reason expertise survives a
   model swap. Code: `capital/policy.py`.
6. Sustained momentum. The loop refits and promotes each iteration; the
   provenance record shows the reward climbing. Code: `loop/run_loop.py`.

Where human agency injects direction: it defines the outcomes the private evals
score against, authors the firm notes in the knowledge base, and sets the goals the
workflow pursues. The loop is where that direction compounds into token capital.

## The Sovereignty Object

All six components are serialised into one portable, model-agnostic file, the
Veteran Capital artifact, defined by `spec/veteran-capital.schema.json` and built by
`capital/artifact.py`. It is the thing the firm owns, versions, and audits, and the
thing that must not be lost when a base model is swapped.

## The Two Proofs

The Veteran Test (`sovereignty/swap_demo.py`): the artifact, fit on one base model,
lifts a different base model it was never fit on. The expertise lives in the file.

The moat test (`sovereignty/moat_demo.py`): one fixed artifact applied across a
ladder of increasingly capable base models keeps a positive advantage that does not
collapse as base models commoditise. Better generalists ride on top of the veteran
layer rather than erasing it.

## Relationship To BVF

The deterministic BVF engine is the unchanged scoring spine, imported read-only. The
learning loop never alters it and never adds an LLM or ML to its scoring path. BVF
decides what to back; the learning loop compounds what you back.
