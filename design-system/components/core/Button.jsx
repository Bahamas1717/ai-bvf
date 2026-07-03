import React from 'react';

/**
 * AI BVF primary action button. Copper fill for the one primary action per view;
 * ghost for secondary. Uppercase, wide-tracked, restrained radius.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  onClick,
  style,
  children,
  ...rest
}) {
  const base = {
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    letterSpacing: '1.4px',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    transition: 'background var(--dur) var(--ease), box-shadow var(--dur) var(--ease), color var(--dur) var(--ease), transform var(--dur-fast) var(--ease)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.5 : 1,
  };

  const sizes = {
    sm: { padding: '8px 18px', fontSize: '11px' },
    md: { padding: '12px 24px', fontSize: '12px' },
    lg: { padding: '15px 34px', fontSize: '13px' },
  };

  const variants = {
    primary: {
      background: 'var(--copper)',
      color: 'var(--on-accent)',
      boxShadow: 'var(--shadow-accent)',
    },
    ghost: {
      background: 'var(--fill-1)',
      borderColor: 'var(--line-strong)',
      color: 'var(--text-body)',
    },
    outline: {
      background: 'transparent',
      borderColor: 'var(--copper-line)',
      color: 'var(--copper-300)',
    },
  };

  const [hover, setHover] = React.useState(false);
  const hoverStyle = !disabled && hover ? {
    primary: { background: 'var(--copper-300)', boxShadow: '0 6px 22px rgba(184,115,51,0.30)' },
    ghost:   { borderColor: 'var(--copper-line)', color: 'var(--copper-300)', background: 'var(--fill-2)' },
    outline: { background: 'var(--copper-wash)', color: 'var(--copper-200)' },
  }[variant] : {};

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...sizes[size], ...variants[variant], ...hoverStyle, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
