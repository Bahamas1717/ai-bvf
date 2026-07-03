import * as React from 'react';

export interface MirrorProps extends React.HTMLAttributes<HTMLDivElement> {
  quote?: React.ReactNode;
  attribution?: string;
  children?: React.ReactNode;
}

/**
 * Signature copper-ruled serif-italic quote block ("the mirror").
 * @startingPoint section="Core" subtitle="Copper-ruled board quote" viewport="700x180"
 */
export function Mirror(props: MirrorProps): JSX.Element;
