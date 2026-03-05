import { describe, expect, test } from 'vitest';
import { parsePercent } from './appState';

describe('appState.parsePercent', () => {
  test('空文字と不正値は 0 として扱う', () => {
    expect(parsePercent('')).toBe(0);
    expect(parsePercent('abc')).toBe(0);
    expect(parsePercent(undefined)).toBe(0);
  });

  test('負数は 0 に clamp する', () => {
    expect(parsePercent(-10)).toBe(0);
    expect(parsePercent('-1')).toBe(0);
  });

  test('100超過は 100 に clamp する', () => {
    expect(parsePercent(120)).toBe(100);
    expect(parsePercent('999')).toBe(100);
  });

  test('整数入力はそのまま返す', () => {
    expect(parsePercent(0)).toBe(0);
    expect(parsePercent(55)).toBe(55);
    expect(parsePercent('70')).toBe(70);
  });
});
