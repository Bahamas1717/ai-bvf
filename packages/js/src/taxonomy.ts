export const INDUSTRIES = [
  'universal','creative','education','energy','financial','healthcare','logistics',
  'manufacturing','nonprofit','professional','public_sector','real_estate','retail','technology',
] as const;

export const FUNCTIONS = ['finance','hr','sales','supply','cx','risk','it','rd'] as const;
export const AI_TIERS = ['gen1','gen2','gen3'] as const;
export const READINESS = ['agile','traditional','siloed'] as const;

export const INDUSTRY_LABEL: Record<string, string> = {
  universal: 'Universal / Other', creative: 'Creative & Media', education: 'Education & Research',
  energy: 'Energy & Utilities', financial: 'Financial Services', healthcare: 'Healthcare / MedTech',
  logistics: 'Logistics & Transportation', manufacturing: 'Manufacturing & Supply Chain',
  nonprofit: 'Non-Profit & NGO', professional: 'Professional Services',
  public_sector: 'Public Sector & Government', real_estate: 'Real Estate & Construction',
  retail: 'Retail / Consumer', technology: 'Technology',
};

export const FUNCTION_LABEL: Record<string, string> = {
  finance: 'Finance & CFO', hr: 'HR & Workforce', sales: 'Sales & Revenue', supply: 'Supply Chain',
  cx: 'Customer Experience', risk: 'Risk & Compliance', it: 'IT & Platform', rd: 'R&D / Innovation',
};

export const TIER_LABEL: Record<string, string> = {
  gen1: 'Gen 1 — Automation (RPA)',
  gen2: 'Gen 2 — GenAI',
  gen3: 'Gen 3 — Agentic',
};

/**
 * Contexts where governance exposure defaults to regulatory. Shared by the
 * pillar estimator and the change-leader play selector so both infer the
 * same way from the same facts.
 */
export const REGULATED_FUNCTIONS: ReadonlySet<string> = new Set(['risk', 'finance', 'hr']);
export const REGULATED_INDUSTRIES: ReadonlySet<string> = new Set(['financial', 'healthcare', 'public_sector', 'energy']);
