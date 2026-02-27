import { normalizeAppState } from '../state/appState';

export const LEGACY_APP_STORAGE_KEY = 'trainRevenue_18xx_data';
export const APP_STORAGE_KEY_PREFIX = 'trainRevenue_18xx_game_';
export const APP_SCHEMA_VERSION = 5;

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

export function save(gameId, state) {
  if (!isUsableGameId(gameId)) return;
  const payload = createPayload(state);
  localStorage.setItem(getGameStorageKey(gameId), JSON.stringify(payload));
}

export function clear(gameId) {
  if (!isUsableGameId(gameId)) return;
  localStorage.removeItem(getGameStorageKey(gameId));
}
