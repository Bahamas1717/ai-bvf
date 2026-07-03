import React from 'react';
import { GateBadge } from './GateBadge.jsx';

/**
 * Scorecard — the CI pre-flight gate output ("SonarQube for AI"). A branded
 * aibvf-check report: overall gate result + per-initiative check rows with
 * verdict, score, and pass/fail against the configured threshold.
 *
 * checks: [{ name, verdict: 'Accelerate'|'Fix'|'Stop', score, pass }]
 */
export function Scorecard({
  command = 'aibvf-check ./portfolio.bvf.json',
  threshold = 'min-verdict=Fix · max-governance-risk=60',
  checks = [],
  footer = "What you don't gate, you don't govern.",
  style,
  ...rest
}) {
  const failed = checks.filter((c) => !c.pass).length;
  const gate = failed === 0 ? 'pass' : 'fail';
  const pass = gate === 'pass';

  const vColor = (v) => ({
    accelerate: 'var(--accelerate-bright)',
    fix: 'var(--fix-bright)',
    stop: 'var(--stop-bright)',
  }[String(v).toLowerCase()] || 'var(--text-body)');

  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        background: 'var(--surface-panel)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        ...style,
      }}
      {...rest}
    >
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 16px', borderBottom: '1px solid var(--line)',
        background: 'var(--fill-1)',
      }}>
        <span style={{ display: 'flex', gap: '6px' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: 'var(--stop-bright)', opacity: 0.5 }} />
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: 'var(--fix-bright)', opacity: 0.5 }} />
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: 'var(--accelerate-bright)', opacity: 0.5 }} />
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>ci · pre-flight gate</span>
      </div>

      {/* Command + gate result */}
      <div style={{ padding: '18px 20px 14px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text)' }}>
          <span style={{ color: 'var(--copper-300)' }}>$</span> {command}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Quality gate</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>{threshold}</div>
          </div>
          <GateBadge status={gate} size="lg" />
        </div>
      </div>

      {/* Check rows */}
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {checks.map((c, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '20px 1fr auto auto', gap: '12px', alignItems: 'center',
            padding: '12px 20px', borderBottom: i < checks.length - 1 ? '1px solid var(--line-soft)' : 'none',
            background: c.pass ? 'transparent' : 'var(--stop-wash)',
          }}>
            <span style={{ color: c.pass ? 'var(--accelerate-bright)' : 'var(--stop-bright)', fontWeight: 700 }}>{c.pass ? '✓' : '✕'}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--ice)', fontWeight: 500 }}>{c.name}</span>
            <span style={{ fontSize: '13px', color: vColor(c.verdict), letterSpacing: '0.5px', textTransform: 'uppercase' }}>{c.verdict}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-body)', minWidth: '34px', textAlign: 'right' }}>{c.score}</span>
          </div>
        ))}
      </div>

      {/* Footer line */}
      <div style={{
        padding: '14px 20px', borderTop: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
        background: 'var(--fill-1)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'normal', fontSize: '14px', color: 'var(--copper-300)' }}>{footer}</span>
        <span style={{ fontSize: '12px', color: pass ? 'var(--accelerate-bright)' : 'var(--stop-bright)' }}>
          {pass ? 'exit 0 · build continues' : `exit 1 · ${failed} initiative${failed > 1 ? 's' : ''} blocked`}
        </span>
      </div>
    </div>
  );
}
