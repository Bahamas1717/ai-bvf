import { useState, useRef } from "react";

const SYSTEM_PROMPT = `You are the BVF (Business Value Framework) AI Classification Agent — an expert enterprise technology advisor specialising in AI disruption risk assessment for SaaS portfolios.

Your job is to classify each SaaS tool or AI initiative into one of three buckets:

🟢 AGENT-PROOF
- Systems of record requiring deterministic, auditable outputs (ERP, financial ledgers, compliance systems)
- Deep workflow integration with high switching costs
- Regulatory/compliance anchored
- AI enhances rather than replaces (e.g. Salesforce with Einstein, SAP with Joule)
Strategic action: Protect & enhance. Activate AI features. Negotiate AI bundling at renewal.

🟡 AGENT-AUGMENTED  
- AI enhances human work but humans remain essential
- Partial automation of repetitive tasks within the tool
- 15-30% seat compression likely over 2-3 years
- Examples: Collaboration tools, project management, CRM (non-core), analytics platforms
Strategic action: Renegotiate & restructure. Push for outcome-based pricing. Model seat compression.

🔴 AGENT-REPLACEABLE
- Core workflows are automatable by AI agents today
- High proportion of routine, rule-based tasks
- Low switching costs, commodity-like functionality
- Examples: Basic document creation, simple data entry tools, standalone scheduling, basic reporting
Strategic action: Do not auto-renew. Begin AI agent POC immediately. Model replacement business case.

For each initiative provided, return a JSON array. Each item must have:
- name: the tool/initiative name
- bucket: "AGENT-PROOF" | "AGENT-AUGMENTED" | "AGENT-REPLACEABLE"
- confidence: 0-100 (how confident you are in the classification)
- rationale: 2-3 sentence explanation of why this bucket
- annualRisk: "LOW" | "MEDIUM" | "HIGH" (disruption risk in next 12-24 months)
- action: specific recommended action for this tool
- savingsOpportunity: estimated % cost reduction opportunity (0 for Agent-Proof, 10-30 for Augmented, 30-80 for Replaceable)

Respond ONLY with a valid JSON array. No preamble, no markdown, no explanation outside the JSON.`;

const BUCKET_CONFIG = {
  "AGENT-PROOF": {
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.3)",
    glow: "rgba(16,185,129,0.4)",
    label: "Agent-Proof",
    tagline: "Protect & Enhance",
    emoji: "🟢",
    dot: "#10b981",
  },
  "AGENT-AUGMENTED": {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.3)",
    glow: "rgba(245,158,11,0.4)",
    label: "Agent-Augmented",
    tagline: "Renegotiate & Restructure",
    emoji: "🟡",
    dot: "#f59e0b",
  },
  "AGENT-REPLACEABLE": {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.3)",
    glow: "rgba(239,68,68,0.4)",
    label: "Agent-Replaceable",
    tagline: "Replace or Eliminate",
    emoji: "🔴",
    dot: "#ef4444",
  },
};

const RISK_CONFIG = {
  LOW: { color: "#10b981", label: "Low Risk" },
  MEDIUM: { color: "#f59e0b", label: "Medium Risk" },
  HIGH: { color: "#ef4444", label: "High Risk" },
};

const SAMPLE_INITIATIVES = `Salesforce CRM - $420k/year, 200 seats
Microsoft 365 - $180k/year, 300 seats  
ServiceNow ITSM - $350k/year, 50 seats
Workday HCM - $280k/year, enterprise
Zoom - $95k/year, 300 seats
DocuSign - $48k/year, 100 seats
Tableau - $120k/year, 80 seats
Asana - $65k/year, 150 seats
Grammarly Business - $32k/year, 200 seats
Intercom - $85k/year, 25 agents`;

export default function BVFAgent() {
  const [input, setInput] = useState("");
  const [clientName, setClientName] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [view, setView] = useState("input"); // input | results | report
  const textareaRef = useRef(null);

  const classify = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Classify the following SaaS tools and AI initiatives for ${clientName || "this client"}:\n\n${input}`,
            },
          ],
        }),
      });

      const data = await response.json();
      console.log("API response status:", response.status);
      console.log("API response data:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        setError(`API error ${response.status}: ${data.error?.message || JSON.stringify(data)}`);
        return;
      }

      const text = data.content?.map((b) => b.text || "").join("") || "";
      console.log("Raw text:", text);
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResults(parsed);
      setView("results");
    } catch (err) {
      console.error("Full error:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getBucketCounts = () => {
    if (!results) return {};
    return results.reduce((acc, r) => {
      acc[r.bucket] = (acc[r.bucket] || 0) + 1;
      return acc;
    }, {});
  };

  const getTotalSavings = () => {
    if (!results) return 0;
    return Math.round(
      results.reduce((acc, r) => acc + (r.savingsOpportunity || 0), 0) /
        results.length
    );
  };

  const counts = getBucketCounts();
  const total = results?.length || 0;

  return (
    <div style={styles.root}>
      {/* Background */}
      <div style={styles.bgGrid} />
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>BVF</div>
          <div>
            <div style={styles.logoTitle}>Business Value Framework</div>
            <div style={styles.logoSub}>AI Classification Agent</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {view !== "input" && (
            <button style={styles.backBtn} onClick={() => { setView("input"); setResults(null); }}>
              ← New Analysis
            </button>
          )}
          {view === "results" && results && (
            <button style={styles.reportBtn} onClick={() => setView("report")}>
              Board Report →
            </button>
          )}
          {view === "report" && (
            <button style={styles.reportBtn} onClick={() => setView("results")}>
              ← Results
            </button>
          )}
        </div>
      </header>

      <main style={styles.main}>
        {/* INPUT VIEW */}
        {view === "input" && (
          <div style={styles.inputView}>
            <div style={styles.heroText}>
              <h1 style={styles.h1}>
                AI Portfolio<br />
                <span style={styles.h1Accent}>Risk Intelligence</span>
              </h1>
              <p style={styles.heroSub}>
                Paste your client's SaaS inventory. The BVF Agent classifies each tool,
                scores disruption risk, and generates board-ready recommendations.
              </p>
            </div>

            <div style={styles.inputCard}>
              <div style={styles.inputRow}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Client Name</label>
                  <input
                    style={styles.textInput}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Accenture, Philips, ING Bank"
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>SaaS & AI Initiative Inventory</label>
                  <button
                    style={styles.sampleBtn}
                    onClick={() => setInput(SAMPLE_INITIATIVES)}
                  >
                    Load sample
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  style={styles.textarea}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Enter one tool per line, e.g.:\nSalesforce CRM - $420k/year, 200 seats\nServiceNow ITSM - $350k/year, 50 seats\nMicrosoft 365 - $180k/year, 300 seats`}
                  rows={10}
                />
                <div style={styles.inputHint}>
                  {input.split("\n").filter((l) => l.trim()).length} tools entered
                </div>
              </div>

              <button
                style={{ ...styles.classifyBtn, ...(loading ? styles.classifyBtnLoading : {}) }}
                onClick={classify}
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <span style={styles.loadingInner}>
                    <span style={styles.spinner} /> Classifying portfolio...
                  </span>
                ) : (
                  "Run BVF Classification →"
                )}
              </button>

              {error && <div style={styles.error}>{error}</div>}
            </div>
          </div>
        )}

        {/* RESULTS VIEW */}
        {view === "results" && results && (
          <div style={styles.resultsView}>
            {/* Summary Strip */}
            <div style={styles.summaryStrip}>
              <div style={styles.summaryTitle}>
                {clientName || "Portfolio"} Analysis — {total} initiatives classified
              </div>
              <div style={styles.summaryStats}>
                {Object.entries(BUCKET_CONFIG).map(([key, cfg]) => (
                  <div key={key} style={styles.statPill}>
                    <span style={{ ...styles.statDot, background: cfg.dot }} />
                    <span style={{ color: cfg.color, fontWeight: 700 }}>
                      {counts[key] || 0}
                    </span>
                    <span style={styles.statLabel}>{cfg.label}</span>
                  </div>
                ))}
                <div style={{ ...styles.statPill, borderColor: "rgba(99,102,241,0.4)" }}>
                  <span style={{ color: "#818cf8", fontWeight: 700 }}>{getTotalSavings()}%</span>
                  <span style={styles.statLabel}>avg savings opp.</span>
                </div>
              </div>
            </div>

            {/* Bucket Columns */}
            <div style={styles.bucketGrid}>
              {Object.entries(BUCKET_CONFIG).map(([bucketKey, cfg]) => {
                const items = results.filter((r) => r.bucket === bucketKey);
                return (
                  <div key={bucketKey} style={{ ...styles.bucketCol, borderColor: cfg.border }}>
                    <div style={{ ...styles.bucketHeader, background: cfg.bg, borderColor: cfg.border }}>
                      <span style={styles.bucketEmoji}>{cfg.emoji}</span>
                      <div>
                        <div style={{ ...styles.bucketLabel, color: cfg.color }}>{cfg.label}</div>
                        <div style={styles.bucketTagline}>{cfg.tagline}</div>
                      </div>
                      <div style={{ ...styles.bucketCount, color: cfg.color }}>{items.length}</div>
                    </div>
                    <div style={styles.bucketItems}>
                      {items.length === 0 && (
                        <div style={styles.emptyBucket}>No tools in this bucket</div>
                      )}
                      {items.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            ...styles.itemCard,
                            ...(activeCard === `${bucketKey}-${i}` ? { ...styles.itemCardActive, borderColor: cfg.border, boxShadow: `0 0 20px ${cfg.glow}` } : {}),
                          }}
                          onClick={() => setActiveCard(activeCard === `${bucketKey}-${i}` ? null : `${bucketKey}-${i}`)}
                        >
                          <div style={styles.itemTop}>
                            <div style={styles.itemName}>{item.name}</div>
                            <div style={styles.itemMeta}>
                              <span style={{ ...styles.riskBadge, color: RISK_CONFIG[item.annualRisk]?.color, borderColor: RISK_CONFIG[item.annualRisk]?.color + "66" }}>
                                {item.annualRisk}
                              </span>
                              <span style={{ ...styles.confidenceBadge, color: cfg.color }}>
                                {item.confidence}%
                              </span>
                            </div>
                          </div>

                          <div style={styles.confidenceBar}>
                            <div style={{ ...styles.confidenceFill, width: `${item.confidence}%`, background: cfg.color }} />
                          </div>

                          {activeCard === `${bucketKey}-${i}` && (
                            <div style={styles.itemExpanded}>
                              <p style={styles.rationale}>{item.rationale}</p>
                              <div style={{ ...styles.actionBox, borderColor: cfg.border, background: cfg.bg }}>
                                <span style={styles.actionLabel}>Recommended Action</span>
                                <p style={{ ...styles.actionText, color: cfg.color }}>{item.action}</p>
                              </div>
                              {item.savingsOpportunity > 0 && (
                                <div style={styles.savingsChip}>
                                  💰 {item.savingsOpportunity}% cost reduction opportunity
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BOARD REPORT VIEW */}
        {view === "report" && results && (
          <div style={styles.reportView}>
            <div style={styles.reportDoc}>
              <div style={styles.reportHeader}>
                <div style={styles.reportMeta}>CONFIDENTIAL — BOARD BRIEFING</div>
                <h2 style={styles.reportTitle}>
                  AI Portfolio Risk Assessment
                </h2>
                <div style={styles.reportClient}>
                  {clientName || "Client"} · {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </div>
                <div style={styles.reportDivider} />
              </div>

              <section style={styles.reportSection}>
                <h3 style={styles.reportSectionTitle}>Executive Summary</h3>
                <p style={styles.reportPara}>
                  This assessment applies the Business Value Framework (BVF) to classify{" "}
                  {total} SaaS tools and AI initiatives across three risk categories.
                  The analysis identifies immediate cost optimisation opportunities and
                  strategic actions to align technology investment with AI disruption timelines.
                </p>
              </section>

              <section style={styles.reportSection}>
                <h3 style={styles.reportSectionTitle}>Portfolio Classification</h3>
                <div style={styles.reportBucketSummary}>
                  {Object.entries(BUCKET_CONFIG).map(([key, cfg]) => (
                    <div key={key} style={{ ...styles.reportBucket, borderLeft: `3px solid ${cfg.color}` }}>
                      <div style={{ ...styles.reportBucketName, color: cfg.color }}>{cfg.label}</div>
                      <div style={styles.reportBucketCount}>{counts[key] || 0} tools</div>
                      <div style={styles.reportBucketPct}>
                        {total ? Math.round(((counts[key] || 0) / total) * 100) : 0}% of portfolio
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {Object.entries(BUCKET_CONFIG).map(([bucketKey, cfg]) => {
                const items = results.filter((r) => r.bucket === bucketKey);
                if (items.length === 0) return null;
                return (
                  <section key={bucketKey} style={styles.reportSection}>
                    <h3 style={{ ...styles.reportSectionTitle, color: cfg.color }}>
                      {cfg.emoji} {cfg.label} — {cfg.tagline}
                    </h3>
                    {items.map((item, i) => (
                      <div key={i} style={styles.reportItem}>
                        <div style={styles.reportItemHeader}>
                          <span style={styles.reportItemName}>{item.name}</span>
                          <span style={{ ...styles.riskBadge, color: RISK_CONFIG[item.annualRisk]?.color, borderColor: RISK_CONFIG[item.annualRisk]?.color + "44" }}>
                            {item.annualRisk} risk
                          </span>
                        </div>
                        <p style={styles.reportItemRationale}>{item.rationale}</p>
                        <p style={{ ...styles.reportItemAction, color: cfg.color }}>
                          → {item.action}
                        </p>
                      </div>
                    ))}
                  </section>
                );
              })}

              <section style={styles.reportSection}>
                <h3 style={styles.reportSectionTitle}>Strategic Recommendations</h3>
                <div style={styles.reportRecs}>
                  {counts["AGENT-REPLACEABLE"] > 0 && (
                    <div style={styles.reportRec}>
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>Immediate: </span>
                      Do not auto-renew {counts["AGENT-REPLACEABLE"]} Agent-Replaceable tool{counts["AGENT-REPLACEABLE"] > 1 ? "s" : ""}. 
                      Initiate AI agent POC within 60 days.
                    </div>
                  )}
                  {counts["AGENT-AUGMENTED"] > 0 && (
                    <div style={styles.reportRec}>
                      <span style={{ color: "#f59e0b", fontWeight: 700 }}>Near-term: </span>
                      Renegotiate {counts["AGENT-AUGMENTED"]} Agent-Augmented contracts. 
                      Model 15–30% seat compression. Push for outcome-based pricing.
                    </div>
                  )}
                  {counts["AGENT-PROOF"] > 0 && (
                    <div style={styles.reportRec}>
                      <span style={{ color: "#10b981", fontWeight: 700 }}>Strategic: </span>
                      Activate native AI features in {counts["AGENT-PROOF"]} Agent-Proof platform{counts["AGENT-PROOF"] > 1 ? "s" : ""}. 
                      Negotiate AI bundling at next renewal cycle.
                    </div>
                  )}
                  <div style={styles.reportRec}>
                    <span style={{ color: "#818cf8", fontWeight: 700 }}>Overall: </span>
                    Average savings opportunity of {getTotalSavings()}% across assessed portfolio.
                    Recommend full BVF engagement to quantify total cost optimisation potential.
                  </div>
                </div>
              </section>

              <div style={styles.reportFooter}>
                Prepared using the Business Value Framework (BVF) · Craig Horton · {new Date().getFullYear()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = {
  root: {
    minHeight: "100vh",
    background: "#080c14",
    color: "#e2e8f0",
    fontFamily: "'DM Sans', 'IBM Plex Sans', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bgGrid: {
    position: "fixed", inset: 0, zIndex: 0,
    backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  bgGlow1: {
    position: "fixed", top: "-20%", right: "-10%", width: "600px", height: "600px",
    borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  bgGlow2: {
    position: "fixed", bottom: "-20%", left: "-10%", width: "500px", height: "500px",
    borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  header: {
    position: "relative", zIndex: 10, display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "20px 32px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(8,12,20,0.8)", backdropFilter: "blur(20px)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  logo: {
    width: 44, height: 44, borderRadius: 10,
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontSize: 14, letterSpacing: "0.05em", color: "#fff",
    boxShadow: "0 0 20px rgba(99,102,241,0.4)",
  },
  logoTitle: { fontWeight: 700, fontSize: 15, color: "#f1f5f9" },
  logoSub: { fontSize: 12, color: "#64748b", marginTop: 1 },
  headerRight: { display: "flex", gap: 10 },
  backBtn: {
    padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer",
  },
  reportBtn: {
    padding: "8px 16px", borderRadius: 8,
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  main: { position: "relative", zIndex: 1, padding: "0 32px 60px" },

  // INPUT
  inputView: { maxWidth: 760, margin: "0 auto", paddingTop: 60 },
  heroText: { textAlign: "center", marginBottom: 48 },
  h1: { fontSize: 52, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 16px", color: "#f8fafc" },
  h1Accent: { background: "linear-gradient(135deg, #6366f1, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  heroSub: { fontSize: 17, color: "#64748b", lineHeight: 1.6, maxWidth: 560, margin: "0 auto" },
  inputCard: {
    background: "rgba(15,20,30,0.8)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16, padding: 32, backdropFilter: "blur(20px)",
  },
  inputRow: { marginBottom: 20 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" },
  labelRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  textInput: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14,
    outline: "none", width: "100%", boxSizing: "border-box",
  },
  textarea: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "12px 14px", color: "#f1f5f9", fontSize: 14,
    outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical",
    lineHeight: 1.7, fontFamily: "inherit",
  },
  inputHint: { fontSize: 12, color: "#475569", textAlign: "right", marginTop: 4 },
  sampleBtn: {
    fontSize: 12, color: "#6366f1", background: "transparent", border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 6, padding: "4px 10px", cursor: "pointer",
  },
  classifyBtn: {
    width: "100%", padding: "14px 24px", borderRadius: 10,
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
    cursor: "pointer", letterSpacing: "0.02em",
    boxShadow: "0 0 30px rgba(99,102,241,0.3)",
    transition: "all 0.2s",
  },
  classifyBtnLoading: { opacity: 0.7, cursor: "not-allowed" },
  loadingInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  spinner: {
    width: 16, height: 16, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
    animation: "spin 0.8s linear infinite", display: "inline-block",
  },
  error: { marginTop: 12, color: "#ef4444", fontSize: 13, textAlign: "center" },

  // RESULTS
  resultsView: { paddingTop: 32 },
  summaryStrip: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12,
    background: "rgba(15,20,30,0.8)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12, padding: "16px 24px", marginBottom: 24,
  },
  summaryTitle: { fontWeight: 700, fontSize: 15, color: "#f1f5f9" },
  summaryStats: { display: "flex", gap: 8, flexWrap: "wrap" },
  statPill: {
    display: "flex", alignItems: "center", gap: 6,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20, padding: "5px 12px", fontSize: 13,
  },
  statDot: { width: 8, height: 8, borderRadius: "50%" },
  statLabel: { color: "#64748b" },
  bucketGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 },
  bucketCol: {
    background: "rgba(15,20,30,0.6)", border: "1px solid",
    borderRadius: 12, overflow: "hidden",
  },
  bucketHeader: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 16px", borderBottom: "1px solid",
  },
  bucketEmoji: { fontSize: 20 },
  bucketLabel: { fontWeight: 700, fontSize: 14 },
  bucketTagline: { fontSize: 11, color: "#64748b", marginTop: 2 },
  bucketCount: { marginLeft: "auto", fontSize: 24, fontWeight: 900 },
  bucketItems: { padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  emptyBucket: { color: "#475569", fontSize: 13, textAlign: "center", padding: "20px 0", fontStyle: "italic" },
  itemCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8, padding: 12, cursor: "pointer", transition: "all 0.2s",
  },
  itemCardActive: { background: "rgba(255,255,255,0.06)" },
  itemTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  itemName: { fontWeight: 600, fontSize: 13, color: "#f1f5f9", lineHeight: 1.3 },
  itemMeta: { display: "flex", gap: 6, flexShrink: 0 },
  riskBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
    border: "1px solid", borderRadius: 4, padding: "2px 6px",
  },
  confidenceBadge: { fontSize: 11, fontWeight: 700 },
  confidenceBar: { height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" },
  confidenceFill: { height: "100%", borderRadius: 2, transition: "width 0.5s ease" },
  itemExpanded: { marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" },
  rationale: { fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: "0 0 10px" },
  actionBox: { border: "1px solid", borderRadius: 6, padding: "8px 10px", marginBottom: 8 },
  actionLabel: { fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 4 },
  actionText: { fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.4 },
  savingsChip: { fontSize: 12, color: "#a78bfa", background: "rgba(167,139,250,0.1)", borderRadius: 6, padding: "4px 8px", display: "inline-block" },

  // REPORT
  reportView: { maxWidth: 800, margin: "0 auto", paddingTop: 40 },
  reportDoc: {
    background: "rgba(15,20,30,0.9)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16, padding: "48px 56px",
  },
  reportHeader: { marginBottom: 40 },
  reportMeta: { fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#6366f1", textTransform: "uppercase", marginBottom: 12 },
  reportTitle: { fontSize: 32, fontWeight: 900, color: "#f8fafc", margin: "0 0 8px", letterSpacing: "-0.02em" },
  reportClient: { fontSize: 15, color: "#64748b" },
  reportDivider: { height: 1, background: "linear-gradient(90deg, rgba(99,102,241,0.5), transparent)", marginTop: 32 },
  reportSection: { marginBottom: 36 },
  reportSectionTitle: { fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 14, letterSpacing: "-0.01em" },
  reportPara: { fontSize: 14, color: "#94a3b8", lineHeight: 1.8, margin: 0 },
  reportBucketSummary: { display: "flex", gap: 16 },
  reportBucket: { flex: 1, padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 8 },
  reportBucketName: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  reportBucketCount: { fontSize: 22, fontWeight: 900, color: "#f8fafc" },
  reportBucketPct: { fontSize: 12, color: "#64748b", marginTop: 2 },
  reportItem: { marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.05)" },
  reportItemHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reportItemName: { fontWeight: 700, fontSize: 14, color: "#f1f5f9" },
  reportItemRationale: { fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: "0 0 6px" },
  reportItemAction: { fontSize: 13, fontWeight: 600, margin: 0 },
  reportRecs: { display: "flex", flexDirection: "column", gap: 12 },
  reportRec: { fontSize: 14, color: "#94a3b8", lineHeight: 1.7, paddingLeft: 16, borderLeft: "2px solid rgba(255,255,255,0.1)" },
  reportFooter: { marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#475569", textAlign: "center" },
};
