import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

/**
 * Text field with copper focus ring and uppercase label.
 * @startingPoint section="Forms" subtitle="Labelled text input" viewport="700x150"
 */
export function Input(props: InputProps): JSX.Element;
