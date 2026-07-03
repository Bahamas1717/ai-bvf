import * as React from 'react';

export interface ScorecardCheck {
  name: string;
  verdict: 'Accelerate' | 'Fix' | 'Stop' | string;
  score: number | string;
  pass: boolean;
}

export interface ScorecardProps extends React.HTMLAttributes<HTMLDivElement> {
  command?: string;
  threshold?: string;
  checks?: ScorecardCheck[];
  footer?: string;
}

/**
 * The signature CI pre-flight gate report ("SonarQube for AI") — overall
 * PASS/FAIL plus per-initiative check rows.
 * @startingPoint section="Feedback" subtitle="CI gate scorecard — the signature visual" viewport="700x460"
 */
export function Scorecard(props: ScorecardProps): JSX.Element;
