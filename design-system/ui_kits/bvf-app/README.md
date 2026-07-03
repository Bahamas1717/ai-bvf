# UI Kit — AI BVF Scoring App

Interactive recreation of the AI BVF product surface (the runtime arm of `aibvf-mcp` / `@aibvf/core`). Three tabs mirror the MCP tools:

- **Score** (`ScoreWorkspace.jsx`) — `score_initiative`. Four pillar sliders drive a live deterministic verdict (Accelerate / Fix / Stop), modelled EUR range, decision confidence, applied modules, and a `recommend_improvements` mirror.
- **Portfolio** (`PortfolioDashboard.jsx`) — `score_portfolio`. Board readout: KPI strip, initiative table with verdict chips, top-by-value + aggregate pillar health.
- **Advisor** (`AdvisorBrain.jsx`) — `diagnose_process`. Observed process signals → heaviness, intervention, net EUR saving, verdict.

`AppHeader.jsx` is the shared sticky header + tab nav.

## Composition
Every screen composes the design-system primitives from `window.AIBVFDesignSystem_ab2d84` (Button, Card, KpiCard, VerdictBadge, PillarMeter, Label, Mirror, Input, Select) loaded via `../../_ds_bundle.js`. No primitive is re-implemented here.

Open `index.html`. The deterministic scoring logic in ScoreWorkspace mirrors the framework's real rules (`GR≥70` or `FR≤20` → Stop; all four ≥60 with `GR≤40` → Accelerate; else Fix).
