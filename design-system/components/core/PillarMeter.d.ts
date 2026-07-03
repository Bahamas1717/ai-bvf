import * as React from 'react';

export interface PillarMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pillar name, e.g. "Strategic Alignment". */
  label: string;
  /** Score 0–100. */
  score?: number;
  /** Optional threshold marker position (0–100). */
  threshold?: number;
  /** Force fill colour; defaults to RAG-by-value. */
  tone?: 'accelerate' | 'fix' | 'stop' | 'accent';
}

/**
 * Four-pillar 0–100 score bar with RAG-by-value fill.
 * @startingPoint section="Core" subtitle="Pillar score meter (0–100)" viewport="700x150"
 */
export function PillarMeter(props: PillarMeterProps): JSX.Element;
