import { APP_SCHEMA_VERSION, APP_STORAGE_KEY, load, migrate, save } from './appStorage';

describe('appStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('save は schemaVersion を付けて保存する', () => {
    save({
      players: [{ id: 'p1', displayName: 'Player A', seatLabel: 'A' }],
      companies: [],
      selectedCompanyId: null,
      numORs: 2,
    });

    const raw = localStorage.getItem(APP_STORAGE_KEY);
    const stored = JSON.parse(raw);

    expect(stored.schemaVersion).toBe(APP_SCHEMA_VERSION);
    expect(stored.players).toHaveLength(1);
    expect(typeof stored.lastUpdated).toBe('string');
  });

  test('load は schemaVersion 不一致データを無視して null を返す', () => {
    const legacyData = {
      players: [{ id: 'p1', name: 'legacy' }],
      companies: [{ id: 'c1', name: '赤会社' }],
      selectedCompanyId: null,
      numORs: 3,
    };

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(legacyData));

    const loaded = load();
    expect(loaded).toBeNull();
  });

  test('migrate は不正値をデフォルトへ補正する', () => {
    const migrated = migrate({ players: null, companies: 'x', numORs: 0 });

    expect(migrated.players).toEqual([]);
    expect(migrated.companies).toEqual([]);
    expect(migrated.numORs).toBe(2);
    expect(migrated.selectedCompanyId).toBeNull();
  });
});
