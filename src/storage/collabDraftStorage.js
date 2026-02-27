import { normalizeAppState } from '../state/appState';

const UNSYNCED_DRAFT_PREFIX = 'unsynced_draft_';

const isUsableGameId = (gameId) => typeof gameId === 'string' && gameId.trim().length > 0;

export const getUnsyncedDraftKey = (gameId) => `${UNSYNCED_DRAFT_PREFIX}${gameId}`;

export function loadUnsyncedDraft(gameId) {
  if (!isUsableGameId(gameId)) return null;
  try {
    const raw = localStorage.getItem(getUnsyncedDraftKey(gameId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.state) return null;
    return {
      ...parsed,
      state: normalizeAppState(parsed.state),
    };
  } catch (_error) {
    return null;
  }
}

export function saveUnsyncedDraft(gameId, state, reason = '') {
  if (!isUsableGameId(gameId)) return;
  const payload = {
    state: normalizeAppState(state),
    reason,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(getUnsyncedDraftKey(gameId), JSON.stringify(payload));
}

export function clearUnsyncedDraft(gameId) {
  if (!isUsableGameId(gameId)) return;
  localStorage.removeItem(getUnsyncedDraftKey(gameId));
}

export function hasUnsyncedDraft(gameId) {
  if (!isUsableGameId(gameId)) return false;
  return Boolean(localStorage.getItem(getUnsyncedDraftKey(gameId)));
}
