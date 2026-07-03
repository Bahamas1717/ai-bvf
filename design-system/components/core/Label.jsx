import React from 'react';

/**
 * The copper micro-label / eyebrow used above headings across every surface.
 */
export function Label({ children, style, ...rest }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-label)',
        letterSpacing: 'var(--ls-label)',
        textTransform: 'uppercase',
        fontWeight: 600,
        color: 'var(--copper-300)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
