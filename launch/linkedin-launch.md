# LinkedIn Launch Post (v0.2.0)

Audience: technical leaders, CTOs, Heads of AI, transformation leads, AI product owners. Not generic LinkedIn. Keep it sharp, show the math, link the repo.

## Post

aibvf-mcp v0.2.0 is live on the Anthropic MCP registry, it gives any Claude agent a pre-flight check before it recommends an AI deployment.

I built it because I kept watching agents confidently greenlight AI projects with no reference to the business case, no reference to operating-model readiness, and no reference to governance exposure. Four pillars, strategic alignment, financial return, change enablement and governance risk, each scored 0 to 100, and a deterministic classification of Accelerate, Fix, or Stop. Benchmarks cite McKinsey, Gartner, BCG, Deloitte, Forrester, Accenture, ServiceNow, and the readiness capture rates come from EY/Oxford and Prosci.

Worked example, a 800M EUR hospital group running an agentic discharge coordination pilot. Four-pillar scores SA 75, FR 55, CE 40, GR 55 return Fix, with modelled net value between 24M and 83M EUR and a decision confidence of 54. recommend_improvements returns three specific raises, rebuild the business case with a readiness-adjusted capture rate, fund change management at 15 to 25 percent of initiative spend with a named owner, commission a pre-deployment governance review covering EU AI Act classification and human-in-the-loop design. Projected confidence after the raises rises to 68 and the target classification flips to Accelerate.

The same organisation in gen3 agentic mode with traditional readiness carries an annual Organisational Drag Cost of 20M to 36M EUR, and that is structural friction separate from the AI build. A CFO reads that number and understands the conversation immediately.

Six tools on stdio, score_initiative, recommend_improvements, calculate_pace_layer_drag, validate_portfolio, get_benchmark, list_taxonomy. Install with npm install -g aibvf-mcp, or pick up io.github.Bahamas1717/aibvf-mcp from the MCP registry and any Claude client will register it automatically.

The benchmark corpus is directional, the protocol is open, the calibration will improve through public review. If you run AI portfolios in your day job and the numbers look wrong, file an issue or push a PR, I would rather argue the calibration in public than ship a quiet tool no one checks.

Repo: https://github.com/Bahamas1717/ai-bvf

#AIBVF #MCP #AgenticAI #AITransformation #EnterpriseAI #AIGovernance

## Why This Opening Works

The first sentence puts the object in the reader's hand before any positioning. The second sentence names the failure mode in the language a CTO uses internally. The worked example earns the read by turning abstract scoring into a named number, 20M to 36M EUR, which is the number the CFO pays attention to. The close invites adversarial review, which is the right posture for a protocol that depends on public calibration.
