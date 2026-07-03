import React from 'react';

/**
 * Select on the navy canvas. Options passed as an array of {value,label} or
 * strings. Copper focus ring, custom copper chevron.
 */
export function Select({ label, options = [], id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const selId = id || (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      {label && (
        <label htmlFor={selId} style={{
          display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '1.4px',
          textTransform: 'uppercase', color: 'var(--copper-300)', marginBottom: '7px',
        }}>{label}</label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          id={selId}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: '100%',
            appearance: 'none',
            WebkitAppearance: 'none',
            background: focus ? 'var(--fill-3)' : 'var(--fill-2)',
            border: `1px solid ${focus ? 'var(--border-focus)' : 'var(--line-strong)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 38px 12px 14px',
            color: 'var(--ice)',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            cursor: 'pointer',
            boxShadow: focus ? 'var(--ring-accent)' : 'none',
            transition: 'all var(--dur) var(--ease)',
            ...style,
          }}
          {...rest}
        >
          {norm.map((o) => (
            <option key={o.value} value={o.value} style={{ background: 'var(--navy-800)', color: '#fff' }}>
              {o.label}
            </option>
          ))}
        </select>
        <span style={{
          position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: 'var(--copper-300)', fontSize: '11px',
        }}>▾</span>
      </div>
    </div>
  );
}
