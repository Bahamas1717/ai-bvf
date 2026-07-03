import React from 'react';

/**
 * Text input on the navy canvas. Optional label + hint. Copper focus ring.
 */
export function Input({ label, hint, id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      {label && (
        <label htmlFor={inputId} style={{
          display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '1.4px',
          textTransform: 'uppercase', color: 'var(--copper-300)', marginBottom: '7px',
        }}>{label}</label>
      )}
      <input
        id={inputId}
        onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }}
        style={{
          width: '100%',
          background: focus ? 'var(--fill-3)' : 'var(--fill-2)',
          border: `1px solid ${focus ? 'var(--border-focus)' : 'var(--line-strong)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          color: 'var(--ice)',
          fontSize: '14px',
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          boxShadow: focus ? 'var(--ring-accent)' : 'none',
          transition: 'all var(--dur) var(--ease)',
          ...style,
        }}
        {...rest}
      />
      {hint && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{hint}</div>
      )}
    </div>
  );
}
