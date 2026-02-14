export const APP_STORAGE_KEY = 'trainRevenue_18xx_data';
export const APP_SCHEMA_VERSION = 1;

const DEFAULT_STATE = {
  players: [],
  companies: [],
  selectedCompanyId: null,
  numORs: 2,
};

export function migrate(saved) {
  if (!saved || typeof saved !== 'object') {
    return { ...DEFAULT_STATE };
  }

  const next = {
    ...DEFAULT_STATE,
    players: Array.isArray(saved.players) ? saved.players : [],
    companies: Array.isArray(saved.companies) ? saved.companies : [],
    selectedCompanyId: saved.selectedCompanyId ?? null,
    numORs: Number.isInteger(saved.numORs) && saved.numORs > 0 ? saved.numORs : 2,
  };

  return next;
}

export function load() {
  const raw = localStorage.getItem(APP_STORAGE_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw);

  // schemaVersion がない旧形式も migrate() で吸収する。
  return migrate(parsed);
}

export function save(state) {
  const payload = {
    schemaVersion: APP_SCHEMA_VERSION,
    players: state.players || [],
    companies: state.companies || [],
    selectedCompanyId: state.selectedCompanyId ?? null,
    numORs: state.numORs || 2,
    lastUpdated: new Date().toISOString(),
  };

  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(payload));
}
