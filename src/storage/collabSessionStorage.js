const COLLAB_SESSION_PREFIX = 'collab_session_';

const isUsableGameId = (gameId) => typeof gameId === 'string' && gameId.trim().length > 0;

export const getCollabSessionKey = (gameId) => `${COLLAB_SESSION_PREFIX}${gameId}`;

export function loadCollabSession(gameId) {
  if (!isUsableGameId(gameId)) return null;

  try {
    const raw = localStorage.getItem(getCollabSessionKey(gameId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const joinCode = `${parsed?.joinCode || ''}`.trim();
    if (!joinCode) return null;

    return {
      ...parsed,
      joinCode,
    };
  } catch (_error) {
    return null;
  }
}

export function saveCollabSession(gameId, session) {
  if (!isUsableGameId(gameId)) return;

  const joinCode = `${session?.joinCode || ''}`.trim();
  if (!joinCode) return;

  const payload = {
    joinCode,
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(getCollabSessionKey(gameId), JSON.stringify(payload));
}

export function clearCollabSession(gameId) {
  if (!isUsableGameId(gameId)) return;
  localStorage.removeItem(getCollabSessionKey(gameId));
}
