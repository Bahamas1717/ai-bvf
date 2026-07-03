import * as React from 'react';

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  sub?: string;
  /** Recolours the big value. */
  tone?: 'accent' | 'accelerate' | 'fix' | 'stop' | 'neutral';
}

/**
 * Executive KPI tile with a serif value.
 * @startingPoint section="Core" subtitle="Board-readout KPI tile" viewport="700x180"
 */
export function KpiCard(props: KpiCardProps): JSX.Element;
