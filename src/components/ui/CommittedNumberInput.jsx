import React from 'react';
import Input from './Input';
import { useCommittedInput } from '../../hooks/useCommittedInput';

const defaultClamp = (value) => value;
const asNumberOrUndefined = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const CommittedNumberInput = ({
  value,
  onCommit,
  onChange,
  emptyValue,
  min,
  max,
  clamp = defaultClamp,
  parseCommittedValue,
  shouldCommit,
  formatCommittedValue = (nextValue) => `${nextValue ?? ''}`,
  normalizeDraft,
  onBlur,
  onKeyDown,
  ...props
}) => {
  const numericMin = asNumberOrUndefined(min);
  const numericMax = asNumberOrUndefined(max);
  const committed = useCommittedInput({
    committedValue: value ?? emptyValue ?? '',
    onCommit,
    normalizeDraft,
    formatCommittedValue,
    shouldCommit,
    parseCommittedValue: (rawValue, previousValue) => {
      if (parseCommittedValue) {
        return parseCommittedValue(rawValue, previousValue);
      }

      const trimmed = `${rawValue ?? ''}`.trim();
      if (trimmed === '') {
        return emptyValue ?? previousValue ?? 0;
      }

      const parsed = Number.parseInt(trimmed, 10);
      if (Number.isNaN(parsed)) {
        return previousValue ?? emptyValue ?? 0;
      }

      let nextValue = parsed;
      if (typeof numericMin === 'number') {
        nextValue = Math.max(numericMin, nextValue);
      }
      if (typeof numericMax === 'number') {
        nextValue = Math.min(numericMax, nextValue);
      }
      return clamp(nextValue);
    },
  });

  return (
    <Input
      {...props}
      type="number"
      min={min}
      max={max}
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
    />
  );
};

export default CommittedNumberInput;
