# Worked Example: Scoring a Healthcare AI Portfolio

A regional hospital group, 800m EUR revenue, evaluates three initiatives. This walk-through shows every number the scorer produces and how.

## Organisation

- Name: Regional Hospital Group
- Industry: healthcare
- Revenue: 800,000,000 EUR
- Readiness: traditional (the default for a hospital group with strong clinical governance but slow budget cycles)

## Initiative 1: Clinical Documentation GenAI

Function: cx (patient-facing). AI tier: gen2. Scores: SA 80, FR 70, CE 65, GR 35.

### Step-by-step scoring

- `BASE_RATES.cx` = rev 2–5%, cost 2–5%, so `rev.lo + cost.lo = 0.04`, `rev.hi + cost.hi = 0.10`.
- `IND_MULT.healthcare.cx` = 1.1.
- `TIER_ADJ.gen2` = 1.00.
- `READINESS_CAPTURE.traditional` = low 0.50, high 0.70.

```
gross_low  = 800,000,000 * 0.04 * 1.1 * 1.00 = 35,200,000 EUR
gross_high = 800,000,000 * 0.10 * 1.1 * 1.00 = 88,000,000 EUR
net_low    = 35,200,000 * 0.50 = 17,600,000 EUR
net_high   = 88,000,000 * 0.70 = 61,600,000 EUR
```

### Classification

- GR 35 < 70, FR 70 > 20 → not a Stop.
- SA 80, FR 70, CE 65, GR 35 → all four pillars clear → **Accelerate**.
- Confidence = round((80 + 70 + 65 + (100 - 35)) / 4) = **70**.

### Applied modules

`four_pillar_base`, `readiness_capture_traditional`, `healthcare_clinical_validation`, `healthcare_regulatory_overhead`.

## Initiative 2: Agentic Discharge Coordination

Function: cx. AI tier: gen3. Scores: SA 75, FR 55, CE 40, GR 55.

### Scoring

```
gross_low  = 800,000,000 * 0.04 * 1.1 * 1.35 = 47,520,000 EUR
gross_high = 800,000,000 * 0.10 * 1.1 * 1.35 = 118,800,000 EUR
net_low    = 47,520,000 * 0.50 = 23,760,000 EUR
net_high   = 118,800,000 * 0.70 = 83,160,000 EUR
```

### Classification

- GR 55 is between 40 and 70: not fatal but not clear.
- FR 55 is below the 60 floor, CE 40 is below the 60 floor.
- Classification: **Fix**. Reason: financial return is thin; change enablement is a risk; governance exposure is real. Close the gap before scaling.
- Confidence = round((75 + 55 + 40 + 45) / 4) = **54**.

### What to do next (recommend_improvements output)

- Financial Return: current 55, target 65, action "Rebuild the business case with itemised gross benefit, change cost line, and readiness-adjusted capture rate." Rationale: weak FR usually means capture rate has been assumed away.
- Change Enablement: current 40, target 65, action "Fund CM at 15 to 25 percent of initiative spend and assign a named product owner with capacity." Rationale: Prosci and EY/Oxford evidence on CM funding.
- Governance Risk: current 55, target 35, action "Commission a pre-deployment governance review covering data lineage, model risk, EU AI Act classification, and human-in-the-loop design." Rationale: agentic systems in clinical coordination fall inside EU AI Act high-risk.

Projected confidence after the raises: **68** (up from 54). Target classification: **Accelerate**. Feasible: true.

## Initiative 3: Predictive No-Show Model for Radiology Scheduling

Function: risk. AI tier: gen1. Scores: SA 55, FR 15, CE 40, GR 20.

### Scoring

```
gross_low  = 800,000,000 * 0.025 * 1.4 * 0.55 = 15,400,000 EUR
gross_high = 800,000,000 * 0.050 * 1.4 * 0.55 = 30,800,000 EUR
net_low    = 15,400,000 * 0.50 = 7,700,000 EUR
net_high   = 30,800,000 * 0.70 = 21,560,000 EUR
```

### Classification

- FR 15 is at or below 20 → **Stop**. Reason: financial return too thin to justify scope.
- Confidence = round((55 + 15 + 40 + 80) / 4) = **48**.

### What to do next

`recommend_improvements` returns `feasible=true`, because the FR gap is 50 points (RAISE_TARGET 65 minus current 15) which is at the edge of feasibility. The recommendation flags that the business case probably has an assumed capture rate that would not survive a readiness check. The honest answer here is either rebuild the case at a gen2 tier so the benefit range actually earns its place, or scope a different use case.

## Pace Layer Diagnostic for this organisation

Inputs: revenue 800m EUR, tier gen3 (the agentic initiative above), readiness traditional.

```
PACE_DRAG_RATE.gen3.traditional = lo 2.5%, hi 4.5%
annual_drag_low  = 800,000,000 * 0.025 = 20,000,000 EUR
annual_drag_high = 800,000,000 * 0.045 = 36,000,000 EUR
```

Pace gap: **severe**. The cost of running gen3 in a traditional operating model is 20 to 36m EUR annually in structural friction alone, separate from the cost of the AI build. This is the number a CFO sees and understands.

## What this tells the executive

The portfolio looks like 86m to 230m of net value on paper across three initiatives. After pace-layer drag on the agentic one, real net is 50 to 130m, with 20 to 36m lost per year if the operating model stays where it is. The honest call: accelerate initiative 1 now, fix initiative 2 before it scales, stop initiative 3 until the business case is rebuilt, and invest in moving readiness from traditional toward agile so the pace-layer tax stops compounding.
