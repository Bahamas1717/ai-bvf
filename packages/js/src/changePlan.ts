/**
 * The change-leader layer of the AI BVF.
 *
 * A Fix verdict without a route to Go is a Stop wearing a nicer word. This
 * module turns a Fix or Stop into a specific, sequenced change plan: it names
 * the one binding constraint, places the initiative between Go and Stop,
 * selects named plays matched to the failing pillar AND the organisational
 * context (readiness, tier, function, industry, and optional caller-supplied
 * diagnostics), prices the cost of waiting from the pace-layer drag model,
 * and sets a re-score gate so Fix is a decision with a deadline rather than
 * a limbo state.
 *
 * Every play works at two altitudes, the organisation (Kotter) and the
 * person (Prosci ADKAR), because a coalition without individual adoption
 * dies quietly, and trained individuals without a coalition drift back.
 * When the honest escalation from a play is Stop, the play says so.
 *
 * Deterministic, like everything in the engine: same inputs, same plan.
 */
import type {
  RecommendInput, Recommendation, ChangePlan, ChangePlay, PillarScores, ResistanceType, RiskType,
} from './types.js';
import { PACE_DRAG_RATE } from './score.js';
import { REGULATED_FUNCTIONS, REGULATED_INDUSTRIES } from './taxonomy.js';
import { assessWorkArchitecture } from './workArchitecture.js';

const ACCELERATE_FLOOR = 60;
const GOV_CEILING = 40;

// ── play builders ──────────────────────────────────────────────────────────

function coalitionFirst(readiness: string, provisional: boolean): ChangePlay {
  return {
    id: 'coalition-first',
    pillar: 'change_enablement',
    diagnosis: `The change-enablement gap here reads as desire, not budget. Readiness is ${readiness}, which means functional walls, hand-off habits, and people who have not yet been given a reason to want this. Funding adoption before people want the change buys training nobody attends.`,
    org_move: {
      method: 'Kotter steps 1 and 2, urgency and guiding coalition',
      action: 'Write the one-page case for change that answers why now and why us, then name a cross-functional sponsor coalition with a single executive chair who owns the outcome by name.',
    },
    person_move: {
      method: 'ADKAR Awareness and Desire',
      action: 'Run listening sessions with the people whose daily work changes, surface the top three reasons a reasonable person would resist, and answer them in the open before any tool lands.',
    },
    steps: [
      'Publish the one-page case for change: why now, why us, what changes for whom.',
      'Name the sponsor coalition and its executive chair, in writing.',
      'Hold listening sessions and publish the top three resistance points with honest answers.',
      'Size and fund the change budget at 10 to 15 percent of initiative spend, after desire exists, not before.',
      'Baseline adoption metrics before the build starts, so progress is measurable from day one.',
    ],
    diagnostic_questions: [
      'Who gains power, budget or status if this works?',
      'Who loses power, budget or status if this works?',
      'Who is likely to agree in the room and quietly block the change later?',
      'What would make a good person resist this change for rational reasons?',
    ],
    owner: 'Executive sponsor, a named individual who chairs the coalition',
    timeline_weeks: [4, 6],
    stop_condition: 'If no executive will chair the coalition after two direct asks, the initiative has a sponsorship vacuum, and the honest verdict is Stop until a sponsor exists.',
    provisional,
    source: 'Kotter, Leading Change (steps 1 to 2); Prosci ADKAR (Awareness, Desire); AI BVF funding review point',
  };
}

function ownerAndCapability(provisional: boolean): ChangePlay {
  return {
    id: 'owner-and-capability',
    pillar: 'change_enablement',
    diagnosis: 'The organisation can absorb change, this specific capability is simply unresourced. That is a knowledge and ability gap, not a resistance problem, and coalition-building theatre would waste the goodwill that already exists.',
    org_move: {
      method: 'Kotter step 5, remove barriers and empower action',
      action: 'Name a single accountable product owner with real capacity in writing, and fund enablement as a budget line rather than an assumption.',
    },
    person_move: {
      method: 'ADKAR Knowledge, Ability and Reinforcement',
      action: 'Run role-based skilling on the exact workflows that change, with practice time inside work hours and a named floor-level coach per affected team.',
    },
    steps: [
      'Name the accountable owner, with capacity confirmed in writing.',
      'Map the skills gap per affected role against the workflows that actually change.',
      'Deliver role-based training with protected practice windows.',
      'Wire adoption telemetry from day one, measuring usage rather than attendance.',
      'Run a reinforcement check at 30 days and close the gaps it finds.',
    ],
    diagnostic_questions: [
      'What skill does the workforce need before the tool can be trusted?',
      'What behaviour has to change before the system can create value?',
      'How will we know people have adopted the new way of working after the training has finished?',
    ],
    owner: 'Accountable product owner',
    timeline_weeks: [3, 5],
    provisional,
    source: 'Prosci ADKAR (Knowledge, Ability, Reinforcement); Kotter step 5',
  };
}

function regulatoryRemediation(provisional: boolean): ChangePlay {
  return {
    id: 'regulatory-remediation',
    pillar: 'governance_risk',
    diagnosis: 'The governance exposure here is regulatory, so no amount of change budget or communication reduces it. The remediation is sequence and design, done before the legal review at the end rather than during an incident.',
    org_move: {
      method: 'Pre-deployment regulatory sequence',
      action: 'Classify the system under the EU AI Act, build the data lineage and model-risk file, run the DPIA where personal data is in scope, and keep a decision log that answers who owns the decision when it is wrong.',
    },
    person_move: {
      method: 'Human-in-the-loop accountability',
      action: 'Put a named human in the loop on every decision with legal or significant effect on a person, with authority to override and a script for when they should, so accountability sits with someone a regulator can name.',
    },
    steps: [
      'Classify the system under the EU AI Act and record the reasoning.',
      'Map every decision with legal or significant effect on people, the GDPR Article 22 surface.',
      'Design the human-in-the-loop role with genuine override authority.',
      'Complete the data lineage and model-risk documentation.',
      'Run the DPIA, remediate the findings, then re-score.',
    ],
    diagnostic_questions: [
      'What is the AI allowed to decide?',
      'Who owns the decision when it is wrong?',
      'What evidence would we need to defend this decision six months from now?',
    ],
    owner: 'Risk or compliance executive, jointly with the initiative owner',
    timeline_weeks: [6, 10],
    stop_condition: 'If the value case only works with full autonomy that regulation requires a human inside, this is not a Fix, it is a Stop, and finding that out now is the cheapest outcome available.',
    provisional,
    source: 'EU AI Act (Regulation 2024/1689); GDPR Article 22; DORA where in scope',
  };
}

function trustGuardrails(): ChangePlay {
  return {
    id: 'trust-guardrails',
    pillar: 'governance_risk',
    diagnosis: 'The exposure is reputational, which means the risk lives in how failure looks and lands rather than in a statute. Controls that only report that governance exists will not help; the fix is guardrails people can see.',
    org_move: {
      method: 'Visible-failure red team',
      action: 'Red-team the visible failure modes, publish the escalation path, and decide in advance what the organisation says and does on the worst day.',
    },
    person_move: {
      method: 'ADKAR Reinforcement at the front line',
      action: 'Give frontline staff the disclosure language and the escalation script, so the people closest to customers are never improvising on the day something goes wrong.',
    },
    steps: [
      'Red-team the top failure modes as they would appear to a customer or a journalist.',
      'Publish the disclosure and escalation path internally.',
      'Script and train the frontline response.',
      'Put monitoring on the failure modes themselves, not just system health.',
      'Agree the worst-day communications plan before launch, then re-score.',
    ],
    diagnostic_questions: [
      'Which control is genuinely needed because of risk, and which control exists because trust is missing?',
      'What does the executive team need to know before they can sign the release with confidence?',
    ],
    owner: 'Initiative owner with the communications lead',
    timeline_weeks: [3, 5],
    provisional: false,
    source: 'Operational resilience practice; Prosci ADKAR (Reinforcement)',
  };
}

function governanceReview(provisional: boolean): ChangePlay {
  return {
    id: 'governance-review',
    pillar: 'governance_risk',
    diagnosis: 'The exposure reads operational: the risk is the system failing quietly inside a process rather than a regulator or a headline. The gap is control design, not communication.',
    org_move: {
      method: 'Proportionate pre-deployment review',
      action: 'Run a governance review scaled to the actual risk: decision rights, failure detection, rollback, and the smallest safe version that still proves value.',
    },
    person_move: {
      method: 'Named decision ownership',
      action: 'Name the person who owns the decision when the system is wrong, and give them the authority and the information to catch it early.',
    },
    steps: [
      'Map decision rights: what the AI touches, what it decides, who overrides.',
      'Design failure detection and a rollback path.',
      'Scope the smallest safe version that still proves something meaningful.',
      'Review, remediate, then re-score.',
    ],
    diagnostic_questions: [
      'What governance helps the initiative reach production safely, and what governance only reports that governance exists?',
      'What is the smallest safe version of this idea that still proves something meaningful?',
    ],
    owner: 'Initiative owner with a risk partner',
    timeline_weeks: [2, 4],
    provisional,
    source: 'AI BVF governance module',
  };
}

function valueRescope(fr: number): ChangePlay {
  const thin = fr <= 20;
  return {
    id: 'value-rescope',
    pillar: 'financial_return',
    diagnosis: thin
      ? 'Financial return this thin fails the initiative on its own, whatever the other pillars say. The honest move is subtractive: find the slice that pays, or stop.'
      : 'The case is thin because the capture rate or the scope is doing wishful work. The fix is subtractive: strengthen the case by cutting, not by adding.',
    org_move: {
      method: 'Value engineering, Stop-first',
      action: 'Rank the scope by modelled EUR contribution, cut the features dragging the case, and rebuild the business case on the highest-value slice with an honest capture rate.',
    },
    person_move: {
      method: 'Credible small win',
      action: 'Take the smaller, sharper promise to the people affected; a small win they can see builds the desire the bigger case will need later.',
    },
    steps: [
      'Rank every scope element by modelled value contribution.',
      'Cut the bottom half of the scope, deliberately and in writing.',
      'Re-model the slice with disclosed planning rates and an evidenced capture rate.',
      'Re-score the slice on its own numbers.',
      'Scale only after the slice has paid.',
    ],
    diagnostic_questions: [
      'What is the unit of value here, a saved hour, a better decision, less risk, more revenue, faster cycle time or stronger trust?',
      'What is the smallest safe version of this idea that still proves something meaningful?',
    ],
    owner: 'Initiative owner with a finance partner',
    timeline_weeks: [2, 4],
    stop_condition: 'If no slice clears on its own numbers, the initiative does not have a thin case, it has no case, and the verdict is Stop.',
    provisional: false,
    source: 'AI BVF planning rates; published research provides context only',
  };
}

function boardAnchor(): ChangePlay {
  return {
    id: 'board-anchor',
    pillar: 'strategic_alignment',
    diagnosis: 'Nobody at board level would miss this if it stopped tomorrow, which is what a low strategic alignment score means in practice.',
    org_move: {
      method: 'Kotter steps 1 and 3, urgency anchored in a real outcome',
      action: 'Anchor the initiative to one named board-level KPI with a written success metric, an owner, and a timeframe, or accept that it is a pet project.',
    },
    person_move: {
      method: 'Sponsor conviction test',
      action: 'The sponsor explains to their own leadership why this initiative carries their name; if they will not make that argument, that is the answer.',
    },
    steps: [
      'List the board-level KPIs this initiative could plausibly move.',
      'Pick one, write the success metric and the timeframe.',
      'Have the sponsor sign it, by name.',
      'Re-score with the anchor in place.',
    ],
    diagnostic_questions: [
      'Which board outcome moves if this works, and who reports that number today?',
      'What do people need to believe before they will back this properly?',
    ],
    owner: 'Executive sponsor',
    timeline_weeks: [1, 2],
    stop_condition: 'If no board KPI plausibly moves, stop before this becomes a well-run irrelevant thing.',
    provisional: false,
    source: 'Kotter, Leading Change (steps 1, 3); AI BVF strategic alignment module',
  };
}

function paceRealign(ai_tier: string, readiness: string): ChangePlay {
  return {
    id: 'pace-realign',
    pillar: 'pace_gap',
    diagnosis: `The initiative may be fine, the ground is not: ${ai_tier} ambition on ${readiness} readiness is a severe pace-layer mismatch, and project-level polish cannot fix an operating-model gap.`,
    org_move: {
      method: 'Pace-layer decision',
      action: 'Choose deliberately: lift readiness first (decision rights, cross-functional teams, faster cadence) or drop the ambition one tier for phase one and earn the right to the higher tier.',
    },
    person_move: {
      method: 'Change-load pacing',
      action: 'Match the change load to what people can actually absorb; a tier too far breeds quiet non-adoption, which reads as failure of the AI when it is failure of pacing.',
    },
    steps: [
      'Read the pace layers: which parts of the operating model move at which speed.',
      'Decide: lift readiness or drop the tier for phase one, in writing.',
      'If dropping the tier, rescope to the highest-value lower-tier slice.',
      'Re-score with the pacing decision made.',
    ],
    diagnostic_questions: [
      'What behaviour has to change before the system can create value?',
      'Where would a uniform control model create friction without creating confidence?',
    ],
    owner: 'Executive sponsor with the operating-model owner',
    timeline_weeks: [4, 8],
    provisional: false,
    source: 'AI BVF pace-layer diagnostic',
  };
}

function redesignWorkArchitecture(gaps: string[]): ChangePlay {
  return {
    id: 'work-architecture-redesign',
    pillar: 'change_enablement',
    diagnosis: `The technology case is ahead of the work design. The unresolved items are ${gaps.join(', ')}, so the initiative would automate into an operating model that has not been proved ready for it.`,
    org_move: {
      method: 'Work architecture redesign',
      action: 'Redraw the end-to-end workflow, rewrite the affected roles, assign human decision rights and change the measures before approving deployment.',
    },
    person_move: {
      method: 'Role transition',
      action: 'Show each affected person what leaves their role, what remains theirs, which judgement they retain and how their performance will be measured after the change.',
    },
    steps: [
      'Map the current workflow, including queues, hand-offs, judgement points and rework.',
      'Design the future workflow around the AI and the human decisions that remain.',
      'Rewrite affected roles, accountabilities, override rights and escalation routes.',
      'Replace measures that reward the old work, then test the design with the people who will operate it.',
    ],
    diagnostic_questions: [
      'Which steps disappear, which steps change and which new work appears?',
      'Whose role loses work, gains judgement or carries a new accountability?',
      'Who can override the AI, who handles an exception and who can stop its use?',
      'Which current target or incentive would pull people back into the old workflow?',
    ],
    owner: 'Operating-model owner with the initiative owner and affected function leader',
    timeline_weeks: [3, 6],
    stop_condition: 'Stop if the organisation will fund the technology but will not change the workflow, roles, decision rights or measures needed to operate it.',
    provisional: false,
    source: 'AI BVF work architecture gate',
  };
}

// ── plan assembly ──────────────────────────────────────────────────────────

function inferRiskType(input: RecommendInput): RiskType {
  if (input.ai_tier === 'gen3') return 'regulatory';
  if (REGULATED_FUNCTIONS.has(input.function)) return 'regulatory';
  if (input.industry && REGULATED_INDUSTRIES.has(input.industry)) return 'regulatory';
  if (input.function === 'cx' || input.function === 'sales') return 'reputational';
  return 'operational';
}

function inferResistanceType(input: RecommendInput): ResistanceType {
  return input.readiness === 'agile' ? 'skill' : 'will';
}

export function buildChangePlan(
  input: RecommendInput,
  resolved: PillarScores,
  recommendations: Recommendation[],
  feasible: boolean,
): ChangePlan {
  const { strategic_alignment: sa, financial_return: fr, change_enablement: ce, governance_risk: gr } = resolved;
  const workArchitecture = assessWorkArchitecture(input.work_architecture);

  // Severity per pillar: distance from the Accelerate thresholds, with the
  // forcing conditions (GR >= 70, FR <= 20) dominating everything else.
  const allShortfalls: Array<{ pillar: Recommendation['pillar']; severity: number; forcing: boolean }> = [
    { pillar: 'strategic_alignment', severity: Math.max(0, ACCELERATE_FLOOR - sa), forcing: false },
    { pillar: 'financial_return',    severity: Math.max(0, ACCELERATE_FLOOR - fr), forcing: fr <= 20 },
    { pillar: 'change_enablement',   severity: Math.max(0, ACCELERATE_FLOOR - ce), forcing: false },
    { pillar: 'governance_risk',     severity: Math.max(0, gr - GOV_CEILING),      forcing: gr >= 70 },
  ];
  const shortfalls = allShortfalls.filter(s => s.severity > 0);
  shortfalls.sort((a, b) => (Number(b.forcing) - Number(a.forcing)) || (b.severity - a.severity));

  const PILLAR_NAME: Record<Recommendation['pillar'], string> = {
    strategic_alignment: 'strategic alignment',
    financial_return: 'financial return',
    change_enablement: 'change enablement',
    governance_risk: 'governance risk',
  };

  const top = shortfalls[0];
  const workArchitectureBlockers = [
    ...workArchitecture.gaps,
    ...workArchitecture.unknowns.map(item => `${item} not evidenced`),
  ];
  const binding_constraint = workArchitecture.blocks_accelerate && !top?.forcing
    ? `Work architecture is the binding constraint. The unresolved items are ${workArchitectureBlockers.join(', ')}, and the initiative cannot move to Accelerate until the work around the technology has been redesigned and evidenced.`
    : top
    ? (shortfalls.length === 1
        ? `${PILLAR_NAME[top.pillar]} is the only thing standing between this initiative and a Go; everything else clears. The first play below is where this is won.`
        : `${PILLAR_NAME[top.pillar]} is the binding constraint${top.forcing ? ', and it is currently forcing the verdict on its own' : ''}. The other gaps matter, but nothing moves until this one does, so the plays are sequenced with it first.`)
    : 'No single pillar is failing; the verdict is being shaped by the combination. Work the plays in the order given.';

  // Position between Go and Stop.
  const totalShortfall = shortfalls.reduce((s, x) => s + x.severity, 0) + (workArchitecture.blocks_accelerate ? 20 : 0);
  const nearStop = gr >= 60 || fr <= 30;
  const position: ChangePlan['position'] = nearStop ? 'near_stop' : (totalShortfall <= 20 ? 'near_go' : 'contested');
  const position_detail =
    position === 'near_go'
      ? `This Fix is a Go you are ${totalShortfall} points away from. The gaps are closable inside the plan window; treat it as a funding decision waiting on evidence, not a rescue.`
      : position === 'near_stop'
        ? 'This Fix is leaning toward Stop: one adverse finding on the weak pillar tips it. Run the first play only, then re-score before spending anything else.'
        : 'This Fix is genuinely contested: real gaps on more than one pillar. Sequence the plays, do not run them in parallel, and let the re-score arbitrate.';

  // Select plays, worst pillar first.
  const plays: ChangePlay[] = [];
  if (workArchitecture.blocks_accelerate) plays.push(redesignWorkArchitecture(workArchitectureBlockers));
  for (const s of shortfalls) {
    if (s.pillar === 'change_enablement') {
      const told = input.resistance_type !== undefined;
      const rt = input.resistance_type ?? inferResistanceType(input);
      plays.push(rt === 'skill' ? ownerAndCapability(!told) : coalitionFirst(input.readiness, !told));
    } else if (s.pillar === 'governance_risk') {
      const told = input.risk_type !== undefined;
      const rt = input.risk_type ?? inferRiskType(input);
      if (rt === 'regulatory') plays.push(regulatoryRemediation(!told));
      else if (rt === 'reputational') plays.push(trustGuardrails());
      else plays.push(governanceReview(!told));
    } else if (s.pillar === 'financial_return') {
      plays.push(valueRescope(fr));
    } else {
      plays.push(boardAnchor());
    }
  }

  // Severe pace-layer mismatch is a cross-cutting play: the ground, not the project.
  const severeGap = (input.ai_tier === 'gen3' && input.readiness !== 'agile')
    || (input.ai_tier === 'gen2' && input.readiness === 'siloed');
  if (severeGap) plays.push(paceRealign(input.ai_tier, input.readiness));

  // Price the delay from the drag model over the plan window.
  const planWeeks = Math.max(...plays.map(p => p.timeline_weeks[1]), 4);
  const rate = PACE_DRAG_RATE[input.ai_tier]?.[input.readiness];
  const weeklyLow = rate ? (input.revenue_eur * rate.lo) / 52 : 0;
  const weeklyHigh = rate ? (input.revenue_eur * rate.hi) / 52 : 0;
  const cost_of_waiting_eur = {
    low: Math.round(weeklyLow * planWeeks),
    high: Math.round(weeklyHigh * planWeeks),
  };
  const cost_of_waiting = rate
    ? `Sitting in Fix is not free: over the ${planWeeks}-week plan window the pace-layer mismatch carries an estimated ${cost_of_waiting_eur.low.toLocaleString('en-IE')} to ${cost_of_waiting_eur.high.toLocaleString('en-IE')} EUR of organisational drag. If the cost of the plays above is clearly smaller than that, fix now; if it is clearly larger, treat this as a Stop and say so.`
    : 'Cost of waiting could not be modelled for this tier and readiness combination.';

  const rescore_gate = {
    clears_when: 'strategic alignment, financial return and change enablement all at or above 60, governance risk at or below 40, with workflow, roles, decision rights and measures all evidenced and no stated work architecture gaps, scored from named evidence',
    deadline_weeks: planWeeks,
  };

  const honest_stop = !feasible
    ? 'The gaps are structurally too wide to close by improving this initiative: the truthful verdict is Stop. Redirect the plays toward scoping a different use case rather than rescuing this one, and treat the budget you have not yet spent as the win.'
    : undefined;

  return { binding_constraint, position, position_detail, plays, cost_of_waiting_eur, cost_of_waiting, rescore_gate, honest_stop };
}
