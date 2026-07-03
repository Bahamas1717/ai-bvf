# UI Kit — AI BVF Protocol / Landing Page

The public landing / protocol page, **theme-aware** (light + dark via `data-theme` on `<html>`, toggled in the nav).

Sections (`ProtocolPage.jsx`): nav + theme toggle · hero ("Stop bad AI projects before agents recommend them." + Deterministic/Open/On-prem/MIT chips) · what it does (four pillars + deterministic rule mirror) · the 8 MCP tools grid · the **CI gate** featuring the signature `Scorecard` · 30-second install · footer ("What you don't gate, you don't govern.").

Composes primitives from `window.AIBVFDesignSystem_ab2d84` (Button, Label, VerdictBadge, Mirror, Scorecard) via `../../_ds_bundle.js`. Open `index.html`; use the Dark/Light toggle in the nav.
