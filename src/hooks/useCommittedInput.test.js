import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useCommittedInput } from './useCommittedInput';

describe('useCommittedInput', () => {
  test('dirty 中は committedValue の外部変更で draft を上書きしない', () => {
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(
      ({ committedValue }) =>
        useCommittedInput({
          committedValue,
          onCommit,
        }),
      {
        initialProps: { committedValue: 'Alpha' },
      }
    );

    act(() => {
      result.current.bind.onChange({ target: { value: 'Alphabeta' } });
    });

    rerender({ committedValue: 'Remote update' });

    expect(result.current.value).toBe('Alphabeta');
  });

  test('composition 中は commit されず、終了後に commit できる', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useCommittedInput({
        committedValue: '',
        onCommit,
      })
    );

    act(() => {
      result.current.bind.onCompositionStart();
      result.current.bind.onChange({ target: { value: 'か' } });
      result.current.bind.onBlur();
    });

    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      result.current.bind.onCompositionEnd();
      result.current.bind.onBlur();
    });

    expect(onCommit).toHaveBeenCalledWith('か');
  });

  test('number parse で空文字を fallback へ戻す', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useCommittedInput({
        committedValue: 40,
        onCommit,
        formatCommittedValue: (value) => `${value}`,
        parseCommittedValue: (rawValue, previousValue) => {
          const trimmed = `${rawValue}`.trim();
          if (trimmed === '') return previousValue;
          return Number.parseInt(trimmed, 10);
        },
      })
    );

    act(() => {
      result.current.bind.onChange({ target: { value: '' } });
      result.current.bind.onBlur();
    });

    expect(onCommit).toHaveBeenCalledWith(40);
  });
});
