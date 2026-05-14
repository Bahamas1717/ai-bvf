#!/usr/bin/env node
// bvf-voice-lint, scan any text file for words and patterns banned by _voice_rules.md.
// Usage:
//   node scripts/bvf-voice-lint.mjs path/to/file [more paths]
//   node scripts/bvf-voice-lint.mjs --quiet path/to/file   (suppress per-line output, just exit code)
// Exit codes:
//   0, clean
//   1, one or more banned words / patterns found
//   2, usage error

import { readFileSync, statSync } from 'node:fs';
import { argv, exit } from 'node:process';

// Banned word list mirrors Claudeopedia/_voice_rules.md (24 April 2026).
// Add to the list here when the rules change. Keep banned items lowercase.
const BANNED_WORDS = [
  // Corporate filler
  'leverage', 'leverages', 'leveraged', 'leveraging',
  'unlock', 'unlocks', 'unlocked', 'unlocking',
  'empower', 'empowers', 'empowered', 'empowering',
  'enable', 'enables', 'enabled', 'enabling',
  'harness', 'harnesses', 'harnessed', 'harnessing',
  'fuel', 'fuels', 'fueled', 'fuelled', 'fuelling',
  'turbocharge', 'turbocharges', 'turbocharged', 'turbocharging',
  'amplify', 'amplifies', 'amplified', 'amplifying',
  'democratise', 'democratize', 'democratising', 'democratizing',

  // Consulting-deck buzz
  'ecosystem', 'ecosystems',
  'synergy', 'synergies', 'synergistic',
  'holistic', 'holistically',
  'journey', 'journeys',
  'seamless', 'seamlessly',
  'frictionless',
  'streamline', 'streamlines', 'streamlined', 'streamlining',
  'meaningful',
  'impactful',
  'actionable',
  'enterprise-grade',
  'best-in-class',
  'mission-critical',
  'robust',
  'scalable',
  'thought leader', 'thought leaders', 'thought leadership',
  'move the needle',
  'deep dive', 'deep-dive',
  'circle back',
  'low-hanging fruit',
  'double down',
  'unleash', 'unleashes', 'unleashed', 'unleashing',
  'reimagine', 'reimagines', 'reimagined', 'reimagining',
  'rethink', 'rethinks', 'rethought', 'rethinking',

  // AI-specific cliches
  'ai-powered', 'ai powered',
  'ai-enabled', 'ai enabled',
  'ai-driven', 'ai driven',
  'ai journey',
  'ai revolution',
  'ai era',
  'intelligent automation',
  'transformative',
];

// Context-sensitive words. Flagged unless they appear with a measurement or named scope.
// We surface these as WARNINGS, not errors. The author confirms.
const CONTEXT_WARNINGS = [
  { word: 'drive',        hint: 'use produce, deliver, yield, or cause, unless literal' },
  { word: 'drives',       hint: 'use produces, delivers, yields, or causes, unless literal' },
  { word: 'driving',      hint: 'use producing, delivering, yielding, or causing, unless literal' },
  { word: 'driven',       hint: 'use produced, delivered, or caused, unless literal' },
  { word: 'accelerate',   hint: 'use only with a number, e.g. accelerate by 30 percent' },
  { word: 'accelerates',  hint: 'use only with a number' },
  { word: 'accelerating', hint: 'use only with a number' },
  { word: 'at scale',     hint: 'be specific, e.g. across 12 markets, in 4 functions' },
  { word: 'orchestrate',  hint: 'name the thing being orchestrated' },
  { word: 'orchestrates', hint: 'name the thing being orchestrated' },
  { word: 'pivot',        hint: 'name the from-state and to-state' },
  { word: 'generative ai', hint: 'use only when distinguishing from agentic or classical AI' },
];

// Pattern-level rules. Regex + message.
const PATTERNS = [
  { name: 'em-dash',          re: /[—–]/g, message: 'em-dash or en-dash present, use a comma' },
  { name: 'italic-tag',       re: /<i\b[^>]*>|<em\b[^>]*>/gi, message: 'italic tag present, use roman or bold' },
  { name: 'markdown-italic',  re: /(^|[^*])\*[^*\n]+\*(?!\*)/g, message: 'markdown italic present, use bold or roman' },
  { name: 'underscore-italic', re: /(^|[^_])_[^_\n]+_(?!_)/g, message: 'markdown italic via underscore present, use bold or roman' },
  { name: 'exclamation',      re: /![\s)\]}]|!$/gm, message: 'exclamation mark present, remove unless quoting' },
  { name: 'us-spelling-ize',  re: /\b(\w+?)i[sz]e[ds]?\b/gi, message: 'check spelling, prefer British -ise over -ize where applicable' },
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scanLine(line, lineNo) {
  const findings = [];
  const lower = line.toLowerCase();

  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${escapeRegex(w)}\\b`, 'g');
    let m;
    while ((m = re.exec(lower)) !== null) {
      findings.push({ kind: 'banned', line: lineNo, col: m.index + 1, word: w, message: `banned word, ${w}` });
    }
  }
  for (const cw of CONTEXT_WARNINGS) {
    const re = new RegExp(`\\b${escapeRegex(cw.word)}\\b`, 'g');
    let m;
    while ((m = re.exec(lower)) !== null) {
      findings.push({ kind: 'warning', line: lineNo, col: m.index + 1, word: cw.word, message: `context check, ${cw.word}, ${cw.hint}` });
    }
  }
  for (const p of PATTERNS) {
    if (p.name === 'us-spelling-ize') continue; // Too noisy as a hard check, run manually with --strict-spelling
    let m;
    p.re.lastIndex = 0;
    while ((m = p.re.exec(line)) !== null) {
      findings.push({ kind: 'pattern', line: lineNo, col: m.index + 1, word: m[0], message: p.message });
    }
  }
  return findings;
}

// Strip text we should not lint, returning a same-length string with the
// stripped regions replaced by spaces. Preserves line and column positions
// so findings still point at the right place.
//   - HTML <style> and <script> blocks (CSS and JS, not prose).
//   - Block-quoted prose marked .quote, blockquote tags, or Markdown >.
function stripUnscannableRegions(text) {
  const strip = (re) => {
    text = text.replace(re, (match) => match.replace(/[^\n]/g, ' '));
  };
  // HTML script / style
  strip(/<style\b[^>]*>[\s\S]*?<\/style>/gi);
  strip(/<script\b[^>]*>[\s\S]*?<\/script>/gi);
  // HTML blockquote
  strip(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi);
  // Verbatim attributed quotes in our prose (a div with class="quote" or "ref-quote").
  strip(/<div class=("|')[^"']*\bquote\b[^"']*("|')[^>]*>[\s\S]*?<\/div>/gi);
  // Markdown block quotes, scoped to a single line each, leave the > marker.
  text = text.replace(/^(\s*>+\s*)(.*)$/gm, (_, prefix, rest) => prefix + rest.replace(/[^\n]/g, ' '));
  return text;
}

function scanFile(path, _opts) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    return { path, error: `cannot read, ${err.message}`, findings: [] };
  }
  const scannable = stripUnscannableRegions(text);
  const findings = [];
  scannable.split(/\r?\n/).forEach((line, i) => {
    findings.push(...scanLine(line, i + 1));
  });
  return { path, findings };
}

function main() {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.error('usage: node scripts/bvf-voice-lint.mjs [--quiet] <file> [more files]');
    exit(2);
  }
  const quiet = args.includes('--quiet');
  const paths = args.filter((a) => !a.startsWith('--'));

  let errorCount = 0;
  let warnCount = 0;

  for (const p of paths) {
    let isDir = false;
    try { isDir = statSync(p).isDirectory(); } catch { /* let scanFile report */ }
    if (isDir) {
      if (!quiet) console.log(`${p}, skipped, is a directory`);
      continue;
    }
    const result = scanFile(p);
    if (result.error) {
      console.error(`${p}, error, ${result.error}`);
      errorCount++;
      continue;
    }
    const banned = result.findings.filter((f) => f.kind === 'banned' || f.kind === 'pattern');
    const warns = result.findings.filter((f) => f.kind === 'warning');
    errorCount += banned.length;
    warnCount += warns.length;
    if (!quiet) {
      if (banned.length === 0 && warns.length === 0) {
        console.log(`${p}, clean`);
      } else {
        for (const f of [...banned, ...warns].sort((a, b) => a.line - b.line || a.col - b.col)) {
          const tag = f.kind === 'banned' ? 'BANNED' : f.kind === 'pattern' ? 'PATTERN' : 'WARN';
          console.log(`${p}:${f.line}:${f.col}, ${tag}, ${f.message}`);
        }
      }
    }
  }

  if (errorCount > 0) {
    if (!quiet) console.error(`\nvoice lint found ${errorCount} banned-word or pattern issue(s), ${warnCount} warning(s).`);
    exit(1);
  }
  if (!quiet && warnCount > 0) console.error(`\nvoice lint clean of banned words, ${warnCount} warning(s) to review.`);
  exit(0);
}

main();
