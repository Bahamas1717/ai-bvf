import * as React from 'react';

export interface GateBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** CI gate result. */
  status?: 'pass' | 'fail';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PASS / FAIL stamp emitted by the CI pre-flight gate.
 * @startingPoint section="Feedback" subtitle="CI PASS / FAIL gate stamp" viewport="700x150"
 */
export function GateBadge(props: GateBadgeProps): JSX.Element;
