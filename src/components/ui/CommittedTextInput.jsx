import React from 'react';
import Input from './Input';
import { useCommittedInput } from '../../hooks/useCommittedInput';

const CommittedTextInput = ({
  value,
  onCommit,
  onChange,
  normalizeDraft,
  onBlur,
  onKeyDown,
  onCompositionEnd,
  ...props
}) => {
  const committed = useCommittedInput({
    committedValue: value ?? '',
    onCommit,
    normalizeDraft,
    parseCommittedValue: (rawValue) => `${rawValue ?? ''}`,
    formatCommittedValue: (nextValue) => `${nextValue ?? ''}`,
  });

  return (
    <Input
      {...props}
      {...committed.bind}
      onChange={(event) => {
        committed.bind.onChange(event);
        onChange?.(event);
      }}
      onBlur={(event) => {
        committed.bind.onBlur(event);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        committed.bind.onKeyDown(event);
        onKeyDown?.(event);
      }}
      onCompositionEnd={(event) => {
        committed.bind.onCompositionEnd(event);
        onCompositionEnd?.(event);
      }}
    />
  );
};

export default CommittedTextInput;
