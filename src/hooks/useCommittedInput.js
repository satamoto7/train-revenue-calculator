import { useCallback, useEffect, useRef, useState } from 'react';

const defaultFormatCommittedValue = (value) => `${value ?? ''}`;
const identity = (value) => value;

export function useCommittedInput({
  committedValue,
  onCommit,
  formatCommittedValue = defaultFormatCommittedValue,
  parseCommittedValue = identity,
  normalizeDraft = identity,
}) {
  const [draftValue, setDraftValue] = useState(() => formatCommittedValue(committedValue));
  const [isDirty, setIsDirty] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const draftValueRef = useRef(draftValue);
  const isComposingRef = useRef(false);

  useEffect(() => {
    draftValueRef.current = draftValue;
  }, [draftValue]);

  useEffect(() => {
    if (isDirty) return;
    const nextValue = formatCommittedValue(committedValue);
    draftValueRef.current = nextValue;
    setDraftValue(nextValue);
  }, [committedValue, formatCommittedValue, isDirty]);

  const reset = useCallback(() => {
    const nextValue = formatCommittedValue(committedValue);
    draftValueRef.current = nextValue;
    setDraftValue(nextValue);
    setIsDirty(false);
    setIsComposing(false);
  }, [committedValue, formatCommittedValue]);

  const commit = useCallback(() => {
    if (isComposingRef.current) return false;
    const rawValue = draftValueRef.current;
    const parsedValue = parseCommittedValue(rawValue, committedValue);
    const nextFormattedValue = formatCommittedValue(parsedValue);

    draftValueRef.current = nextFormattedValue;
    setDraftValue(nextFormattedValue);
    setIsDirty(false);
    onCommit(parsedValue);
    return true;
  }, [committedValue, formatCommittedValue, onCommit, parseCommittedValue]);

  const onChange = useCallback(
    (event) => {
      const nextValue = normalizeDraft(event.target.value);
      draftValueRef.current = nextValue;
      setDraftValue(nextValue);
      setIsDirty(true);
    },
    [normalizeDraft]
  );

  const onBlur = useCallback(() => {
    commit();
  }, [commit]);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        commit();
        return;
      }
      if (event.key === 'Escape') {
        reset();
      }
    },
    [commit, reset]
  );

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true;
    setIsComposing(true);
    setIsDirty(true);
  }, []);

  const onCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    setIsComposing(false);
  }, []);

  return {
    value: draftValue,
    isDirty,
    isComposing,
    setDraftValue,
    commit,
    reset,
    bind: {
      value: draftValue,
      onChange,
      onBlur,
      onKeyDown,
      onCompositionStart,
      onCompositionEnd,
    },
  };
}

export default useCommittedInput;
