import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a stronger drop shadow. */
  elevated?: boolean;
  /** Copper left rule + squared left corners (callout treatment). */
  accent?: boolean;
  padding?: string;
  children?: React.ReactNode;
}

/**
 * Panel/surface container on the navy canvas.
 * @startingPoint section="Core" subtitle="Navy surface card, optional copper rule" viewport="700x220"
 */
export function Card(props: CardProps): JSX.Element;
