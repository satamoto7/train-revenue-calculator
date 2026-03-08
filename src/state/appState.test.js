import { describe, expect, test } from 'vitest';
import {
  buildOperatingResultRecord,
  createBaseState,
  normalizeAppState,
  parsePercent,
} from './appState';

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

describe('appState normalization', () => {
  test('旧 shape は初期 state にフォールバックする', () => {
    expect(normalizeAppState({ players: [{ id: 'legacy' }] })).toEqual(createBaseState());
  });

  test('createBaseState は mergerRound 関連既定値を含む', () => {
    const state = createBaseState();

    expect(state.gameConfig.mergerRoundEnabled).toBe(false);
    expect(state.session.greenTrainTriggered).toBe(false);
    expect(state.session.mode).toBe('stockRound');
  });

  test('配分結果レコードを現在の株式設定から構築できる', () => {
    const record = buildOperatingResultRecord({
      cycleNo: 1,
      orNum: 1,
      companyId: 'c1',
      revenue: 100,
      dividendMode: 'half',
      gameConfig: {
        players: [
          { id: 'p1', displayName: 'P1', name: 'P1' },
          { id: 'p2', displayName: 'P2', name: 'P2' },
        ],
        companies: [{ id: 'c1', displayName: '会社A', name: 'Co1' }],
        hasIpoShares: true,
        bankPoolDividendRecipient: 'market',
      },
      stockRoundState: {
        companyStates: {
          c1: {
            stockHoldings: [{ playerId: 'p1', percentage: 60 }],
            treasuryStockPercentage: 20,
            bankPoolPercentage: 20,
            periodicIncome: 10,
          },
        },
      },
    });

    expect(record.dividendMode).toBe('half');
    expect(record.distributableRevenue).toBe(50);
    expect(record.playerPayouts[0]).toEqual({
      playerId: 'p1',
      percentage: 60,
      amount: 30,
    });
    expect(record.companyAmount).toBe(70);
    expect(record.marketAmount).toBe(10);
  });
});
