import { describe, expect, test } from 'vitest';
import { createBaseState } from './appState';
import { appReducer } from './appReducer';
import { selectBoardViewModel, selectHistoryCycles } from './selectors';

const buildState = () => {
  let state = createBaseState();
  state = appReducer(state, {
    type: 'CONFIG_SET_PLAYERS',
    payload: [{ id: 'p1', displayName: 'P1', name: 'P1', seatLabel: 'A', symbol: '●' }],
  });
  state = appReducer(state, {
    type: 'CONFIG_SET_COMPANIES',
    payload: [{ id: 'c1', displayName: '会社A', name: 'Co1', symbol: '○' }],
  });
  state = appReducer(state, {
    type: 'SR_UNESTABLISHED_SET',
    payload: { companyId: 'c1', isUnestablished: false },
  });
  state = appReducer(state, {
    type: 'SR_STOCK_SET',
    payload: { companyId: 'c1', target: 'player', playerId: 'p1', value: 60 },
  });
  state = appReducer(state, {
    type: 'COMPANY_PERIODIC_INCOME_SET',
    payload: { companyId: 'c1', periodicIncome: 20 },
  });
  state = appReducer(state, {
    type: 'PLAYER_PERIODIC_INCOME_SET',
    payload: { playerId: 'p1', periodicIncome: 5 },
  });
  state = appReducer(state, { type: 'SETUP_LOCK', payload: true });
  state = appReducer(state, { type: 'SR_COMPLETE' });
  state = appReducer(state, {
    type: 'OR_REVENUE_SET',
    payload: { companyId: 'c1', orNum: 1, revenue: 100 },
  });
  return state;
};

describe('selectors', () => {
  test('selectBoardViewModel は表示用 company/player モデルを返す', () => {
    const board = selectBoardViewModel(buildState());

    expect(board.players[0].periodicIncome).toBe(5);
    expect(board.companies[0].stockHoldings[0].percentage).toBe(60);
    expect(board.companies[0].periodicIncome).toBe(20);
    expect(board.companies[0].orRevenues[0].revenue).toBe(100);
    expect(board.status.mode).toBe('orRound');
  });

  test('selectHistoryCycles は進行中サイクルも履歴として返す', () => {
    const cycles = selectHistoryCycles(buildState());

    expect(cycles).toHaveLength(1);
    expect(cycles[0].isCompleted).toBe(false);
    expect(cycles[0].operatingResultsSnapshot['1'].c1.companyAmount).toBe(20);
  });

  test('selectBoardViewModel は active 会社だけをボード表示し、Merger 候補を分ける', () => {
    let state = createBaseState();
    state = appReducer(state, {
      type: 'CONFIG_SET_PLAYERS',
      payload: [{ id: 'p1', displayName: 'P1', name: 'P1', seatLabel: 'A', symbol: '●' }],
    });
    state = appReducer(state, { type: 'CONFIG_SET_MERGER_ROUND_ENABLED', payload: true });
    state = appReducer(state, {
      type: 'CONFIG_SET_COMPANIES',
      payload: [
        { id: 'm1', displayName: 'Minor', name: 'M1', symbol: '○', companyType: 'minor' },
        { id: 'maj1', displayName: 'Major', name: 'Maj1', symbol: '◇', companyType: 'major' },
      ],
    });
    state = appReducer(state, { type: 'SETUP_LOCK', payload: true });

    const board = selectBoardViewModel(state);

    expect(board.companies.map((company) => company.id)).toEqual(['m1']);
    expect(board.merger.minorCandidates.map((company) => company.id)).toEqual(['m1']);
    expect(board.merger.majorCandidates.map((company) => company.id)).toEqual(['maj1']);
  });
});
