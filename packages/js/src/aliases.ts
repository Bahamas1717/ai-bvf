/**
 * map_to_taxonomy: senior users say "customer service", "procurement" and
 * "legal", not cx, supply and risk. This maps everyday business language
 * onto the canonical enums deterministically, so callers stop passing the
 * wrong function. Matching is exact-first, then alias, then word overlap.
 */
import type { MapTaxonomyResult, TaxonomyMatch } from './types.js';
import { INDUSTRIES, FUNCTIONS, AI_TIERS, READINESS } from './taxonomy.js';

const FUNCTION_ALIASES: Record<string, string[]> = {
  cx:      ['customer service', 'customer support', 'support', 'service desk', 'contact centre', 'contact center', 'customer experience', 'call centre', 'call center', 'helpdesk', 'client service'],
  supply:  ['procurement', 'supply chain', 'logistics', 'operations', 'ops', 'manufacturing ops', 'warehouse', 'inventory', 'sourcing', 'fulfilment', 'fulfillment'],
  rd:      ['r&d', 'research', 'product development', 'product', 'engineering', 'innovation', 'design', 'development'],
  risk:    ['legal', 'compliance', 'audit', 'risk management', 'regulatory', 'governance', 'fraud', 'controls'],
  hr:      ['people', 'talent', 'recruiting', 'recruitment', 'human resources', 'people operations', 'workforce', 'l&d', 'learning and development'],
  sales:   ['marketing', 'revenue', 'commercial', 'growth', 'business development', 'crm', 'pipeline', 'pricing'],
  it:      ['technology', 'infrastructure', 'devops', 'service management', 'itsm', 'platform', 'cloud', 'security operations'],
  finance: ['accounting', 'fp&a', 'treasury', 'controlling', 'financial planning', 'billing', 'accounts payable', 'accounts receivable', 'fpa'],
};

const INDUSTRY_ALIASES: Record<string, string[]> = {
  retail:         ['retail', 'retailer', 'retailers', 'ecommerce', 'e-commerce', 'consumer goods', 'fmcg', 'grocery', 'fashion', 'shops'],
  financial:      ['financial', 'banking', 'bank', 'insurance', 'insurer', 'fintech', 'asset management', 'payments', 'financial services'],
  healthcare:     ['healthcare', 'health care', 'hospital', 'pharma', 'pharmaceutical', 'medtech', 'life sciences', 'clinical', 'health'],
  manufacturing:  ['manufacturing', 'manufacturer', 'industrial', 'automotive', 'factory', 'production', 'engineering company'],
  technology:     ['technology', 'software', 'saas', 'tech', 'it services', 'telecom', 'telecommunications'],
  logistics:      ['logistics', 'transport', 'shipping', 'freight', 'distribution', 'postal'],
  energy:         ['energy', 'utilities', 'utility', 'oil and gas', 'power', 'renewables'],
  public_sector:  ['public sector', 'government', 'municipality', 'public services', 'civil service', 'defence', 'defense'],
  professional:   ['professional services', 'consulting', 'consultancy', 'law firm', 'accounting firm', 'agency'],
  education:      ['education', 'university', 'school', 'edtech', 'training provider'],
  real_estate:    ['real estate', 'property', 'housing', 'construction', 'proptech'],
  creative:       ['creative', 'media', 'entertainment', 'publishing', 'advertising', 'gaming'],
  nonprofit:      ['nonprofit', 'ngo', 'charity', 'foundation', 'not for profit', 'non-profit'],
  universal:      ['general', 'cross-industry', 'any', 'other'],
};

const TIER_ALIASES: Record<string, string[]> = {
  gen1: ['rpa', 'automation', 'scripted', 'rules based', 'rules-based', 'workflow automation', 'macros', 'classic ml'],
  gen2: ['genai', 'gen ai', 'generative ai', 'llm', 'copilot', 'chatbot', 'assistant', 'gpt', 'claude', 'summarisation', 'drafting'],
  gen3: ['agentic', 'agents', 'autonomous', 'ai agents', 'multi-agent', 'auto-pilot', 'autopilot', 'self-directed'],
};

const READINESS_ALIASES: Record<string, string[]> = {
  agile:       ['agile', 'cross-functional', 'startup', 'product-led', 'fast-moving', 'collaborative', 'empowered teams', 'change-ready'],
  traditional: ['traditional', 'hierarchy', 'hierarchical', 'functional', 'corporate', 'committee', 'matrix', 'established'],
  siloed:      ['siloed', 'silos', 'bureaucratic', 'territorial', 'rigid', 'slow', 'legacy culture', 'political', 'fragmented'],
};

function matchOne(
  input: string,
  canon: readonly string[],
  aliases: Record<string, string[]>,
): TaxonomyMatch {
  const normalise = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const norm = normalise(input);
  const compact = norm.replace(/\s+/g, '');

  for (const c of canon) {
    if (compact === c.toLowerCase().replace(/[_\s]+/g, '')) return { input, resolved: c, matched_on: 'exact' };
  }
  for (const [c, list] of Object.entries(aliases)) {
    for (const a of list) {
      if (norm === normalise(a)) return { input, resolved: c, matched_on: a };
    }
  }
  for (const [c, list] of Object.entries(aliases)) {
    for (const a of list) {
      const alias = normalise(a);
      if (norm.includes(alias) || alias.includes(norm)) return { input, resolved: c, matched_on: a };
    }
  }
  return { input, resolved: null, suggestions: [...canon] };
}

export function mapToTaxonomy(input: {
  industry?: string;
  function?: string;
  ai_tier?: string;
  readiness?: string;
}): MapTaxonomyResult {
  const out: MapTaxonomyResult = {
    guidance: 'Pass the resolved values to score_initiative, score_portfolio, sequence_portfolio, recommend_improvements, calculate_pace_layer_drag, get_benchmark or infer_readiness. A null resolution means no confident match: ask the user to pick from the suggestions rather than guessing.',
  };
  if (input.industry !== undefined) out.industry = matchOne(input.industry, INDUSTRIES, INDUSTRY_ALIASES);
  if (input.function !== undefined) out.function = matchOne(input.function, FUNCTIONS, FUNCTION_ALIASES);
  if (input.ai_tier !== undefined) out.ai_tier = matchOne(input.ai_tier, AI_TIERS, TIER_ALIASES);
  if (input.readiness !== undefined) out.readiness = matchOne(input.readiness, READINESS, READINESS_ALIASES);
  return out;
}
