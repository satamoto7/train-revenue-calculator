import { APP_STATE_SCHEMA_VERSION, normalizeAppState } from '../state/appState';

export const LEGACY_APP_STORAGE_KEY = 'trainRevenue_18xx_data';
export const APP_STORAGE_KEY_PREFIX = 'trainRevenue_18xx_game_';
export const APP_SCHEMA_VERSION = APP_STATE_SCHEMA_VERSION;

const createPayload = (state) => ({
  schemaVersion: APP_SCHEMA_VERSION,
  state: normalizeAppState(state),
  lastUpdated: new Date().toISOString(),
});

export const getGameStorageKey = (gameId) => `${APP_STORAGE_KEY_PREFIX}${gameId}`;

const isUsableGameId = (gameId) => typeof gameId === 'string' && gameId.trim().length > 0;

export function load(gameId) {
  if (!isUsableGameId(gameId)) return null;
  try {
    const raw = localStorage.getItem(getGameStorageKey(gameId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== APP_SCHEMA_VERSION) return null;
    return normalizeAppState(parsed?.state);
  } catch (_error) {
    return null;
  }
}

export function hasLegacyCache(gameId) {
  if (!isUsableGameId(gameId)) return false;
  try {
    const raw = localStorage.getItem(getGameStorageKey(gameId));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.schemaVersion != null && parsed.schemaVersion !== APP_SCHEMA_VERSION;
  } catch (_error) {
    return false;
  }
}

export function save(gameId, state) {
  if (!isUsableGameId(gameId)) return;
  const payload = createPayload(state);
  localStorage.setItem(getGameStorageKey(gameId), JSON.stringify(payload));
}

export function clear(gameId) {
  if (!isUsableGameId(gameId)) return;
  localStorage.removeItem(getGameStorageKey(gameId));
}
