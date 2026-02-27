import {
  APP_SCHEMA_VERSION,
  LEGACY_APP_STORAGE_KEY,
  clear,
  getGameStorageKey,
  load,
  save,
} from './appStorage';

describe('appStorage (collab cache)', () => {
  const gameId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    localStorage.clear();
  });

  test('save/load は gameId 単位で state を保存・取得する', () => {
    const state = {
      players: [{ id: 'p1', name: 'Player A', displayName: 'Player A' }],
      companies: [],
      flow: { step: 'setup', setupLocked: false, hasIpoShares: true, numORs: 2 },
      activeCycle: {
        cycleNo: 1,
        companyOrder: [],
        currentOR: 1,
        completedCompanyIdsByOR: { 1: [], 2: [] },
        selectedCompanyId: null,
      },
      cycleHistory: [],
      summarySelectedCycleNo: null,
      srValidation: {},
    };

    save(gameId, state);
    const loaded = load(gameId);

    expect(loaded.players).toHaveLength(1);
    expect(loaded.flow.step).toBe('setup');
  });

  test('schemaVersion 不一致は null を返す', () => {
    localStorage.setItem(
      getGameStorageKey(gameId),
      JSON.stringify({
        schemaVersion: APP_SCHEMA_VERSION - 1,
        state: { players: [{ id: 'legacy' }] },
      })
    );

    expect(load(gameId)).toBeNull();
  });

  test('legacy key は読み込まない', () => {
    localStorage.setItem(
      LEGACY_APP_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 4,
        players: [{ id: 'legacy-player' }],
      })
    );

    expect(load(gameId)).toBeNull();
  });

  test('clear は対象ゲームキャッシュを削除する', () => {
    save(gameId, {
      players: [],
      companies: [],
      flow: { step: 'setup', setupLocked: false, hasIpoShares: true, numORs: 2 },
      activeCycle: {
        cycleNo: 1,
        companyOrder: [],
        currentOR: 1,
        completedCompanyIdsByOR: { 1: [], 2: [] },
        selectedCompanyId: null,
      },
      cycleHistory: [],
      summarySelectedCycleNo: null,
      srValidation: {},
    });

    clear(gameId);
    expect(load(gameId)).toBeNull();
  });
});
