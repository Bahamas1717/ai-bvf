import React from 'react';

/**
 * "The Mirror" — the brand's signature copper-ruled quote block. Serif
 * (upright) body with an attribution line.
 */
export function Mirror({ quote, attribution, style, children, ...rest }) {
  return (
    <div
      style={{
        padding: '24px 28px',
        background: 'var(--copper-wash-2)',
        border: '1px solid var(--copper-line-2)',
        borderLeft: '3px solid var(--copper)',
        borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
        ...style,
      }}
      {...rest}
    >
      <blockquote style={{
        margin: 0,
        fontFamily: 'var(--font-display)',
        fontStyle: 'normal',
        fontSize: '19px',
        lineHeight: 1.6,
        color: 'var(--ice)',
      }}>
        {quote || children}
      </blockquote>
      {attribution && (
        <div style={{
          marginTop: '12px',
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          color: 'var(--text-muted)',
        }}>{attribution}</div>
      )}
    </div>
  );
}
