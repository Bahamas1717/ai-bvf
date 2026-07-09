# HN Launch Post (v0.2.0)

## Title Options, Ranked

1. Show HN: An MCP server that scores AI initiatives Accelerate, Fix, or Stop
2. Show HN: aibvf-mcp, open protocol for pre-flight AI portfolio scoring
3. Show HN: Give your Claude agent a second opinion before it recommends an AI project

Recommendation: Option 1. Direct, tells the reader the interface and the output in nine words.

## Body

aibvf-mcp is an open Model Context Protocol server that takes a four-pillar score for an AI initiative, runs it against published industry benchmarks and a readiness capture model, and returns Accelerate, Fix, or Stop with a modelled EUR value range, decision confidence, and an applied-modules list.

Six tools live on stdio: score_initiative, recommend_improvements, calculate_pace_layer_drag, validate_portfolio, get_benchmark, list_taxonomy.

Why I built it. I kept watching Claude agents confidently recommend AI deployments with no reference to the business case, no reference to operating model readiness, and no reference to governance exposure. You can ask Claude to write you a one-pager on rolling out agentic discharge coordination in a 800M EUR hospital group and get back an executive summary that reads like a vendor pitch. The scoring belongs in the agent's pre-flight check, not in a slide deck written after the decision.

The four pillars are Strategic Alignment, Financial Return, Change Enablement, Governance Risk, each 0 to 100, honest self-assessment. Rules are deterministic, no network, no dependencies. GR >= 70 or FR <= 20 returns Stop, all four pillars >= 60 with GR <= 40 returns Accelerate, anything else returns Fix with a specific gap list. Benchmark ranges cite McKinsey, Gartner, BCG, Deloitte, Forrester, Accenture, ServiceNow. Readiness capture rates come from EY/Oxford and Prosci change-success research.

recommend_improvements is the answer to "what do I do next." It takes a Stop or Fix and returns the pillar raises that would flip classification toward Accelerate, each with a named action and a rationale. calculate_pace_layer_drag returns the annual Organisational Drag Cost in EUR from running an AI tier that outruns your operating model, so a gen3 agent in a siloed org reads back at 4.5 to 8 percent of revenue in annual structural friction, separate from the AI build cost.

Install: npm install -g aibvf-mcp. Or register io.github.Craig-Horton/aibvf-mcp from the MCP registry and your Claude Code or Claude Desktop client picks it up automatically. There is a worked example in docs/worked-example.md with the full math on a healthcare portfolio.

What I want you to tell me I got wrong. The benchmark ranges are directional, they represent published ranges rather than audited figures, and the industry multipliers are a starting calibration. I would rather argue the numbers in public and improve the protocol than ship a quiet tool no one checks. File an issue or push a PR.

Repo: https://github.com/Craig-Horton/ai-bvf
Registry: https://registry.modelcontextprotocol.io/servers?search=aibvf
Protocol page: https://www.aibvf.com/protocol
