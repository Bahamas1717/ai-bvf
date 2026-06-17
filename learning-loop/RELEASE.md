# Releasing The Compounding Firm

A release plan for the learning-loop work: the why, the what, and the how. House
style throughout: sentence case, no em-dashes, no emojis, no italics.

---

## Why

### The problem we are answering
Every company is buying AI, and most are buying the same models. Parity is not an
edge. Only a small fraction of enterprises reach transformative scale, and most
agent pilots never reach production. If all the value flows to a handful of model
makers, firms end up renting their own expertise, and the displacement lands on
whole industries the way the first wave of globalisation hollowed out manufacturing.

### Why release now
The thesis is already in the air: human capital and token capital compounding inside
a firm-owned learning loop, and a frontier ecosystem rather than just a frontier
model. What has been missing is proof that a firm can actually own that loop. We
built it. Releasing now plants a flag while the conversation is live, and it does so
with a working artifact rather than another
opinion piece.

### Why release it openly
The same reason the thesis matters: value should flow broadly, not pool inside a few
players. An open spec and a runnable reference let any firm own its learning loop.
That is consistent with the ethos, and it is good positioning. Craig Horton Advisory
becomes the name attached to operationalising the idea, not just discussing it.

### Who it is for
Enterprise leaders and CIOs deciding how to build durable AI capability, transformation
and reinvention practices, and technical teams who want a concrete pattern to copy.

---

## What

### What we are releasing
- The Veteran Capital Protocol: an open JSON Schema for a portable, model-agnostic
  artifact that encodes a firm's AI judgment. `spec/veteran-capital.schema.json`.
- A runnable reference implementation: the learning loop, the private evals, the
  learned calibration policy, the knowledge base, and the two proofs.
  `learning-loop/`.
- The framework writing: The Compounding Firm whitepaper and the reference
  architecture. `learning-loop/docs/`.
- A self-contained front-end dashboard showing the results. `learning-loop/index.html`.

### How it works, in one paragraph
A base model derives a firm-specific judgment. The firm's own evals score it against
outcomes that matter to the business, not public benchmarks. The loop captures the
result, learns the gap, and folds that learning into a portable file the firm owns:
Veteran Capital. Hand that file to a different model and the expertise comes with it.
The AI Business Value Framework stays the deterministic judge underneath, unchanged.

### What we proved
- The hill climb: the private-eval reward rises as the loop accumulates real traces.
- The Veteran Test: one owned artifact lifts a base model it was never fit on.
- The moat: the firm advantage persists as base models get stronger.

### What we are not claiming
This is a proof of the mechanism on sample data, not a return-on-investment figure.
The learned layer is a calibration policy, not reinforcement learning. Gradient
fine-tuning and embedding retrieval are named as later work, not shipped.

### Attribution
This is Craig Horton Advisory's work: the thesis, the framework, and the proof.

### Licensing
Follow the existing repository split: MIT for code, CC-BY-4.0 for the protocol spec,
trademarks reserved. The learning-loop package is marked experimental and is not part
of the certified BVF protocol.

---

## How

### Release principle
Ship the proof first, claim the outcome second. Lead with the working artifact and
the honest caveat. Do not imply ROI we have not measured.

### Sequencing
1. Land the code. Merge the pull request into the repository as the experimental
   `bvf-learning-loop` package. Tag a `learning-loop-v0.1.0` release with notes that
   point at the spec, the demos, and the dashboard.
2. Validate live before amplifying. Run `python -m sovereignty.live_smoke` against a
   real model, then the loop and both demos live, so the public claims are not
   offline-only. Capture the live numbers.
3. Publish the narrative. A Transformation Brief edition built from the whitepaper,
   and a LinkedIn long-form post in Craig's voice, linking to the repo and the
   dashboard.
4. Optional visual. A Gamma deck from the one-page brief for talks and meetings.
5. Hold package publication. Do not push `bvf-learning-loop` to PyPI until the live
   validation in step 2 is done and a real-data pilot is lined up. The repo and tag
   are enough to release the idea.

### Pre-release checklist
- Live validation run completed and numbers recorded.
- The not-claiming section present wherever results are shown.
- README real-vs-stubbed table current.
- Dashboard and charts regenerated from the latest run.
- License and trademark notices intact.

### Channels
- Repository and tagged release. Primary, durable.
- The Transformation Brief. Owned audience.
- LinkedIn. Reach and the job-search and advisory positioning.
- Gamma deck. Talks, briefings, and meetings.

### Call to action for readers
Own your learning loop. Read the spec, run the reference, and bring us your real
workflows so the next step is a pilot on your data, not a demo on ours.

---

## Open decisions for Craig
- Live validation first, or release the offline proof and validate in public? Recommended live first.
- Publish the package to PyPI now, or hold until a real-data pilot? Recommended hold.
