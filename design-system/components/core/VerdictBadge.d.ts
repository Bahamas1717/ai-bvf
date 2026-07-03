import * as React from 'react';

export interface VerdictBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The scoring outcome. */
  verdict?: 'Accelerate' | 'Fix' | 'Stop' | string;
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

/**
 * RAG verdict chip — Accelerate (green) / Fix (amber) / Stop (red).
 * @startingPoint section="Core" subtitle="Accelerate / Fix / Stop RAG chip" viewport="700x150"
 */
export function VerdictBadge(props: VerdictBadgeProps): JSX.Element;
