/* AI BVF — Advisor Brain. diagnose_process: heaviness → intervention →
   net EUR saving. UI-kit screen. */
function AdvisorBrain() {
  const NS = window.AIBVFDesignSystem_ab2d84;
  const { Label, Card, KpiCard, Button, VerdictBadge, PillarMeter, Mirror } = NS;

  const signals = [
    { k: 'Volume', v: '42k / mo', w: 78 },
    { k: 'Labour', v: '11 FTE', w: 64 },
    { k: 'Cycle time', v: '6.2 days', w: 71 },
    { k: 'Handoffs', v: '9', w: 82 },
    { k: 'Rework', v: '18%', w: 60 },
    { k: 'Automation', v: '12%', w: 24 },
  ];

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 32px 80px' }}>
      <Label>Advisor Brain · diagnose_process</Label>
      <h1 style={{ margin: '10px 0 6px', fontSize: '30px' }}>Invoice matching &amp; exceptions</h1>
      <p style={{ color: 'var(--text-body)', maxWidth: '620px', fontSize: '15px' }}>
        Diagnose one business process from observed signals. The Brain returns heaviness, the right intervention, and a net EUR saving with a verdict.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '28px', alignItems: 'start' }}>
        <Card>
          <Label>Observed signals</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {signals.map((s) => (
              <div key={s.k} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-body)' }}>{s.k}</span>
                <div style={{ height: '6px', borderRadius: '999px', background: 'var(--fill-2)', overflow: 'hidden' }}>
                  <div style={{ width: `${s.w}%`, height: '100%', background: 'var(--copper)', borderRadius: '999px' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ice)', textAlign: 'right' }}>{s.v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '22px' }}>
            <Button variant="primary">Diagnose process</Button>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card accent elevated style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>Verdict</Label>
              <VerdictBadge verdict="Fix" size="lg" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <KpiCard label="Process heaviness" value="Heavy" tone="fix" style={{ padding: '16px 18px' }} />
              <KpiCard label="Net EUR saving" value="€1.9M" tone="accent" style={{ padding: '16px 18px' }} />
            </div>
            <div>
              <Label>Recommended intervention</Label>
              <p style={{ color: 'var(--text-body)', fontSize: '14px', marginTop: '8px', lineHeight: 1.6 }}>
                Nine handoffs and 18% rework mark this as agent-suitable orchestration, not headcount. Deploy a gen2 exception-handling agent behind a human approval gate; efficiency gain modelled at 41%.
              </p>
            </div>
          </Card>
          <Mirror quote="Automate the exceptions, not the whole desk. The saving is in the handoffs." attribution="— AI BVF Advisor Brain" />
        </div>
      </div>
    </div>
  );
}
window.AdvisorBrain = AdvisorBrain;
