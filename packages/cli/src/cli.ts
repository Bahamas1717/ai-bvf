#!/usr/bin/env node
/**
 * aibvf-check CLI entry. Owns all side effects: read the manifest, print the
 * scorecard, and exit with a code CI can gate on.
 *
 *   exit 0  all initiatives pass the policy
 *   exit 1  one or more initiatives violate the policy (the gate "fails")
 *   exit 2  usage / config error (manifest missing, malformed, bad enum)
 *
 * Usage:
 *   aibvf-check [--manifest <path>] [--json]
 * Defaults to ./.aibvf.json.
 */
import { readFileSync } from 'node:fs';
import { runCheck, lintManifest, type Manifest } from './index.js';

const BVF_VERSION = '1.0';

function parseArgs(argv: string[]): { manifest: string; json: boolean } {
  let manifest = '.aibvf.json';
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--manifest' || a === '-m') manifest = argv[++i];
    else if (a === '--json') json = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  return { manifest, json };
}

function printHelp(): void {
  console.log(`aibvf-check — the AI BVF CI/CD pre-flight gate ("SonarQube for AI")

Scores the AI initiatives declared in a manifest and fails the build when any
would not survive a board review.

Usage:
  aibvf-check [--manifest <path>] [--json]

Options:
  -m, --manifest <path>   Manifest file (default: .aibvf.json)
      --json              Emit machine-readable JSON instead of a table
  -h, --help              Show this help

Exit codes:  0 pass   1 gate failed   2 config error
Docs: https://www.aibvf.com/protocol`);
}

function fail(msg: string): never {
  console.error(`aibvf-check: ${msg}`);
  process.exit(2);
}

const { manifest: manifestPath, json } = parseArgs(process.argv.slice(2));

let raw: string;
try {
  raw = readFileSync(manifestPath, 'utf8');
} catch {
  fail(`could not read manifest '${manifestPath}'. Create one or pass --manifest <path>.`);
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (e) {
  fail(`manifest '${manifestPath}' is not valid JSON: ${e instanceof Error ? e.message : e}`);
}

const lintErrors = lintManifest(parsed);
if (lintErrors.length) {
  fail(`manifest '${manifestPath}' is malformed:\n  - ${lintErrors.join('\n  - ')}`);
}

let result;
try {
  result = runCheck(parsed as Manifest);
} catch (e) {
  // score() throws on unknown industry/function/ai_tier/readiness enum values.
  fail(`scoring failed: ${e instanceof Error ? e.message : e}. Check the manifest enums against list_taxonomy.`);
}

if (json) {
  console.log(JSON.stringify({ bvf_version: BVF_VERSION, ...result }, null, 2));
  process.exit(result.ok ? 0 : 1);
}

// Human-readable scorecard.
const eur = (n: number) => `€${Math.round(n / 1e6 * 10) / 10}M`;
console.log('');
console.log('AI BVF pre-flight gate · bvf v' + BVF_VERSION);
console.log('─'.repeat(72));
for (const r of result.results) {
  const tag = r.violations.length ? '✗' : '✓';
  console.log(`${tag} ${r.id}  [${r.classification}]  conf ${r.decision_confidence}  ${eur(r.net_value_eur.low)}–${eur(r.net_value_eur.high)}`);
  if (r.caveat) console.log(`    ⚠ ${r.caveat}`);
  for (const v of r.violations) console.log(`    ✗ ${v}`);
}
console.log('─'.repeat(72));
const policyBits = [
  `fail_on=[${result.policy.fail_on.join(', ')}]`,
  result.policy.max_governance_risk != null ? `max_governance_risk=${result.policy.max_governance_risk}` : null,
  result.policy.min_decision_confidence != null ? `min_decision_confidence=${result.policy.min_decision_confidence}` : null,
].filter(Boolean).join('  ');
console.log(`policy: ${policyBits}`);

if (result.ok) {
  console.log(`\n✓ PASS — ${result.results.length} initiative(s) cleared the gate.`);
  process.exit(0);
} else {
  console.log(`\n✗ FAIL — ${result.failures.length} policy violation(s):`);
  for (const f of result.failures) console.log(`  - ${f}`);
  console.log('\nRaise the weak pillars (or rescope the initiative) and re-run. See recommend_improvements.');
  process.exit(1);
}
