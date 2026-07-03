import * as React from 'react';

export interface LabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

/** Copper uppercase eyebrow/label placed above headings. */
export function Label(props: LabelProps): JSX.Element;
