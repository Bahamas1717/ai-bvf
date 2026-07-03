import React from 'react';

/**
 * Four-pillar score meter (0–100). Fill colour follows the value against the
 * framework thresholds unless `tone` is forced.
 */
export function PillarMeter({ label, score = 0, threshold, tone, style, ...rest }) {
  const v = Math.max(0, Math.min(100, Number(score) || 0));
  const auto = v >= 60 ? 'accelerate' : v >= 40 ? 'fix' : 'stop';
  const t = tone || auto;
  const colors = {
    accelerate: 'var(--accelerate)',
    fix: 'var(--fix)',
    stop: 'var(--stop)',
    accent: 'var(--copper)',
  };
  const c = colors[t] || colors.accent;

  return (
    <div style={{ fontFamily: 'var(--font-sans)', ...style }} {...rest}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-body)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: c }}>{v}</span>
      </div>
      <div style={{ position: 'relative', height: '7px', borderRadius: '999px', background: 'var(--fill-2)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${v}%`, background: c, borderRadius: '999px', transition: 'width var(--dur-slow) var(--ease)' }} />
        {typeof threshold === 'number' && (
          <div style={{ position: 'absolute', top: '-2px', bottom: '-2px', left: `${threshold}%`, width: '1.5px', background: 'var(--line-strong)' }} />
        )}
      </div>
    </div>
  );
}
