import { APP_SCHEMA_VERSION, APP_STORAGE_KEY, load, migrate, save } from './appStorage';

describe('appStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('save は schemaVersion を付けて保存する', () => {
    save({
      players: [{ id: 'p1', name: 'P1' }],
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

  test('load は旧フォーマット(schemaVersionなし)を migrate して返す', () => {
    const legacyData = {
      players: [{ id: 'p1', name: 'legacy' }],
      companies: [],
      selectedCompanyId: null,
      numORs: 3,
    };

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(legacyData));

    const loaded = load();
    expect(loaded.players[0].name).toBe('legacy');
    expect(loaded.numORs).toBe(3);
  });

  test('migrate は不正値をデフォルトへ補正する', () => {
    const migrated = migrate({ players: null, companies: 'x', numORs: 0 });

    expect(migrated.players).toEqual([]);
    expect(migrated.companies).toEqual([]);
    expect(migrated.numORs).toBe(2);
    expect(migrated.selectedCompanyId).toBeNull();
  });
});
