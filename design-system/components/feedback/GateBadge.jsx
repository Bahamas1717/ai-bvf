import React from 'react';

/**
 * GateBadge — the PASS / FAIL stamp emitted by the CI pre-flight gate.
 * Bold, monospace, verdict-coloured. The signature "gate result" mark.
 */
export function GateBadge({ status = 'pass', size = 'md', style, ...rest }) {
  const pass = String(status).toLowerCase() === 'pass';
  const c = pass
    ? { fg: 'var(--accelerate-bright)', line: 'var(--accelerate-line)', bg: 'var(--accelerate-wash)' }
    : { fg: 'var(--stop-bright)', line: 'var(--stop-line)', bg: 'var(--stop-wash)' };
  const sizes = {
    sm: { padding: '4px 10px', fontSize: '11px', gap: '6px', dot: '7px' },
    md: { padding: '7px 16px', fontSize: '14px', gap: '9px', dot: '9px' },
    lg: { padding: '11px 22px', fontSize: '18px', gap: '11px', dot: '11px' },
  };
  const s = sizes[size] || sizes.md;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: s.gap,
        fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '1.5px',
        textTransform: 'uppercase', color: c.fg, background: c.bg,
        border: `1px solid ${c.line}`, borderRadius: 'var(--radius-sm)',
        padding: s.padding, fontSize: s.fontSize,
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: s.dot, height: s.dot, borderRadius: '2px', background: c.fg, boxShadow: `0 0 8px ${c.fg}` }} />
      {pass ? 'PASS' : 'FAIL'}
    </span>
  );
}
