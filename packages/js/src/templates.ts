// Industry templates for the AI Value Trace.
//
// Each template is a starter graph: the canonical board outcomes, the named
// business initiatives that move them, the operating metrics that instrument
// the initiatives, the function nodes (reused across all templates from the
// existing BVF function enum), the AI capabilities that automate the
// functions, the named human accountability layers, and the vendor component
// leaves an SCE walks into a meeting with.
//
// Templates are intentionally small (one or two canonical paths per board
// outcome). They are starting points. An SCE adds account-specific edges
// with propose_edge during a live Trace.
//
// Sources are cited by name and year. Where a benchmark range is implied,
// the canonical source is named so the SCE can hand the citation to the
// CFO during the conversation.

import type { ValueTraceGraph, TraceNode, TraceEdge } from './value-trace.js';
import type { Industry } from './types.js';

// Shared nodes reused across all templates.
const SHARED_FUNCTION_NODES: TraceNode[] = [
  { id: 'function.finance', type: 'Function', label: 'Finance' },
  { id: 'function.hr',      type: 'Function', label: 'HR and workforce' },
  { id: 'function.sales',   type: 'Function', label: 'Sales and revenue' },
  { id: 'function.supply',  type: 'Function', label: 'Supply chain' },
  { id: 'function.cx',      type: 'Function', label: 'Customer experience' },
  { id: 'function.risk',    type: 'Function', label: 'Risk and compliance' },
  { id: 'function.it',      type: 'Function', label: 'IT and platform' },
  { id: 'function.rd',      type: 'Function', label: 'R and D / innovation' },
];

const SHARED_ACCOUNTABILITY_NODES: TraceNode[] = [
  { id: 'accountability.chief-ai-officer', type: 'AccountabilityLayer', label: 'Chief AI Officer' },
  { id: 'accountability.cfo',              type: 'AccountabilityLayer', label: 'Chief Financial Officer' },
  { id: 'accountability.cro',              type: 'AccountabilityLayer', label: 'Chief Risk Officer' },
  { id: 'accountability.coo',              type: 'AccountabilityLayer', label: 'Chief Operating Officer' },
  { id: 'accountability.cdo',              type: 'AccountabilityLayer', label: 'Chief Data Officer' },
  { id: 'accountability.bu-head',          type: 'AccountabilityLayer', label: 'Business unit head' },
];

// Vendor leaves anchored in the five target-employer product taxonomies as at
// May 2026. Add to this list as new vendor moves land. The Trace is most
// credible when an SCE at any of these vendors sees their own product as a leaf.
const SHARED_VENDOR_NODES: TraceNode[] = [
  { id: 'vendor.netapp-afx',            type: 'VendorComponent', label: 'NetApp AFX exascale storage for AI' },
  { id: 'vendor.netapp-ontap-aws',      type: 'VendorComponent', label: 'NetApp ONTAP native on AWS' },
  { id: 'vendor.servicenow-now-assist', type: 'VendorComponent', label: 'ServiceNow Now Assist' },
  { id: 'vendor.salesforce-agentforce', type: 'VendorComponent', label: 'Salesforce Agentforce' },
  { id: 'vendor.microsoft-copilot',     type: 'VendorComponent', label: 'Microsoft Copilot' },
  { id: 'vendor.microsoft-agent-365',   type: 'VendorComponent', label: 'Microsoft Agent 365' },
  { id: 'vendor.azure-ai-foundry',      type: 'VendorComponent', label: 'Azure AI Foundry' },
];

// ----------------- Financial Services template -----------------------------

const FS_NODES: TraceNode[] = [
  // Board outcomes that matter most in FS in 2026
  { id: 'board.fs.risk-adjusted-return', type: 'BoardOutcome', label: 'Risk-adjusted return on capital',
    industry_scope: ['financial'],
    evidence: [{ source: 'McKinsey Global Banking Annual Review', year: 2026 }] },
  { id: 'board.fs.cost-income-ratio', type: 'BoardOutcome', label: 'Cost to income ratio',
    industry_scope: ['financial'],
    evidence: [{ source: 'KPMG Pulse of Banking', year: 2026 }] },
  { id: 'board.fs.fraud-loss-rate', type: 'BoardOutcome', label: 'Fraud loss rate, basis points of transaction volume',
    industry_scope: ['financial'],
    evidence: [{ source: 'Deloitte Financial Crime Survey', year: 2026 }] },

  // Business initiatives that move FS board outcomes
  { id: 'initiative.fs.next-best-action', type: 'BusinessInitiative', label: 'Next best action for relationship managers',
    industry_scope: ['financial'] },
  { id: 'initiative.fs.fraud-modernisation', type: 'BusinessInitiative', label: 'Real-time fraud modernisation',
    industry_scope: ['financial'] },
  { id: 'initiative.fs.servicing-automation', type: 'BusinessInitiative', label: 'Servicing automation across retail and SME',
    industry_scope: ['financial'] },

  // Operating metrics that instrument FS initiatives
  { id: 'metric.fs.advisor-productivity', type: 'OperatingMetric', label: 'Adviser productivity, revenue per FTE',
    function_scope: ['sales'] },
  { id: 'metric.fs.fraud-mttd', type: 'OperatingMetric', label: 'Fraud mean time to detection, seconds',
    function_scope: ['risk'] },
  { id: 'metric.fs.servicing-handle-time', type: 'OperatingMetric', label: 'Servicing handle time, seconds per interaction',
    function_scope: ['cx'] },

  // AI capabilities by function
  { id: 'capability.gen2.advisor-copilot', type: 'AICapability', label: 'GenAI adviser copilot',
    ai_tier: 'gen2', function_scope: ['sales'] },
  { id: 'capability.gen3.fraud-agent', type: 'AICapability', label: 'Agentic fraud triage and case management',
    ai_tier: 'gen3', function_scope: ['risk'] },
  { id: 'capability.gen2.servicing-copilot', type: 'AICapability', label: 'GenAI servicing copilot',
    ai_tier: 'gen2', function_scope: ['cx'] },
];

const FS_EDGES: TraceEdge[] = [
  // Initiative -> Board outcome
  { from: 'initiative.fs.next-best-action',     to: 'board.fs.risk-adjusted-return', relation: 'moves',
    confidence: 70,
    evidence: [{ source: 'McKinsey Global Banking Annual Review', year: 2026 }] },
  { from: 'initiative.fs.fraud-modernisation',  to: 'board.fs.fraud-loss-rate',      relation: 'moves',
    confidence: 80,
    evidence: [{ source: 'Deloitte Financial Crime Survey', year: 2026 }] },
  { from: 'initiative.fs.servicing-automation', to: 'board.fs.cost-income-ratio',    relation: 'moves',
    confidence: 75,
    evidence: [{ source: 'KPMG Pulse of Banking', year: 2026 }] },

  // Operating metric -> Initiative
  { from: 'metric.fs.advisor-productivity',     to: 'initiative.fs.next-best-action',     relation: 'instruments', confidence: 75 },
  { from: 'metric.fs.fraud-mttd',               to: 'initiative.fs.fraud-modernisation',  relation: 'instruments', confidence: 85 },
  { from: 'metric.fs.servicing-handle-time',    to: 'initiative.fs.servicing-automation', relation: 'instruments', confidence: 80 },

  // Function -> Operating metric (function tracks the metric)
  { from: 'function.sales', to: 'metric.fs.advisor-productivity',   relation: 'tracks', confidence: 85 },
  { from: 'function.risk',  to: 'metric.fs.fraud-mttd',             relation: 'tracks', confidence: 90 },
  { from: 'function.cx',    to: 'metric.fs.servicing-handle-time',  relation: 'tracks', confidence: 88 },

  // AI capability -> Function
  { from: 'capability.gen2.advisor-copilot',   to: 'function.sales', relation: 'automates', confidence: 70 },
  { from: 'capability.gen3.fraud-agent',       to: 'function.risk',  relation: 'automates', confidence: 75 },
  { from: 'capability.gen2.servicing-copilot', to: 'function.cx',    relation: 'automates', confidence: 78 },

  // Accountability -> AI capability (gates)
  { from: 'accountability.chief-ai-officer', to: 'capability.gen2.advisor-copilot',   relation: 'gates', confidence: 90 },
  { from: 'accountability.cro',              to: 'capability.gen3.fraud-agent',       relation: 'gates', confidence: 95 },
  { from: 'accountability.coo',              to: 'capability.gen2.servicing-copilot', relation: 'gates', confidence: 85 },

  // Vendor -> AI capability (delivers)
  { from: 'vendor.salesforce-agentforce', to: 'capability.gen2.advisor-copilot',   relation: 'delivers', confidence: 80 },
  { from: 'vendor.servicenow-now-assist', to: 'capability.gen2.servicing-copilot', relation: 'delivers', confidence: 78 },
  { from: 'vendor.microsoft-copilot',     to: 'capability.gen2.servicing-copilot', relation: 'delivers', confidence: 72 },
  { from: 'vendor.azure-ai-foundry',      to: 'capability.gen3.fraud-agent',       relation: 'delivers', confidence: 76 },
];

// ----------------- Public Sector + Sovereign AI template -------------------

const PS_NODES: TraceNode[] = [
  { id: 'board.ps.cost-per-citizen', type: 'BoardOutcome', label: 'Cost per citizen served',
    industry_scope: ['public_sector'],
    evidence: [{ source: 'OECD Public Sector Productivity Outlook', year: 2026 }] },
  { id: 'board.ps.sovereignty', type: 'BoardOutcome', label: 'Data and compute sovereignty position',
    industry_scope: ['public_sector'],
    evidence: [{ source: 'European Commission InvestAI', year: 2026 }] },
  { id: 'board.ps.service-trust', type: 'BoardOutcome', label: 'Public trust in digital services',
    industry_scope: ['public_sector'],
    evidence: [{ source: 'Edelman Trust Barometer', year: 2026 }] },

  { id: 'initiative.ps.case-automation', type: 'BusinessInitiative', label: 'End-to-end case automation, benefits and licences',
    industry_scope: ['public_sector'] },
  { id: 'initiative.ps.sovereign-cloud', type: 'BusinessInitiative', label: 'Sovereign cloud and AI compute build',
    industry_scope: ['public_sector'] },

  { id: 'metric.ps.case-cycle-time',  type: 'OperatingMetric', label: 'Case cycle time, days', function_scope: ['cx'] },
  { id: 'metric.ps.sovereign-uptime', type: 'OperatingMetric', label: 'Sovereign workload uptime in country', function_scope: ['it'] },

  { id: 'capability.gen2.case-copilot',     type: 'AICapability', label: 'GenAI case officer copilot', ai_tier: 'gen2', function_scope: ['cx'] },
  { id: 'capability.gen3.sovereign-fabric', type: 'AICapability', label: 'Agentic data fabric for sovereign AI',         ai_tier: 'gen3', function_scope: ['it'] },
];

const PS_EDGES: TraceEdge[] = [
  { from: 'initiative.ps.case-automation', to: 'board.ps.cost-per-citizen', relation: 'moves', confidence: 75,
    evidence: [{ source: 'OECD Public Sector Productivity Outlook', year: 2026 }] },
  { from: 'initiative.ps.case-automation', to: 'board.ps.service-trust',    relation: 'moves', confidence: 60 },
  { from: 'initiative.ps.sovereign-cloud', to: 'board.ps.sovereignty',      relation: 'moves', confidence: 85,
    evidence: [{ source: 'European Commission InvestAI', year: 2026 }] },

  { from: 'metric.ps.case-cycle-time',  to: 'initiative.ps.case-automation', relation: 'instruments', confidence: 80 },
  { from: 'metric.ps.sovereign-uptime', to: 'initiative.ps.sovereign-cloud', relation: 'instruments', confidence: 78 },

  { from: 'function.cx', to: 'metric.ps.case-cycle-time',  relation: 'tracks', confidence: 85 },
  { from: 'function.it', to: 'metric.ps.sovereign-uptime', relation: 'tracks', confidence: 88 },

  { from: 'capability.gen2.case-copilot',     to: 'function.cx', relation: 'automates', confidence: 72 },
  { from: 'capability.gen3.sovereign-fabric', to: 'function.it', relation: 'automates', confidence: 70 },

  { from: 'accountability.coo',              to: 'capability.gen2.case-copilot',     relation: 'gates', confidence: 85 },
  { from: 'accountability.chief-ai-officer', to: 'capability.gen3.sovereign-fabric', relation: 'gates', confidence: 90 },

  { from: 'vendor.microsoft-copilot',  to: 'capability.gen2.case-copilot',     relation: 'delivers', confidence: 70 },
  { from: 'vendor.netapp-afx',         to: 'capability.gen3.sovereign-fabric', relation: 'delivers', confidence: 82 },
  { from: 'vendor.netapp-ontap-aws',   to: 'capability.gen3.sovereign-fabric', relation: 'delivers', confidence: 75 },
];

// ----------------- Healthcare template -------------------------------------

const HC_NODES: TraceNode[] = [
  { id: 'board.hc.cost-per-episode',   type: 'BoardOutcome', label: 'Cost per care episode',
    industry_scope: ['healthcare'], evidence: [{ source: 'Deloitte Global Healthcare Outlook', year: 2026 }] },
  { id: 'board.hc.clinical-quality',   type: 'BoardOutcome', label: 'Clinical quality, adjusted readmission rate',
    industry_scope: ['healthcare'], evidence: [{ source: 'NHS Digital Quality Account', year: 2026 }] },

  { id: 'initiative.hc.clinical-documentation', type: 'BusinessInitiative', label: 'Ambient clinical documentation',
    industry_scope: ['healthcare'] },
  { id: 'initiative.hc.prior-auth',             type: 'BusinessInitiative', label: 'Prior authorisation automation',
    industry_scope: ['healthcare'] },

  { id: 'metric.hc.clinician-time-saved',  type: 'OperatingMetric', label: 'Clinician documentation time, minutes per shift', function_scope: ['hr'] },
  { id: 'metric.hc.auth-cycle-time',       type: 'OperatingMetric', label: 'Prior authorisation cycle time, hours',           function_scope: ['risk'] },

  { id: 'capability.gen2.clinical-scribe', type: 'AICapability', label: 'Ambient GenAI scribe', ai_tier: 'gen2', function_scope: ['hr'] },
  { id: 'capability.gen3.auth-agent',      type: 'AICapability', label: 'Agentic prior authorisation', ai_tier: 'gen3', function_scope: ['risk'] },
];

const HC_EDGES: TraceEdge[] = [
  { from: 'initiative.hc.clinical-documentation', to: 'board.hc.clinical-quality', relation: 'moves', confidence: 70 },
  { from: 'initiative.hc.clinical-documentation', to: 'board.hc.cost-per-episode', relation: 'moves', confidence: 65 },
  { from: 'initiative.hc.prior-auth',             to: 'board.hc.cost-per-episode', relation: 'moves', confidence: 75 },

  { from: 'metric.hc.clinician-time-saved', to: 'initiative.hc.clinical-documentation', relation: 'instruments', confidence: 82 },
  { from: 'metric.hc.auth-cycle-time',      to: 'initiative.hc.prior-auth',             relation: 'instruments', confidence: 80 },

  { from: 'function.hr',   to: 'metric.hc.clinician-time-saved', relation: 'tracks', confidence: 80 },
  { from: 'function.risk', to: 'metric.hc.auth-cycle-time',      relation: 'tracks', confidence: 85 },

  { from: 'capability.gen2.clinical-scribe', to: 'function.hr',   relation: 'automates', confidence: 75 },
  { from: 'capability.gen3.auth-agent',      to: 'function.risk', relation: 'automates', confidence: 70 },

  { from: 'accountability.cdo',              to: 'capability.gen2.clinical-scribe', relation: 'gates', confidence: 85 },
  { from: 'accountability.chief-ai-officer', to: 'capability.gen3.auth-agent',      relation: 'gates', confidence: 90 },

  { from: 'vendor.microsoft-copilot', to: 'capability.gen2.clinical-scribe', relation: 'delivers', confidence: 78 },
  { from: 'vendor.salesforce-agentforce', to: 'capability.gen3.auth-agent',  relation: 'delivers', confidence: 70 },
  { from: 'vendor.servicenow-now-assist', to: 'capability.gen3.auth-agent',  relation: 'delivers', confidence: 72 },
];

// ----------------- Template registry ---------------------------------------

export function getIndustryTemplate(industry: Industry): ValueTraceGraph {
  const base: ValueTraceGraph = {
    trace_version: '0.3',
    industry,
    nodes: [...SHARED_FUNCTION_NODES, ...SHARED_ACCOUNTABILITY_NODES, ...SHARED_VENDOR_NODES],
    edges: [],
  };

  switch (industry) {
    case 'financial':
      base.nodes.push(...FS_NODES);
      base.edges.push(...FS_EDGES);
      return base;
    case 'public_sector':
      base.nodes.push(...PS_NODES);
      base.edges.push(...PS_EDGES);
      return base;
    case 'healthcare':
      base.nodes.push(...HC_NODES);
      base.edges.push(...HC_EDGES);
      return base;
    default:
      // For industries without a v0.3 template yet, return the shared scaffold.
      return base;
  }
}

export const TEMPLATED_INDUSTRIES: Industry[] = ['financial', 'public_sector', 'healthcare'];
