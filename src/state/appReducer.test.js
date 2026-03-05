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

  test('SR_PRESIDENT_SET で対象会社の社長指定だけ更新する', () => {
    const initial = {
      ...createBaseState(),
      companies: [
        {
          id: 'c1',
          name: 'Co1',
          displayName: '',
          stockHoldings: [],
          trains: [],
          presidentPlayerId: null,
        },
        {
          id: 'c2',
          name: 'Co2',
          displayName: '',
          stockHoldings: [],
          trains: [],
          presidentPlayerId: 'p9',
        },
      ],
    };

    const next = appReducer(initial, {
      type: 'SR_PRESIDENT_SET',
      payload: {
        companyId: 'c1',
        presidentPlayerId: 'p1',
      },
    });

    expect(next.companies[0].presidentPlayerId).toBe('p1');
    expect(next.companies[1].presidentPlayerId).toBe('p9');
  });

  test('PLAYER_PERIODIC_INCOME_SET で対象プレイヤーの定期収入だけ更新する', () => {
    const initial = {
      ...createBaseState(),
      players: [
        { id: 'p1', displayName: 'P1', name: 'P1', seatLabel: 'A', periodicIncome: 0 },
        { id: 'p2', displayName: 'P2', name: 'P2', seatLabel: 'B', periodicIncome: 20 },
      ],
    };

    const next = appReducer(initial, {
      type: 'PLAYER_PERIODIC_INCOME_SET',
      payload: {
        playerId: 'p1',
        periodicIncome: 50,
      },
    });

    expect(next.players[0].periodicIncome).toBe(50);
    expect(next.players[1].periodicIncome).toBe(20);
  });

  test('COMPANY_PERIODIC_INCOME_SET で対象会社の定期収入だけ更新する', () => {
    const initial = {
      ...createBaseState(),
      companies: [
        {
          id: 'c1',
          name: 'Co1',
          displayName: '',
          stockHoldings: [],
          trains: [],
          periodicIncome: 0,
        },
        {
          id: 'c2',
          name: 'Co2',
          displayName: '',
          stockHoldings: [],
          trains: [],
          periodicIncome: 30,
        },
      ],
    };

    const next = appReducer(initial, {
      type: 'COMPANY_PERIODIC_INCOME_SET',
      payload: {
        companyId: 'c1',
        periodicIncome: 40,
      },
    });

    expect(next.companies[0].periodicIncome).toBe(40);
    expect(next.companies[1].periodicIncome).toBe(30);
  });

  test('BANK_POOL_DIVIDEND_RECIPIENT_SET は無効値を market に正規化する', () => {
    const initial = createBaseState();

    const next = appReducer(initial, {
      type: 'BANK_POOL_DIVIDEND_RECIPIENT_SET',
      payload: 'invalid',
    });

    expect(next.flow.bankPoolDividendRecipient).toBe('market');
  });

  test('SETUP_LOCK=true の後は BANK_POOL_DIVIDEND_RECIPIENT_SET を無視する', () => {
    const locked = {
      ...createBaseState(),
      flow: {
        ...createBaseState().flow,
        setupLocked: true,
        bankPoolDividendRecipient: 'market',
      },
    };

    const next = appReducer(locked, {
      type: 'BANK_POOL_DIVIDEND_RECIPIENT_SET',
      payload: 'company',
    });

    expect(next).toBe(locked);
    expect(next.flow.bankPoolDividendRecipient).toBe('market');
  });

  test('OR_DIVIDEND_MODE_SET で対象ORの配当種別だけ更新する', () => {
    const initial = {
      ...createBaseState(),
      flow: {
        ...createBaseState().flow,
        numORs: 2,
      },
      companies: [
        {
          id: 'c1',
          name: 'Co1',
          displayName: '',
          stockHoldings: [],
          trains: [],
          orDividendModes: [
            { orNum: 1, mode: 'full' },
            { orNum: 2, mode: 'full' },
          ],
        },
      ],
    };

    const next = appReducer(initial, {
      type: 'OR_DIVIDEND_MODE_SET',
      payload: {
        companyId: 'c1',
        orNum: 2,
        mode: 'withhold',
      },
    });

    expect(next.companies[0].orDividendModes).toEqual([
      { orNum: 1, mode: 'full' },
      { orNum: 2, mode: 'withhold' },
    ]);
  });
});
