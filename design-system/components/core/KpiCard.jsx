import React from 'react';

/**
 * Executive KPI tile — big Playfair value, uppercase label, optional sub note.
 * `tone` recolours the value to a RAG signal.
 */
export function KpiCard({ label, value, sub, tone = 'accent', style, ...rest }) {
  const tones = {
    accent:     'var(--copper-300)',
    accelerate: 'var(--accelerate-bright)',
    fix:        'var(--fix-bright)',
    stop:       'var(--stop-bright)',
    neutral:    'var(--ice)',
  };
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 24px',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      {...rest}
    >
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 600,
        letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '32px',
        lineHeight: 1.05, color: tones[tone] || tones.accent, marginTop: '10px',
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-body)',
          marginTop: '8px', lineHeight: 1.5,
        }}>{sub}</div>
      )}
    </div>
  );
}
