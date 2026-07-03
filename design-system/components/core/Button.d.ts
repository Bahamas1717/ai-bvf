import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Copper fill (one per view), ghost secondary, or copper outline. */
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Primary action control for AI BVF surfaces.
 * @startingPoint section="Core" subtitle="Copper / ghost / outline action button" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
