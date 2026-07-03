/* AI BVF — Score workspace. Enter the four pillars, get a live verdict.
   Recreates the score_initiative surface. UI-kit screen. */
function ScoreWorkspace() {
  const NS = window.AIBVFDesignSystem_ab2d84;
  const { Label, Card, Button, Select, Input, PillarMeter, VerdictBadge, KpiCard, Mirror } = NS;
  const { useState } = React;

  const [scores, setScores] = useState({ sa: 70, fr: 50, ce: 55, gr: 45 });
  const set = (k) => (e) => setScores((s) => ({ ...s, [k]: Number(e.target.value) }));

  // Deterministic framework rules
  const { sa, fr, ce, gr } = scores;
  let verdict = 'Fix';
  if (gr >= 70 || fr <= 20) verdict = 'Stop';
  else if (sa >= 60 && fr >= 60 && ce >= 60 && gr <= 40) verdict = 'Accelerate';
  const confidence = Math.round((sa + fr + ce + (100 - gr)) / 4);
  const low = (fr / 100 * 24).toFixed(1);
  const high = (fr / 100 * 84).toFixed(1);

  const pillars = [
    { k: 'sa', label: 'Strategic Alignment', v: sa },
    { k: 'fr', label: 'Financial Return', v: fr },
    { k: 'ce', label: 'Change Enablement', v: ce },
    { k: 'gr', label: 'Governance Risk', v: gr, invert: true },
  ];

  const reasons = {
    Accelerate: 'All four pillars clear the bar and governance exposure is contained. This survives a board review.',
    Fix: 'Strategic alignment is credible, but change enablement and financial return are not yet strong enough to defend an Accelerate call.',
    Stop: 'Governance exposure or financial return falls below the deterministic floor. Do not commit budget as scoped.',
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 32px 80px' }}>
      <Label>Pre-flight check · score_initiative</Label>
      <h1 style={{ margin: '10px 0 6px', fontSize: '30px' }}>Score an AI initiative</h1>
      <p style={{ color: 'var(--text-body)', maxWidth: '620px', fontSize: '15px' }}>
        Four pillars, 0–100, honest self-assessment. The engine returns a deterministic verdict with a modelled EUR range and a specific gap list.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', marginTop: '28px', alignItems: 'start' }}>
        {/* Inputs */}
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px' }}>
            <Select label="Industry" options={['retail', 'healthcare', 'financial services', 'manufacturing']} />
            <Select label="Function" options={['cx', 'operations', 'finance', 'hr']} />
            <Select label="AI tier" options={[{value:'gen2',label:'Gen 2 · Assistive'},{value:'gen3',label:'Gen 3 · Agentic'}]} />
            <Select label="Readiness" options={['traditional', 'emerging', 'optimised']} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pillars.map((p) => (
              <div key={p.k}>
                <PillarMeter label={p.label} score={p.v} tone={p.invert ? (p.v >= 70 ? 'stop' : p.v >= 40 ? 'fix' : 'accelerate') : undefined} />
                <input type="range" min="0" max="100" value={p.v} onChange={set(p.k)}
                  style={{ width: '100%', marginTop: '8px', accentColor: 'var(--copper)' }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <Button variant="primary">Score initiative</Button>
            <Button variant="ghost">Reset</Button>
          </div>
        </Card>

        {/* Readout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card accent elevated style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>Classification</Label>
              <VerdictBadge verdict={verdict} size="lg" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <KpiCard label="Net value range" value={`€${low}–${high}M`} tone="accent" style={{ padding: '16px 18px' }} />
              <KpiCard label="Decision confidence" value={confidence} tone="neutral" style={{ padding: '16px 18px' }} />
            </div>
            <div>
              <Label>Why</Label>
              <p style={{ color: 'var(--text-body)', fontSize: '14px', marginTop: '8px', lineHeight: 1.6 }}>{reasons[verdict]}</p>
            </div>
            <div style={{ paddingTop: '4px', borderTop: '1px solid var(--line)' }}>
              <Label>Applied modules</Label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {['four_pillar_base', 'readiness_capture_traditional', 'retail_cx_benchmark'].map((m) => (
                  <span key={m} style={{
                    fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--copper-300)',
                    padding: '4px 10px', background: 'var(--copper-wash-2)', border: '1px solid var(--copper-line-2)',
                    borderRadius: 'var(--radius-xs)',
                  }}>{m}</span>
                ))}
              </div>
            </div>
          </Card>
          <Mirror
            quote={verdict === 'Accelerate' ? 'Fund it, name the owner, and hold the line on governance.' : 'Raise Change Enablement by 15, name an accountable owner, fund adoption, then rerun.'}
            attribution="— recommend_improvements"
          />
        </div>
      </div>
    </div>
  );
}
window.ScoreWorkspace = ScoreWorkspace;
