import * as React from 'react';

export interface SelectOption { value: string; label: string; }

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Array<SelectOption | string>;
}

/**
 * Dropdown with copper chevron + focus ring.
 * @startingPoint section="Forms" subtitle="Labelled select" viewport="700x150"
 */
export function Select(props: SelectProps): JSX.Element;
