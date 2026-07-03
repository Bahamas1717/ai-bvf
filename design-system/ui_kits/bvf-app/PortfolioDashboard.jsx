/* AI BVF — Portfolio board readout. Aggregates score_portfolio into the
   board-level shape: counts, aggregate EUR, top + highest-risk initiative.
   UI-kit screen. */
function PortfolioDashboard() {
  const NS = window.AIBVFDesignSystem_ab2d84;
  const { Label, Card, KpiCard, VerdictBadge, PillarMeter, Button } = NS;

  const rows = [
    { name: 'CX copilot rollout', fn: 'CX', tier: 'gen3', v: 'Accelerate', val: '€12.4M', conf: 72, gr: 34 },
    { name: 'Claims triage automation', fn: 'Operations', tier: 'gen2', v: 'Fix', val: '€8.1M', conf: 54, gr: 48 },
    { name: 'Autonomous procurement agent', fn: 'Finance', tier: 'gen3', v: 'Stop', val: '€0.0M', conf: 38, gr: 74 },
    { name: 'HR onboarding assistant', fn: 'HR', tier: 'gen2', v: 'Accelerate', val: '€4.6M', conf: 66, gr: 30 },
    { name: 'Demand forecast rebuild', fn: 'Operations', tier: 'gen2', v: 'Fix', val: '€6.9M', conf: 58, gr: 41 },
    { name: 'Contact-centre voice bot', fn: 'CX', tier: 'gen3', v: 'Stop', val: '€0.0M', conf: 44, gr: 71 },
  ];

  const tone = (v) => v.toLowerCase();
  const th = { textAlign: 'left', padding: '13px 14px', fontSize: '10px', letterSpacing: '1.4px',
    textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600,
    borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' };
  const td = { padding: '15px 14px', fontSize: '14px', color: 'var(--text)', borderBottom: '1px solid var(--line-soft)' };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 32px 80px' }}>
      <Label>Board readout · score_portfolio</Label>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: '10px 0 0', fontSize: '30px' }}>Q3 AI investment portfolio</h1>
        <Button variant="outline" size="sm">Export executive readout</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginTop: '26px' }}>
        <KpiCard label="Net value at stake" value="€32.0M" sub="Aggregate across 6" tone="accent" />
        <KpiCard label="Accelerate / Fix / Stop" value="2 · 2 · 2" sub="Portfolio split" tone="neutral" />
        <KpiCard label="Mean confidence" value="55" sub="Board-level" tone="fix" />
        <KpiCard label="Highest risk" value="GR 74" sub="Procurement agent" tone="stop" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '20px', marginTop: '20px', alignItems: 'start' }}>
        <Card padding="8px 8px 4px">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Initiative</th>
                <th style={th}>Function</th>
                <th style={th}>Verdict</th>
                <th style={{ ...th, textAlign: 'right' }}>Net value</th>
                <th style={{ ...th, textAlign: 'right' }}>Conf.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td style={td}>
                    <div style={{ fontWeight: 500, color: 'var(--ice)' }}>{r.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{r.tier}</div>
                  </td>
                  <td style={{ ...td, color: 'var(--text-body)' }}>{r.fn}</td>
                  <td style={td}><VerdictBadge verdict={r.v} size="sm" /></td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--copper-300)' }}>{r.val}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.conf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card accent style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <Label>Top initiative by value</Label>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--ice)', fontSize: '18px', marginTop: '8px' }}>CX copilot rollout</div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper-300)', fontSize: '20px', marginTop: '4px' }}>€12.4M</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px', borderTop: '1px solid var(--line)' }}>
            <Label>Aggregate pillar health</Label>
            <PillarMeter label="Strategic Alignment" score={68} />
            <PillarMeter label="Financial Return" score={52} />
            <PillarMeter label="Change Enablement" score={49} />
            <PillarMeter label="Governance Risk" score={50} tone="fix" />
          </div>
        </Card>
      </div>
    </div>
  );
}
window.PortfolioDashboard = PortfolioDashboard;
