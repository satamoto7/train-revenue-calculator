import { APP_SCHEMA_VERSION, APP_STORAGE_KEY, load, migrate, save } from './appStorage';

describe('appStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('save は schemaVersion=4 を付けて保存する', () => {
    save({
      players: [{ id: 'p1', displayName: 'Player A', seatLabel: 'A' }],
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

    const raw = localStorage.getItem(APP_STORAGE_KEY);
    const stored = JSON.parse(raw);

    expect(stored.schemaVersion).toBe(APP_SCHEMA_VERSION);
    expect(stored.flow.step).toBe('setup');
    expect(typeof stored.lastUpdated).toBe('string');
  });

  test('load は schemaVersion 不一致データを無視して null を返す', () => {
    const legacyData = {
      schemaVersion: 3,
      players: [{ id: 'p1', name: 'legacy' }],
      companies: [{ id: 'c1', name: '赤会社' }],
      numORs: 3,
    };

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(legacyData));

    const loaded = load();
    expect(loaded).toBeNull();
  });

  test('migrate は schema4 欠損値を補完する', () => {
    const migrated = migrate({
      schemaVersion: APP_SCHEMA_VERSION,
      players: [{ id: 'p1', displayName: 'P1' }],
      companies: [{ id: 'c1', name: 'Co1' }],
      flow: { step: 'orRound', setupLocked: true, hasIpoShares: false, numORs: 2 },
      activeCycle: { cycleNo: 2, companyOrder: ['c1'], currentOR: 1 },
    });

    expect(migrated.players).toHaveLength(1);
    expect(migrated.companies).toHaveLength(1);
    expect(migrated.activeCycle.companyOrder).toEqual(['c1']);
    expect(migrated.activeCycle.completedCompanyIdsByOR[1]).toEqual([]);
    expect(migrated.flow.step).toBe('orRound');
  });

  test('migrate は isUnestablished 欠損時に株式入力から判定する', () => {
    const migrated = migrate({
      schemaVersion: APP_SCHEMA_VERSION,
      players: [{ id: 'p1', displayName: 'P1' }],
      companies: [
        {
          id: 'c1',
          name: 'Co1',
          stockHoldings: [{ playerId: 'p1', percentage: 10 }],
        },
        {
          id: 'c2',
          name: 'Co2',
          stockHoldings: [],
          treasuryStockPercentage: 0,
          bankPoolPercentage: 0,
        },
      ],
      flow: { step: 'stockRound', setupLocked: true, hasIpoShares: true, numORs: 2 },
      activeCycle: { cycleNo: 1, companyOrder: ['c1', 'c2'], currentOR: 1 },
    });

    expect(migrated.companies.find((company) => company.id === 'c1')?.isUnestablished).toBe(false);
    expect(migrated.companies.find((company) => company.id === 'c2')?.isUnestablished).toBe(true);
  });
});
