import React from 'react';

/**
 * The framework's core signal. Renders Accelerate / Fix / Stop (or a custom
 * verdict) as a RAG chip. `size="lg"` gives the standalone readout treatment.
 */
export function VerdictBadge({ verdict = 'Fix', size = 'md', style, children, ...rest }) {
  const key = String(verdict).toLowerCase();
  const map = {
    accelerate: { color: 'var(--accelerate-bright)', border: 'var(--accelerate-line)', bg: 'var(--accelerate-wash)' },
    fix:        { color: 'var(--fix-bright)',        border: 'var(--fix-line)',        bg: 'var(--fix-wash)' },
    stop:       { color: 'var(--stop-bright)',       border: 'var(--stop-line)',       bg: 'var(--stop-wash)' },
  };
  const c = map[key] || map.fix;

  const sizes = {
    sm: { padding: '4px 10px', fontSize: '9px', letterSpacing: '1px', borderRadius: 'var(--radius-xs)' },
    md: { padding: '5px 12px', fontSize: '10px', letterSpacing: '1px', borderRadius: 'var(--radius-xs)' },
    lg: { padding: '9px 18px', fontSize: '13px', letterSpacing: '1.5px', borderRadius: 'var(--radius-sm)' },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        fontFamily: 'var(--font-sans)',
        fontWeight: 700,
        textTransform: 'uppercase',
        border: '1px solid',
        color: c.color,
        borderColor: c.border,
        background: c.bg,
        ...sizes[size],
        ...style,
      }}
      {...rest}
    >
      <span style={{
        width: size === 'lg' ? '8px' : '6px',
        height: size === 'lg' ? '8px' : '6px',
        borderRadius: '50%',
        background: c.color,
        boxShadow: `0 0 6px ${c.color}`,
      }} />
      {children || verdict}
    </span>
  );
}
