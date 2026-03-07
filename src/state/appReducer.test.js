import { describe, expect, test } from 'vitest';
import { appReducer } from './appReducer';
import { createBaseState } from './appState';
import { selectMaterializedCompanies } from './selectors';

const buildConfiguredState = () => {
  let state = createBaseState();
  state = appReducer(state, {
    type: 'CONFIG_SET_PLAYERS',
    payload: [
      { id: 'p1', displayName: 'P1', name: 'P1', seatLabel: 'A', color: '赤', symbol: '●' },
      { id: 'p2', displayName: 'P2', name: 'P2', seatLabel: 'B', color: '青', symbol: '▲' },
    ],
  });
  state = appReducer(state, {
    type: 'CONFIG_SET_COMPANIES',
    payload: [{ id: 'c1', displayName: '会社A', name: 'Co1', color: '赤', symbol: '○' }],
  });
  state = appReducer(state, {
    type: 'SR_UNESTABLISHED_SET',
    payload: { companyId: 'c1', isUnestablished: false },
  });
  return state;
};

describe('appReducer', () => {
  test('CONFIG_SET_PLAYERS でプレイヤー一覧を更新する', () => {
    const next = appReducer(createBaseState(), {
      type: 'CONFIG_SET_PLAYERS',
      payload: [{ id: 'p1', displayName: 'P1', name: 'P1', seatLabel: 'A' }],
    });

    expect(next.gameConfig.players).toHaveLength(1);
    expect(next.gameConfig.players[0].id).toBe('p1');
  });

  test('SETUP_LOCK=true で setupLocked を有効化し SR 開始状態にする', () => {
    const initial = buildConfiguredState();
    const next = appReducer(initial, {
      type: 'SETUP_LOCK',
      payload: true,
    });

    expect(next.gameConfig.setupLocked).toBe(true);
    expect(next.session.mode).toBe('stockRound');
    expect(next.operatingState.companyOrder).toEqual(['c1']);
  });

  test('APP_LOAD は旧 shape を新規ゲームとして初期化する', () => {
    const next = appReducer(createBaseState(), {
      type: 'APP_LOAD',
      payload: {
        players: [{ id: 'legacy-player' }],
        companies: [{ id: 'legacy-company' }],
      },
    });

    expect(next).toEqual(createBaseState());
  });

  test('CYCLE_CLOSE_AND_START_NEXT_SR で履歴へ確定結果を退避する', () => {
    let state = buildConfiguredState();
    state = appReducer(state, { type: 'SETUP_LOCK', payload: true });
    state = appReducer(state, { type: 'SR_COMPLETE' });
    state = appReducer(state, {
      type: 'SR_STOCK_SET',
      payload: { companyId: 'c1', target: 'player', playerId: 'p1', value: 60 },
    });
    state = appReducer(state, {
      type: 'OR_REVENUE_SET',
      payload: { companyId: 'c1', orNum: 1, revenue: 100 },
    });

    const next = appReducer(state, {
      type: 'CYCLE_CLOSE_AND_START_NEXT_SR',
      payload: '2026-01-01T00:00:00.000Z',
    });

    expect(next.session.currentCycleNo).toBe(2);
    expect(next.history).toHaveLength(1);
    expect(next.session.mode).toBe('stockRound');
    expect(next.history[0].operatingResultsSnapshot['1'].c1.revenue).toBe(100);
  });

  test('SR_PRESIDENT_SET で会社別の社長指定だけ更新する', () => {
    const initial = buildConfiguredState();
    const next = appReducer(initial, {
      type: 'SR_PRESIDENT_SET',
      payload: {
        companyId: 'c1',
        presidentPlayerId: 'p1',
      },
    });

    expect(next.stockRoundState.companyStates.c1.presidentPlayerId).toBe('p1');
  });

  test('PLAYER_PERIODIC_INCOME_SET で対象プレイヤーの定期収入だけ更新する', () => {
    const initial = buildConfiguredState();
    const next = appReducer(initial, {
      type: 'PLAYER_PERIODIC_INCOME_SET',
      payload: {
        playerId: 'p1',
        periodicIncome: 50,
      },
    });

    expect(next.stockRoundState.playerPeriodicIncomes.p1).toBe(50);
    expect(next.stockRoundState.playerPeriodicIncomes.p2).toBe(0);
  });

  test('COMPANY_PERIODIC_INCOME_SET で既存の OR 結果も再計算する', () => {
    let state = buildConfiguredState();
    state = appReducer(state, {
      type: 'SR_STOCK_SET',
      payload: { companyId: 'c1', target: 'player', playerId: 'p1', value: 60 },
    });
    state = appReducer(state, {
      type: 'OR_REVENUE_SET',
      payload: { companyId: 'c1', orNum: 1, revenue: 100 },
    });

    const next = appReducer(state, {
      type: 'COMPANY_PERIODIC_INCOME_SET',
      payload: {
        companyId: 'c1',
        periodicIncome: 40,
      },
    });

    expect(next.stockRoundState.companyStates.c1.periodicIncome).toBe(40);
    expect(next.operatingResults['1']['1'].c1.companyAmount).toBe(40);
  });

  test('BANK_POOL_DIVIDEND_RECIPIENT_SET は無効値を market に正規化する', () => {
    const next = appReducer(createBaseState(), {
      type: 'BANK_POOL_DIVIDEND_RECIPIENT_SET',
      payload: 'invalid',
    });

    expect(next.gameConfig.bankPoolDividendRecipient).toBe('market');
  });

  test('setupLocked 後は BANK_POOL_DIVIDEND_RECIPIENT_SET を無視する', () => {
    const locked = {
      ...createBaseState(),
      gameConfig: {
        ...createBaseState().gameConfig,
        setupLocked: true,
        bankPoolDividendRecipient: 'market',
      },
    };

    const next = appReducer(locked, {
      type: 'BANK_POOL_DIVIDEND_RECIPIENT_SET',
      payload: 'company',
    });

    expect(next).toBe(locked);
  });

  test('OR_DIVIDEND_MODE_SET で対象ORの配当種別と確定結果を更新する', () => {
    let state = buildConfiguredState();
    state = appReducer(state, {
      type: 'SR_STOCK_SET',
      payload: { companyId: 'c1', target: 'player', playerId: 'p1', value: 60 },
    });
    state = appReducer(state, {
      type: 'OR_REVENUE_SET',
      payload: { companyId: 'c1', orNum: 2, revenue: 100 },
    });

    const next = appReducer(state, {
      type: 'OR_DIVIDEND_MODE_SET',
      payload: {
        companyId: 'c1',
        orNum: 2,
        mode: 'withhold',
      },
    });

    const materialized = selectMaterializedCompanies(next);
    expect(materialized[0].orDividendModes).toEqual([
      { orNum: 1, mode: 'full' },
      { orNum: 2, mode: 'withhold' },
    ]);
    expect(next.operatingResults['1']['2'].c1.retainedRevenue).toBe(100);
  });
});
