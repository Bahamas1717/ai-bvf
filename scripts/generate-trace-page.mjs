#!/usr/bin/env node
// generate-trace-page, render a runTrace result to a one-page HTML in the
// Bain / Tanium visual system. The output is the pre-meeting artefact an
// SCE walks into a CIO conversation with.
//
// Usage:
//   node scripts/generate-trace-page.mjs --industry <id> --start <node-id> \
//       [--account "Account name"] [--out path.html]
//
// Examples:
//   node scripts/generate-trace-page.mjs --industry financial \
//       --start board.fs.risk-adjusted-return --account "A 25b EUR European bank" \
//       --out traces/fs-sample.html

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { argv } from 'node:process';

import { runTrace, getIndustryTemplate, getNode } from '../packages/js/dist/index.js';

function parseArgs(arr) {
  const out = {};
  for (let i = 0; i < arr.length; i++) {
    const k = arr[i];
    if (k.startsWith('--')) {
      const v = arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1];
      out[k.slice(2)] = v;
      if (v !== true) i++;
    }
  }
  return out;
}

const args = parseArgs(argv.slice(2));
if (!args.industry || !args.start) {
  console.error('usage: generate-trace-page.mjs --industry <id> --start <node-id> [--account "Name"] [--out path]');
  process.exit(2);
}

const trace = runTrace({
  industry: args.industry,
  start_node: args.start,
  account_context: args.account ? { name: args.account } : undefined,
  max_paths: 6,
});
const graph = getIndustryTemplate(args.industry);
const startNode = getNode(graph, args.start);

const html = renderTracePage({ trace, graph, startNode, accountName: args.account });
const outPath = resolve(args.out ?? `traces/${args.industry}-${args.start.replace(/\./g, '-')}.html`);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.log(`wrote ${outPath}`);
console.log(`paths: ${trace.paths.length}, warnings: ${trace.warnings.length}`);

// ----------------- renderer -------------------------------------------------

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nodeLabel(graph, id) {
  return getNode(graph, id)?.label ?? id;
}

function nodeType(graph, id) {
  return getNode(graph, id)?.type ?? '';
}

function renderPath(graph, path, idx) {
  const items = path.nodes.map((id, i) => {
    const t = nodeType(graph, id);
    const lbl = nodeLabel(graph, id);
    return `
      <li class="step step-${t}">
        <div class="step-type">${esc(t)}</div>
        <div class="step-label">${esc(lbl)}</div>
      </li>`;
  }).join('');

  const accLbl = path.accountability ? nodeLabel(graph, path.accountability) : null;
  const accBlock = accLbl
    ? `<div class="accountability"><span class="acc-tag">Accountable</span> ${esc(accLbl)}</div>`
    : `<div class="accountability missing"><span class="acc-tag">No named accountable human</span> agent is ungated</div>`;

  const gating = (path.gating_issues ?? []).length
    ? `<div class="gating">${(path.gating_issues || []).map((g) => `<div>${esc(g)}</div>`).join('')}</div>`
    : '';

  return `
    <section class="path">
      <header class="path-head">
        <div class="path-num">Path ${String(idx + 1).padStart(2, '0')}</div>
        <div class="path-confidence">
          <div class="conf-bar">
            <div class="conf-fill" style="width:${Math.max(8, path.path_confidence)}%"></div>
          </div>
          <div class="conf-num">${path.path_confidence}<span class="conf-unit">/100 confidence</span></div>
        </div>
      </header>
      <ol class="steps">${items}</ol>
      ${accBlock}
      ${gating}
      <div class="reframing">
        <div class="reframing-kicker">Reframing question</div>
        <div class="reframing-q">${esc(path.reframing_question)}</div>
      </div>
    </section>`;
}

function renderTracePage({ trace, graph, startNode, accountName }) {
  const accountLine = accountName ? `For ${esc(accountName)}` : 'Template, no named account';
  const boardLabel = startNode?.label ?? trace.start_node;
  const generated = new Date(trace.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const pathsHtml = trace.paths.length
    ? trace.paths.map((p, i) => renderPath(graph, p, i)).join('')
    : '<div class="empty">No paths returned from this start node in the current template.</div>';

  const warningsHtml = trace.warnings.length
    ? `<aside class="warnings">
        <div class="warn-kicker">Warnings</div>
        <ul>${trace.warnings.map((w) => `<li><strong>${esc(w.code)}</strong>, ${esc(w.message)}</li>`).join('')}</ul>
      </aside>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Value Trace, ${esc(boardLabel)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 14mm 16mm 14mm 16mm; }
:root {
  --navy-dark: #1a2a47;
  --navy-mid: #2d3f63;
  --orange: #c97a2b;
  --orange-soft: #e2a358;
  --cream: #fafaf7;
  --cream-warm: #f5f1e8;
  --hair-grey: rgba(26, 42, 71, 0.18);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--cream);
  font-family: 'Cormorant Garamond', Georgia, serif;
  color: var(--navy-dark);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  font-size: 11pt;
  line-height: 1.45;
}
.wrap { max-width: 920px; margin: 0 auto; padding: 32px 36px 36px; }
.top-rule {
  width: 100%; height: 8px;
  background: linear-gradient(90deg, var(--orange) 0%, var(--orange) 28%, transparent 100%);
}
.head {
  display: flex; justify-content: space-between; align-items: flex-end;
  padding-bottom: 14px; border-bottom: 0.5pt solid var(--hair-grey);
  margin-bottom: 22px;
}
.masthead {
  font-family: 'Inter', sans-serif; font-size: 13pt; font-weight: 600;
  color: var(--navy-dark); letter-spacing: 0.02em;
}
.masthead .advisory {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic; font-weight: 600; color: var(--orange);
}
.meta {
  font-family: 'Inter', sans-serif; font-size: 9pt;
  color: var(--navy-mid); letter-spacing: 0.08em; text-transform: uppercase;
  text-align: right; line-height: 1.6;
}
.title-block { margin-bottom: 22px; }
.kicker {
  font-family: 'Inter', sans-serif; font-size: 9pt; font-weight: 600;
  color: var(--orange); letter-spacing: 0.26em; text-transform: uppercase;
  margin-bottom: 8px;
}
h1 {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 26pt; font-weight: 500; color: var(--navy-dark);
  line-height: 1.1; letter-spacing: -0.01em;
}
.account-line {
  font-family: 'Inter', sans-serif; font-size: 10pt; color: var(--navy-mid);
  margin-top: 4px;
}

.path {
  background: var(--cream-warm); padding: 16px 18px;
  border-left: 3px solid var(--orange); margin-bottom: 14px;
  page-break-inside: avoid;
}
.path-head {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  margin-bottom: 10px;
}
.path-num {
  font-family: 'Inter', sans-serif; font-size: 9pt; font-weight: 700;
  color: var(--orange); letter-spacing: 0.22em; text-transform: uppercase;
}
.path-confidence { display: flex; align-items: center; gap: 10px; min-width: 220px; }
.conf-bar { flex: 1; height: 6px; background: rgba(26,42,71,0.12); border-radius: 3px; overflow: hidden; }
.conf-fill { height: 100%; background: var(--orange); }
.conf-num {
  font-family: 'Inter', sans-serif; font-size: 11pt; font-weight: 600;
  color: var(--navy-dark);
}
.conf-unit { font-weight: 400; color: var(--navy-mid); font-size: 8.5pt; margin-left: 4px; letter-spacing: 0.04em; }

.steps {
  list-style: none; display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px; margin-bottom: 12px;
}
.step {
  background: white; padding: 8px 10px;
  border-top: 2px solid var(--orange-soft);
}
.step-type {
  font-family: 'Inter', sans-serif; font-size: 7.5pt; font-weight: 600;
  color: var(--orange); letter-spacing: 0.14em; text-transform: uppercase;
  margin-bottom: 2px;
}
.step-label {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 10.5pt; font-weight: 500; color: var(--navy-dark);
  line-height: 1.25;
}
.step-BoardOutcome      { border-top-color: var(--navy-dark); }
.step-BusinessInitiative{ border-top-color: var(--navy-mid); }
.step-OperatingMetric   { border-top-color: var(--orange); }
.step-Function          { border-top-color: var(--orange-soft); }
.step-AICapability      { border-top-color: #b8732a; }
.step-VendorComponent   { border-top-color: #8a5520; }

.accountability {
  font-family: 'Inter', sans-serif; font-size: 10pt; color: var(--navy-dark);
  padding-top: 8px; border-top: 0.5pt solid var(--hair-grey); margin-top: 6px;
}
.accountability .acc-tag {
  font-size: 8pt; font-weight: 700; color: var(--orange);
  letter-spacing: 0.18em; text-transform: uppercase; margin-right: 8px;
}
.accountability.missing { color: #a64d2a; }
.accountability.missing .acc-tag { color: #a64d2a; }
.gating {
  font-family: 'Inter', sans-serif; font-size: 9pt; color: #a64d2a;
  margin-top: 6px;
}

.reframing { margin-top: 10px; }
.reframing-kicker {
  font-family: 'Inter', sans-serif; font-size: 8.5pt; font-weight: 700;
  color: var(--orange); letter-spacing: 0.22em; text-transform: uppercase;
  margin-bottom: 4px;
}
.reframing-q {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 12pt; font-weight: 500; color: var(--navy-dark);
  line-height: 1.45; padding-left: 12px; border-left: 1.5pt solid var(--orange);
}

.warnings {
  background: rgba(201,122,43,0.06); padding: 14px 16px;
  border-left: 3px solid var(--orange-soft); margin-bottom: 14px;
}
.warn-kicker {
  font-family: 'Inter', sans-serif; font-size: 8.5pt; font-weight: 700;
  color: var(--orange); letter-spacing: 0.22em; text-transform: uppercase;
  margin-bottom: 8px;
}
.warnings ul { list-style: disc; padding-left: 18px; }
.warnings li { font-size: 10pt; line-height: 1.45; color: var(--navy-dark); margin-bottom: 4px; }

.empty {
  font-family: 'Inter', sans-serif; font-size: 11pt; color: var(--navy-mid);
  padding: 24px; background: var(--cream-warm); text-align: center;
}

.foot {
  margin-top: 22px; padding-top: 12px; border-top: 0.5pt solid var(--hair-grey);
  display: flex; justify-content: space-between;
  font-family: 'Inter', sans-serif; font-size: 8.5pt; color: var(--navy-mid);
  letter-spacing: 0.04em;
}
</style>
</head>
<body>
<div class="top-rule"></div>
<div class="wrap">
  <header class="head">
    <div class="masthead">Craig Horton <span class="advisory">Advisory</span></div>
    <div class="meta">
      AI Value Trace v0.3<br>
      ${esc(generated)}
    </div>
  </header>

  <div class="title-block">
    <div class="kicker">AI Value Trace, ${esc(args.industry)}</div>
    <h1>${esc(boardLabel)}</h1>
    <div class="account-line">${accountLine}, ${trace.paths.length} candidate path${trace.paths.length === 1 ? '' : 's'} to a named vendor capability.</div>
  </div>

  ${warningsHtml}

  ${pathsHtml}

  <footer class="foot">
    <div>Craig Horton Advisory &middot; Amsterdam</div>
    <div>bvf.craighortonadvisory.com</div>
  </footer>
</div>
</body>
</html>`;
}
