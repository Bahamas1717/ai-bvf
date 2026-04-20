// AI BVF adoption snapshot · pulls live numbers from npm, PyPI, and GitHub.
// Usage: node scripts/adoption.mjs   (or: npm run adoption)
// Requires Node 18+ (native fetch).

const JS_PKG  = '@aibvf/core';
const MCP_PKG = 'aibvf-mcp';
const PY_PKG  = 'aibvf';
const GH_REPO = 'Bahamas1717/ai-bvf';

async function json(url) {
  const headers = {};
  if (process.env.GITHUB_TOKEN && url.includes('api.github.com')) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const r = await fetch(url, { headers });
  if (!r.ok) return null;
  return r.json();
}

async function npmDownloads(pkg, period) {
  const d = await json(`https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(pkg)}`);
  return d?.downloads ?? null;
}

async function githubStats(repo) {
  const d = await json(`https://api.github.com/repos/${repo}`);
  if (!d) return null;
  return {
    stars: d.stargazers_count,
    forks: d.forks_count,
    watchers: d.subscribers_count,
    openIssues: d.open_issues_count,
    updatedAt: d.updated_at?.slice(0, 10),
  };
}

async function pypiStats(pkg) {
  // pypistats.org (public, no auth). Returns 404 until the package is published.
  const d = await json(`https://pypistats.org/api/packages/${pkg}/recent`);
  return d?.data ?? null;
}

function pad(n, w = 7) { return n == null ? ('—'.padStart(w, ' ')) : String(n).padStart(w, ' '); }

const [jsD, jsW, jsM, mcpD, mcpW, mcpM, py, gh] = await Promise.all([
  npmDownloads(JS_PKG, 'last-day'),
  npmDownloads(JS_PKG, 'last-week'),
  npmDownloads(JS_PKG, 'last-month'),
  npmDownloads(MCP_PKG, 'last-day'),
  npmDownloads(MCP_PKG, 'last-week'),
  npmDownloads(MCP_PKG, 'last-month'),
  pypiStats(PY_PKG),
  githubStats(GH_REPO),
]);

const line = '─'.repeat(56);
console.log('\nAI BVF · adoption snapshot · ' + new Date().toISOString().slice(0, 10));
console.log(line);
console.log('npm downloads           day     week    month');
console.log(line);
console.log(`  @aibvf/core       ${pad(jsD)}  ${pad(jsW)}  ${pad(jsM)}`);
console.log(`  aibvf-mcp         ${pad(mcpD)}  ${pad(mcpW)}  ${pad(mcpM)}`);
console.log(line);
console.log('PyPI downloads          day     week    month');
console.log(`  aibvf             ${pad(py?.last_day)}  ${pad(py?.last_week)}  ${pad(py?.last_month)}`);
console.log(line);
if (gh) {
  console.log(`GitHub · ${GH_REPO}`);
  console.log(`  stars:     ${gh.stars}`);
  console.log(`  forks:     ${gh.forks}`);
  console.log(`  watchers:  ${gh.watchers}`);
  console.log(`  issues:    ${gh.openIssues}`);
  console.log(`  last push: ${gh.updatedAt}`);
} else {
  console.log('GitHub: rate limited or unreachable.');
}
console.log();
console.log('Dashboards:');
console.log(`  npm (core):   https://www.npmjs.com/package/${JS_PKG}`);
console.log(`  npm (mcp):    https://www.npmjs.com/package/${MCP_PKG}`);
console.log(`  pypi:         https://pypi.org/project/${PY_PKG}/`);
console.log(`  github:       https://github.com/${GH_REPO}`);
console.log(`  npm-stat:     https://npm-stat.com/charts.html?package=${encodeURIComponent(JS_PKG)}&from=2026-04-19`);
console.log();
