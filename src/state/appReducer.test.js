import { describe, expect, test } from 'vitest';
import { appReducer } from './appReducer';
import { createBaseState } from './appState';

describe('appReducer', () => {
  test('PLAYER_SET_ALL でプレイヤー一覧を更新する', () => {
    const initial = createBaseState();
    const next = appReducer(initial, {
      type: 'PLAYER_SET_ALL',
      payload: [{ id: 'p1', displayName: 'P1', name: 'P1', seatLabel: 'A' }],
    });

    expect(next.players).toHaveLength(1);
    expect(next.players[0].id).toBe('p1');
  });

  test('SETUP_LOCK=true で stockRound へ遷移する', () => {
    const initial = {
      ...createBaseState(),
      players: [{ id: 'p1', displayName: 'P1', name: 'P1', seatLabel: 'A' }],
      companies: [{ id: 'c1', name: 'Co1', displayName: '', stockHoldings: [], trains: [] }],
    };
    const next = appReducer(initial, {
      type: 'SETUP_LOCK',
      payload: true,
    });

    expect(next.flow.setupLocked).toBe(true);
    expect(next.flow.step).toBe('stockRound');
    expect(next.activeCycle.companyOrder).toEqual(['c1']);
  });

  test('APP_LOAD で不正値を正規化する', () => {
    const next = appReducer(createBaseState(), {
      type: 'APP_LOAD',
      payload: {
        players: [{ id: 'p1', displayName: 'P1' }],
        companies: [{ id: 'c1', name: 'Co1' }],
        flow: { step: 'unknown-step', numORs: 99, hasIpoShares: true },
      },
    });

    expect(next.flow.step).toBe('setup');
    expect(next.flow.numORs).toBe(5);
  });

  test('CYCLE_CLOSE_AND_START_NEXT_SR でサイクル履歴を追加する', () => {
    const initial = {
      ...createBaseState(),
      players: [{ id: 'p1', displayName: 'P1', name: 'P1', seatLabel: 'A' }],
      companies: [
        {
          id: 'c1',
          name: 'Co1',
          displayName: '',
          trains: [],
          stockHoldings: [],
          orRevenues: [
            { orNum: 1, revenue: 100 },
            { orNum: 2, revenue: 200 },
          ],
          isUnestablished: false,
          treasuryStockPercentage: 0,
          bankPoolPercentage: 0,
        },
      ],
      flow: { step: 'orRound', setupLocked: true, hasIpoShares: true, numORs: 2 },
      activeCycle: {
        cycleNo: 1,
        companyOrder: ['c1'],
        currentOR: 2,
        completedCompanyIdsByOR: { 1: ['c1'], 2: ['c1'] },
        selectedCompanyId: 'c1',
      },
    };

    const next = appReducer(initial, {
      type: 'CYCLE_CLOSE_AND_START_NEXT_SR',
      payload: '2026-01-01T00:00:00.000Z',
    });

    expect(next.activeCycle.cycleNo).toBe(2);
    expect(next.cycleHistory).toHaveLength(1);
    expect(next.flow.step).toBe('stockRound');
  });
});
