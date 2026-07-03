import React from 'react';

/**
 * Surface container on the navy canvas. `elevated` adds shadow; `accent` adds
 * a copper left rule (the "mirror"/callout treatment).
 */
export function Card({ elevated = false, accent = false, padding, style, children, ...rest }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-card)',
        borderRadius: accent ? '0 var(--radius-lg) var(--radius-lg) 0' : 'var(--radius-lg)',
        borderLeft: accent ? '3px solid var(--copper)' : undefined,
        padding: padding || '26px 30px',
        boxShadow: elevated ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
