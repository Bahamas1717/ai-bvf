# AI BVF v1.0 Scoring Formulas

Deterministic, no network, no dependencies. Every output is reproducible from the inputs alone.

## The Four Pillars

Every initiative is scored on four pillars, 0 to 100, honest self-assessment.

1. **Strategic Alignment (SA)** — how clearly this moves a board-level KPI.
2. **Financial Return (FR)** — strength of the modelled return.
3. **Change Enablement (CE)** — sponsor in place, owner named, change budget funded.
4. **Governance Risk (GR)** — regulatory and reputational exposure. Higher value means more risk.

## Classification Rules

Rules are evaluated top to bottom, first match wins.

```
if GR >= 70          then Stop    (reason: governance risk above safe threshold)
if FR <= 20          then Stop    (reason: financial return too thin to justify scope)
if SA >= 60 and FR >= 60 and CE >= 60 and GR <= 40
                     then Accelerate
otherwise            then Fix     (reason: specific gaps named in the output)
```

These thresholds are intentional. A 60 floor on the positive pillars forces the business case to actually clear a bar, and a 40 ceiling on governance risk forces risk exposure to be actively contained rather than ignored.

## Decision Confidence

A single percentage summarising the strength of the call.

```
confidence = round( (SA + FR + CE + (100 - GR)) / 4 )
```

Higher is better. A confidence of 85 on an Accelerate means every pillar is strong and risk is low; a confidence of 40 on a Fix means three or four pillars are weak at the same time, the fix list will be long.

## Gross and Net Value

Benefit ranges are modelled as a fraction of annual revenue, adjusted by three multipliers.

```
gross_low  = revenue_eur * (rev.lo + cost.lo) * industry_mult * tier_adj
gross_high = revenue_eur * (rev.hi + cost.hi) * industry_mult * tier_adj
net_low    = gross_low  * readiness_capture.low
net_high   = gross_high * readiness_capture.high
```

- `rev.lo/hi, cost.lo/hi` come from `BASE_RATES[function]` (McKinsey, Gartner, BCG, Deloitte, Forrester, Accenture, ServiceNow).
- `industry_mult` comes from `IND_MULT[industry][function]`. Universal is 1.0.
- `tier_adj` is 0.55 for gen1 (RPA / classical automation), 1.00 for gen2 (GenAI), 1.35 for gen3 (agentic).
- `readiness_capture` pulls value through the organisational operating model. Agile captures 85 to 100 percent of modelled benefit, Traditional 50 to 70 percent, Siloed 25 to 40 percent.

The gap between gross and net is the real story. An initiative with 100m EUR of gross benefit and a siloed operating model nets 25 to 40m. The remaining 60 to 75m is the cost of not changing how the organisation runs, not the cost of the AI.

## Pace Layer Diagnostic

Annual Organisational Drag Cost in EUR, driven by misalignment between the AI tier being deployed and the operating model running it.

```
annual_drag_low  = revenue_eur * PACE_DRAG_RATE[ai_tier][readiness].lo
annual_drag_high = revenue_eur * PACE_DRAG_RATE[ai_tier][readiness].hi
```

Rates range from 0.1 percent (gen1 in an agile org) to 8 percent (gen3 in a siloed org) of annual revenue. Pace gap is classified minimal, moderate, or severe. Directional, not audited, grounded in EY/Oxford six-drivers research and BCG/MIT pace-layer misalignment work.

## Recommendations

`recommend_improvements` takes a Stop or Fix and returns the specific pillar raises that would flip the call.

- Any pillar below 60 gets a target of 65, a named action, and a rationale citing published evidence.
- Governance risk above 40 gets a target of 35, action, rationale.
- `feasible=false` when the gaps are structurally too wide to close (e.g. FR <= 15 would need a 50+ point raise; GR >= 80 would need a 45+ point drop). At that point the honest answer is to scope a different use case.
- `projected_confidence` shows what the confidence would look like after the raises, letting the reader see whether the work is worth the effort.

## Sources and Licensing

Benchmark ranges cite the source. Industry multipliers and readiness capture rates are calibrated from a mix of McKinsey, BCG, Deloitte, Gartner, Forrester, Accenture, ServiceNow, EY/Oxford, and MIT published research. The schema and the scoring logic are MIT/CC-BY-4.0; the benchmark corpus and certification marks are proprietary.
