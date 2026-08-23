# AI BVF Evidence Table — Intervention Effectiveness v0.1 (DRAFT)

> **Status:** calibration data for the Brain. Not wired to any package or CI path.
> Nothing here is published. This table grounds [`brain-spec.md`](./brain-spec.md)
> §3.3 (effectiveness bands) and §4 (`intervention_evidence` → confidence), and
> closes the §6 calibration gap. It is the artifact that makes the euro figure
> *defensible* instead of generated.

## How to read this table

- **`effectiveness` band (lo–hi)** = fraction of the *addressable* baseline an
  intervention removes — **before** readiness capture. (The kernel's
  `READINESS_CAPTURE` then haircuts again for org absorption, so these are
  *technical* effectiveness, not realised savings.)
- Bands are **deliberately conservative** — headline benchmarks are vendor /
  best-in-class marketing. Each band is haircut below the cited figure. The cited
  % is shown so the haircut is visible and auditable.
- **`maturity`** drives the Brain's `intervention_evidence` term:
  - **High** — multiple independent benchmarks converge → evidence 0.80–1.00
  - **Medium** — some benchmarks, vendor-weighted → 0.50–0.70
  - **Low** — sparse / single case study → 0.20–0.40
- **`addressable`** is the typical share of baseline the move can touch (function
  notes refine the §3.3 intervention defaults).

## Interventions (from brain-spec §3.3)

`Automate` · `Consolidate & re-sequence` · `Quality controls` · `Eliminate / insource`

---

## The matrix

### finance
| Intervention | Effectiveness | Headline evidence (haircut from) | Maturity |
|---|---|---|---|
| **Automate** (AP/AR, close) | **0.40–0.65** | invoice cost −72–76%; close cycle −30%; approval 19.5→3.2 days | **High** |
| **Quality controls** (anomaly, exception) | 0.30–0.55 | rework time −52% (process mining); anomaly→write-off reduction | Medium |
| **Consolidate** (close orchestration) | 0.20–0.35 | conformance 40%→80% (O2C analog) | Medium |
| **Eliminate** (duplicate manual recs/controls) | 0.50–0.80 | case-specific | Low |
*Addressable: Automate touches the labour portion (high in transactional finance).*

### hr
| Intervention | Effectiveness | Headline evidence | Maturity |
|---|---|---|---|
| **Automate** (service desk, onboarding) | **0.35–0.60** | HR ticket deflection −60%; onboarding −30% time-to-productivity; GenAI shared-svc +40% efficiency | **High** |
| **Consolidate** (case routing) | 0.20–0.35 | response time −25% (IDC) | Medium |
| **Quality controls** | 0.25–0.45 | standardised entry removes ~40% of rework loops | Low–Med |
| **Eliminate** | 0.50–0.80 | case-specific | Low |

### supply
| Intervention | Effectiveness | Headline evidence | Maturity |
|---|---|---|---|
| **Automate** (planning, S2P ops) | 0.25–0.45 | agentic ERP cycle −30–50% (UiPath/Deloitte) | Med–High |
| **Quality controls** (defect AI) | 0.30–0.55 | quality rework −20%; predictive maint. downtime −10–25% | Medium |
| **Consolidate** (source-to-pay) | 0.20–0.40 | SunExpress: 3 processes, backlog −2 months | Medium |
| **Optimise** (inventory) | 0.20–0.30 *on holding cost* | AI inventory holding cost −20–30% (Gartner) | **High** |

### cx
| Intervention | Effectiveness | Headline evidence | Maturity |
|---|---|---|---|
| **Automate** (deflection, AHT) | **0.35–0.60** | self-service deflection up to 87%; AHT −20–35% (Forrester) | **High** |
| **Quality controls** | 0.25–0.45 | first-contact-resolution uplift | Medium |

### it
| Intervention | Effectiveness | Headline evidence | Maturity |
|---|---|---|---|
| **Automate** (auto-resolution, AIOps) | **0.30–0.55** | MTTR −30–50% (typical), −40–60% (observability), outlier −78% | **High** |
| **Consolidate** (event correlation) | 0.30–0.55 | event data −85%; help-desk tickets −62% (HCL/Moogsoft) | **High** |
| **Quality controls** (self-healing) | 0.25–0.45 | failures −40% (UiPath self-healing) | Medium |

### risk
| Intervention | Effectiveness | Headline evidence | Maturity |
|---|---|---|---|
| **Quality controls** (AML false-positive) | 0.30–0.50 | AML false-positive −30–50% (Accenture) | Med–High |
| **Automate** (CSRD / EU AI Act reporting) | 0.30–0.55 | continuous compliance monitoring | Medium |

### sales
| Intervention | Effectiveness | Headline evidence | Maturity |
|---|---|---|---|
| **Automate** (CRM hygiene, quoting) | 0.30–0.50 | admin-time reduction; lead-to-cash automation | Med–Low |
*Note: sales value is mostly **revenue uplift** (kernel `BASE_RATES.sales` rev band), not process cost-out. Process-heaviness evidence here is thinner — flag low.*

### rd
| Intervention | Effectiveness | Headline evidence | Maturity |
|---|---|---|---|
| **Automate** (dev/design cycle) | 0.20–0.40 | dev cycle −20–35% (BCG) | Medium |

---

## Cross-cutting bands (use when a function cell is sparse)

These are process-mining-grounded and function-agnostic — the fallback when the
specific cell above is Low maturity:

| Intervention | Effectiveness | Evidence | Maturity |
|---|---|---|---|
| **Automate** (general transactional) | 0.30–0.50 | automation +35%; cycle −30–50% | Medium |
| **Consolidate & re-sequence** (handoffs) | 0.20–0.40 | ~40% of rework from handoff/entry gaps; O2C throughput +60% | Medium |
| **Quality controls** (rework slice) | 0.40–0.70 *on the rework portion only* | rework time −52% | Med–High |
| **Eliminate / insource** | 0.60–0.90 *on the eliminated slice* | case-specific, high variance | Low |

---

## Honest gaps (what's NOT yet defensible)

1. **`sales`, `rd`, and the whole `Eliminate` column are Low maturity** — sparse
   public evidence. The Brain must report low `intervention_evidence` for these,
   which (by §4) caps decision confidence. Don't show a paying client a confident
   euro figure off these cells.
2. **Every headline is vendor/best-in-class skewed.** The haircut + readiness
   capture are the two honesty mechanisms; they are not optional.
3. **No EU-specific calibration yet.** Figures are global; EU labour-cost and
   regulatory-overhead adjustments (cf. kernel's `IND_MULT` + compliance modules)
   should layer on before client use.
4. **`addressable` fractions are still §3.3 defaults** — they need per-function
   grounding from APQC process-cost distributions (next calibration pass).

## How this plugs into the Brain

- Replaces the placeholder effectiveness bands in **brain-spec §3.3**.
- Feeds **`intervention_evidence`** in the confidence model (**§4**) via the
  maturity rating.
- Turns the spec's DRAFT savings quantifier into a **citeable** one — every euro
  figure can now name its benchmark source.

---

## Sources

- Finance: [Concur AP automation](https://www.concur.com/blog/article/accounts-payable-automation-guide) · [Quadient AP stats 2025](https://www.quadient.com/en/blog/20-accounts-payable-statistics-highlighting-power-ap-automation-2025) · [NetSuite AP business case](https://www.netsuite.com/portal/resource/articles/accounting/ap-automation-business-case.shtml)
- HR: [ANSR GenAI shared services](https://ansr.com/blog/genai-shared-services-use-cases/) · [Rezolve.ai HR helpdesk](https://www.rezolve.ai/automated-hr-helpdesk)
- Supply: [Gartner supply chain inventory](https://www.gartner.com/en/documents/3882883) · [Gartner AI strategy survey 2025](https://www.gartner.com/en/newsroom/2025-06-11-gartner-survey-shows-just-23-percent-of-supply-chain-organizations-have-a-formal-ai-strategy)
- IT: [IR.com reduce MTTR with AI 2026](https://www.ir.com/guides/how-to-reduce-mttr-with-ai-a-2026-guide-for-enterprise-it-teams) · [AIOps MTTR −40% case](https://medium.com/@alexendrascott01/case-study-how-enterprises-use-aiops-to-cut-mttr-by-40-576600a4215a)
- Process mining (cross-cutting): [QPR process mining examples](https://www.qpr.com/blog/5-process-mining-examples) · [AIMultiple process mining use cases](https://research.aimultiple.com/process-mining-use-cases/) · [APQC benchmarking + process mining](https://www.apqc.org/resource-library/resource-listing/partners-performance-benchmarking-and-process-mining)
- Kernel baselines: `@aibvf/core` `BASE_RATES`, disclosed AI BVF planning assumptions. External studies provide context but do not publish these function-specific rates.

---
*v0.1 — calibration data, DRAFT. Conservative bands, visible haircuts, honest
maturity flags. Next: per-function `addressable` grounding from APQC; EU cost
overlay.*
