import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  createGame,
  getCurrentUser,
  joinGame,
  listGameMembers,
  loadGameState,
  saveGameState,
  signInAnonymously,
  subscribeGameMembers,
  subscribeGameState,
} from '../collab/gameRepository';
import { hasSupabaseEnv } from '../collab/supabaseClient';
import { trackPresence } from '../collab/presenceRepository';
import { appReducer } from '../state/appReducer';
import { createBaseState, normalizeAppState } from '../state/appState';
import { load as loadLocalCache, save as saveLocalCache } from '../storage/appStorage';
import {
  clearUnsyncedDraft,
  hasUnsyncedDraft,
  loadUnsyncedDraft,
  saveUnsyncedDraft,
} from '../storage/collabDraftStorage';

const SAVE_DEBOUNCE_MS = 400;
const REMOTE_POLL_MS = 2000;

const getGameIdFromUrl = () => {
  if (typeof window === 'undefined') return '';
  const gameId = new URLSearchParams(window.location.search).get('game');
  return gameId || '';
};

const replaceGameIdInUrl = (gameId) => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (gameId) {
    url.searchParams.set('game', gameId);
  } else {
    url.searchParams.delete('game');
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

const buildShareUrl = (gameId) => {
  if (!gameId || typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('game', gameId);
  return url.toString();
};

const buildParticipants = (members, presenceProfiles) => {
  const onlineSet = new Set((presenceProfiles || []).map((profile) => profile.userId));
  const byUserId = new Map();

  (members || []).forEach((member) => {
    byUserId.set(member.userId, {
      ...member,
      online: onlineSet.has(member.userId),
    });
  });

  (presenceProfiles || []).forEach((profile) => {
    if (!byUserId.has(profile.userId)) {
      byUserId.set(profile.userId, {
        userId: profile.userId,
        nickname: profile.nickname || 'Guest',
        joinedAt: null,
        lastSeenAt: null,
        online: true,
      });
      return;
    }

    const existing = byUserId.get(profile.userId);
    byUserId.set(profile.userId, {
      ...existing,
      nickname: existing.nickname || profile.nickname || 'Guest',
      online: true,
    });
  });

  return [...byUserId.values()].sort((a, b) => {
    const left = a.joinedAt || '';
    const right = b.joinedAt || '';
    return left.localeCompare(right);
  });
};

const buildPresenceProfileKey = (profile) => `${profile.userId}::${profile.onlineAt || ''}`;

const addPresenceProfiles = (currentProfiles, newProfiles) => {
  const next = [...(currentProfiles || [])];
  const existing = new Set(next.map(buildPresenceProfileKey));

  (newProfiles || []).forEach((profile) => {
    if (!profile?.userId) return;
    const normalized = {
      userId: profile.userId,
      nickname: profile.nickname || 'Guest',
      onlineAt: profile.onlineAt || null,
    };
    const key = buildPresenceProfileKey(normalized);
    if (existing.has(key)) return;
    existing.add(key);
    next.push(normalized);
  });

  return next;
};

const removePresenceProfiles = (currentProfiles, removedProfiles) => {
  const removeCounts = new Map();
  (removedProfiles || []).forEach((profile) => {
    if (!profile?.userId) return;
    const normalized = {
      userId: profile.userId,
      onlineAt: profile.onlineAt || null,
    };
    const key = buildPresenceProfileKey(normalized);
    removeCounts.set(key, (removeCounts.get(key) || 0) + 1);
  });

  return (currentProfiles || []).filter((profile) => {
    const key = buildPresenceProfileKey(profile);
    const count = removeCounts.get(key) || 0;
    if (count <= 0) return true;
    removeCounts.set(key, count - 1);
    return false;
  });
};

const createGuestNickname = () => {
  const suffix = `${Math.floor(1000 + Math.random() * 9000)}`;
  return `Guest-${suffix}`;
};

const isMissingAuthSessionError = (error) => {
  const message = `${error?.message || ''}`;
  return message.includes('Auth session missing');
};

const isAuthorizationLikeError = (error) => {
  const message = `${error?.message || ''}`.toLowerCase();
  const details = `${error?.details || ''}`.toLowerCase();
  return (
    error?.code === '42501' ||
    message.includes('not a member') ||
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    details.includes('permission denied')
  );
};

const isNotFoundLoadError = (error) => {
  const message = `${error?.message || ''}`.toLowerCase();
  return error?.code === 'PGRST116' || message.includes('no rows');
};

export function useCollaborativeGame() {
  const [appState, dispatch] = useReducer(appReducer, null, createBaseState);
  const [authStatus, setAuthStatus] = useState('loading');
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [gameId, setGameId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncError, setSyncError] = useState('');
  const initialUrlGameIdRef = useRef(getGameIdFromUrl());
  const [prefilledGameId, setPrefilledGameId] = useState(initialUrlGameIdRef.current);
  const [participants, setParticipants] = useState([]);
  const [isLobbyBusy, setIsLobbyBusy] = useState(false);
  const [lobbyError, setLobbyError] = useState('');
  const [createdGame, setCreatedGame] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);

  const activeNicknameRef = useRef(createGuestNickname());
  const saveTimerRef = useRef(null);
  const skipNextSaveRef = useRef(false);
  const appStateRef = useRef(createBaseState());
  const lastVersionRef = useRef(0);
  const joinTokenRef = useRef(0);
  const membersRef = useRef([]);
  const presenceProfilesRef = useRef([]);
  const unsubscribeStateRef = useRef(null);
  const unsubscribeMembersRef = useRef(null);
  const stopPresenceRef = useRef(null);
  const pollTimerRef = useRef(null);
  const autoJoinAttemptedRef = useRef(new Set());

  const hasEnv = hasSupabaseEnv();

  const cleanupRealtime = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (unsubscribeStateRef.current) {
      unsubscribeStateRef.current();
      unsubscribeStateRef.current = null;
    }
    if (unsubscribeMembersRef.current) {
      unsubscribeMembersRef.current();
      unsubscribeMembersRef.current = null;
    }
    if (stopPresenceRef.current) {
      const stop = stopPresenceRef.current;
      stopPresenceRef.current = null;
      Promise.resolve(stop()).catch(() => {});
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const refreshParticipants = useCallback(() => {
    setParticipants(buildParticipants(membersRef.current, presenceProfilesRef.current));
  }, []);

  const refreshMembers = useCallback(
    async (targetGameId) => {
      if (!targetGameId) return;
      const rows = await listGameMembers(targetGameId);
      membersRef.current = rows;
      refreshParticipants();
    },
    [refreshParticipants]
  );

  const applyRemoteState = useCallback((nextState) => {
    skipNextSaveRef.current = true;
    dispatch({ type: 'APP_LOAD', payload: normalizeAppState(nextState) });
  }, []);

  const startRemotePolling = useCallback(
    (targetGameId) => {
      if (!targetGameId) return;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      pollTimerRef.current = setInterval(async () => {
        try {
          const remote = await loadGameState(targetGameId);
          if (!remote?.version) return;
          const remoteVersion = Number(remote.version || 0);
          const normalizedRemoteState = normalizeAppState(remote.state);
          const hasDifferentState =
            JSON.stringify(normalizedRemoteState) !== JSON.stringify(appStateRef.current);
          const shouldApply = remoteVersion > lastVersionRef.current || hasDifferentState;

          if (!shouldApply) return;

          lastVersionRef.current = remoteVersion;
          setSyncStatus('synced');
          setSyncError('');
          applyRemoteState(normalizedRemoteState);
          saveLocalCache(targetGameId, normalizedRemoteState);
        } catch (_error) {
          // Realtime の補助目的なので、ポーリング失敗時は静かに継続する
        }
      }, REMOTE_POLL_MS);
    },
    [applyRemoteState]
  );

  const connectToGame = useCallback(
    async ({ targetGameId, nickname, seedState, seedVersion }) => {
      if (!targetGameId) {
        throw new Error('gameId が指定されていません。');
      }

      const token = ++joinTokenRef.current;
      cleanupRealtime();

      setSyncStatus('syncing');
      setSyncError('');
      setLobbyError('');
      setCreatedGame(null);

      let loadedState = seedState || null;
      let loadedVersion = Number(seedVersion || 0);
      let loadedFromLocalCache = false;

      if (!loadedState) {
        try {
          const loaded = await loadGameState(targetGameId);
          loadedState = loaded.state;
          loadedVersion = Number(loaded.version || 0);
        } catch (error) {
          if (isAuthorizationLikeError(error) || isNotFoundLoadError(error)) {
            throw error;
          }
          const cached = loadLocalCache(targetGameId);
          if (!cached) {
            throw error;
          }
          loadedState = cached;
          loadedVersion = 0;
          loadedFromLocalCache = true;
          setSyncError(
            'サーバー状態の取得に失敗したため、ローカルキャッシュを表示しています。再接続後に同期してください。'
          );
          setSyncStatus('error');
        }
      }

      if (joinTokenRef.current !== token) return;

      lastVersionRef.current = loadedVersion;
      setGameId(targetGameId);
      setPrefilledGameId(targetGameId);
      replaceGameIdInUrl(targetGameId);
      applyRemoteState(loadedState);
      saveLocalCache(targetGameId, loadedState);
      setHasDraft(hasUnsyncedDraft(targetGameId));
      if (!loadedFromLocalCache) {
        setSyncStatus('synced');
      }

      startRemotePolling(targetGameId);

      try {
        await refreshMembers(targetGameId);
      } catch (_error) {
        // メンバー取得失敗でも本体同期は継続する
      }
      if (joinTokenRef.current !== token) return;

      try {
        unsubscribeStateRef.current = await subscribeGameState(targetGameId, (remote) => {
          if (!remote?.version) return;
          const remoteVersion = Number(remote.version || 0);
          const normalizedRemoteState = normalizeAppState(remote.state);
          const hasDifferentState =
            JSON.stringify(normalizedRemoteState) !== JSON.stringify(appStateRef.current);
          const shouldApply = remoteVersion > lastVersionRef.current || hasDifferentState;
          if (!shouldApply) return;
          lastVersionRef.current = remoteVersion;
          setSyncStatus('synced');
          setSyncError('');
          applyRemoteState(normalizedRemoteState);
          saveLocalCache(targetGameId, normalizedRemoteState);
        });
      } catch (_error) {
        // Realtime購読に失敗してもポーリングで同期する
      }

      try {
        unsubscribeMembersRef.current = await subscribeGameMembers(targetGameId, () => {
          refreshMembers(targetGameId).catch(() => {});
        });
      } catch (_error) {
        // 参加者表示だけ失敗。ゲーム同期は継続する
      }

      try {
        stopPresenceRef.current = await trackPresence(
          targetGameId,
          {
            userId: user.id,
            nickname,
          },
          {
            onSync: (profiles) => {
              presenceProfilesRef.current = profiles;
              refreshParticipants();
            },
            onJoin: ({ profiles }) => {
              presenceProfilesRef.current = addPresenceProfiles(
                presenceProfilesRef.current,
                profiles
              );
              refreshParticipants();
            },
            onLeave: ({ profiles }) => {
              presenceProfilesRef.current = removePresenceProfiles(
                presenceProfilesRef.current,
                profiles
              );
              refreshParticipants();
            },
          }
        );
      } catch (_error) {
        // Presence失敗でも本体同期は継続する
      }
    },
    [
      applyRemoteState,
      cleanupRealtime,
      refreshMembers,
      refreshParticipants,
      startRemotePolling,
      user,
    ]
  );

  const createAndJoinGame = useCallback(
    async ({ nickname }) => {
      const trimmedName = (nickname || '').trim() || createGuestNickname();
      if (!user) {
        throw new Error('認証が完了していません。');
      }

      setIsLobbyBusy(true);
      setLobbyError('');
      try {
        activeNicknameRef.current = trimmedName;
        const created = await createGame({
          initialState: createBaseState(),
          nickname: trimmedName,
        });
        setJoinCode(created.joinCode);
        setCreatedGame({
          gameId: created.gameId,
          joinCode: created.joinCode,
          shareUrl: buildShareUrl(created.gameId),
        });
        await connectToGame({
          targetGameId: created.gameId,
          nickname: trimmedName,
          seedState: created.state,
          seedVersion: created.version,
        });
      } catch (error) {
        setLobbyError(error.message || 'ゲーム作成に失敗しました。');
        throw error;
      } finally {
        setIsLobbyBusy(false);
      }
    },
    [connectToGame, user]
  );

  const joinExistingGame = useCallback(
    async ({ gameId: nextGameId, joinCode: nextJoinCode, nickname }) => {
      const trimmedName = (nickname || '').trim() || createGuestNickname();
      if (!user) {
        throw new Error('認証が完了していません。');
      }

      setIsLobbyBusy(true);
      setLobbyError('');
      try {
        activeNicknameRef.current = trimmedName;
        const joined = await joinGame({
          gameId: nextGameId,
          joinCode: nextJoinCode,
          nickname: trimmedName,
        });
        setJoinCode(nextJoinCode);
        await connectToGame({
          targetGameId: joined.gameId,
          nickname: trimmedName,
          seedState: joined.state,
          seedVersion: joined.version,
        });
      } catch (error) {
        setLobbyError(error.message || 'ゲーム参加に失敗しました。');
        throw error;
      } finally {
        setIsLobbyBusy(false);
      }
    },
    [connectToGame, user]
  );

  const resendUnsyncedDraft = useCallback(async () => {
    if (!gameId) return false;
    const draft = loadUnsyncedDraft(gameId);
    if (!draft?.state) return false;

    setSyncStatus('syncing');
    try {
      const result = await saveGameState(gameId, draft.state);
      lastVersionRef.current = Number(result.version || lastVersionRef.current);
      applyRemoteState(draft.state);
      saveLocalCache(gameId, draft.state);
      clearUnsyncedDraft(gameId);
      setHasDraft(false);
      setSyncStatus('synced');
      setSyncError('');
      return true;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(error.message || '未同期下書きの再送に失敗しました。');
      return false;
    }
  }, [applyRemoteState, gameId]);

  const reloadFromServer = useCallback(async () => {
    if (!gameId) return false;
    setSyncStatus('syncing');
    try {
      const remote = await loadGameState(gameId);
      lastVersionRef.current = Number(remote.version || lastVersionRef.current);
      const normalized = normalizeAppState(remote.state);
      applyRemoteState(normalized);
      saveLocalCache(gameId, normalized);
      setSyncStatus('synced');
      setSyncError('');
      return true;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(error.message || 'サーバー再読込に失敗しました。');
      return false;
    }
  }, [applyRemoteState, gameId]);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      if (!hasEnv) {
        setAuthStatus('error');
        setAuthError(
          'Supabase 環境変数が設定されていません。VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を設定してください。'
        );
        return;
      }

      setAuthStatus('loading');
      setAuthError('');
      try {
        let current = null;
        try {
          current = await getCurrentUser();
        } catch (error) {
          if (!isMissingAuthSessionError(error)) {
            throw error;
          }
        }
        if (!current) {
          await signInAnonymously();
          current = await getCurrentUser();
        }
        if (!current) {
          throw new Error('匿名認証に失敗しました。');
        }
        if (cancelled) return;
        setUser(current);
        setAuthStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setAuthStatus('error');
        setAuthError(error.message || '匿名認証に失敗しました。');
      }
    };

    initializeAuth();

    return () => {
      cancelled = true;
      cleanupRealtime();
    };
  }, [cleanupRealtime, hasEnv]);

  useEffect(() => {
    if (authStatus !== 'ready') return;
    if (gameId) return;
    const autoJoinGameId = initialUrlGameIdRef.current;
    if (!autoJoinGameId) return;
    if (autoJoinAttemptedRef.current.has(autoJoinGameId)) return;

    autoJoinAttemptedRef.current.add(autoJoinGameId);
    connectToGame({
      targetGameId: autoJoinGameId,
      nickname: activeNicknameRef.current,
    }).catch(() => {
      setLobbyError(
        'URLのゲームに自動参加できませんでした。参加コードを入力して参加してください。'
      );
    });
  }, [authStatus, connectToGame, gameId]);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    if (!gameId) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    saveLocalCache(gameId, appState);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        const result = await saveGameState(gameId, appState);
        lastVersionRef.current = Number(result?.version || lastVersionRef.current);
        clearUnsyncedDraft(gameId);
        setHasDraft(false);
        setSyncStatus('synced');
        setSyncError('');
      } catch (error) {
        saveUnsyncedDraft(gameId, appState, error.message || 'save failed');
        setHasDraft(true);
        setSyncStatus('error');
        setSyncError(error.message || '同期保存に失敗しました。');
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [appState, gameId]);

  const syncMeta = useMemo(
    () => ({
      gameId,
      joinCode,
      syncStatus,
      syncError,
      participants,
      hasUnsyncedDraft: hasDraft,
      shareUrl: buildShareUrl(gameId),
    }),
    [gameId, hasDraft, joinCode, participants, syncError, syncStatus]
  );

  return {
    appState,
    dispatch,
    authStatus,
    authError,
    user,
    isLobbyVisible: Boolean(authStatus === 'ready' && !gameId),
    lobbyState: {
      prefilledGameId,
      isBusy: isLobbyBusy,
      error: lobbyError,
      createdGame,
    },
    syncMeta,
    actions: {
      createAndJoinGame,
      joinExistingGame,
      resendUnsyncedDraft,
      reloadFromServer,
      setPrefilledGameId,
    },
  };
}
