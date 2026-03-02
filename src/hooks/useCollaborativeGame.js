import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  createGame,
  getCurrentUser,
  joinGame,
  listGameMembers,
  loadGameShareMeta,
  loadGameState,
  saveGameState,
  signInAnonymously,
  subscribeGameMembers,
  subscribeGameState,
} from '../collab/gameRepository';
import { hasSupabaseEnv } from '../collab/supabaseClient';
import { appReducer } from '../state/appReducer';
import { createBaseState, normalizeAppState } from '../state/appState';
import { load as loadLocalCache, save as saveLocalCache } from '../storage/appStorage';
import {
  clearUnsyncedDraft,
  hasUnsyncedDraft,
  loadUnsyncedDraft,
  saveUnsyncedDraft,
} from '../storage/collabDraftStorage';
import { loadCollabSession, saveCollabSession } from '../storage/collabSessionStorage';

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

const buildParticipants = (members) =>
  [...(members || [])]
    .map((member) => ({
      userId: member.userId,
      nickname: member.nickname || 'Guest',
      joinedAt: member.joinedAt || null,
      lastSeenAt: member.lastSeenAt || null,
    }))
    .sort((a, b) => {
      const left = a.joinedAt || '';
      const right = b.joinedAt || '';
      return left.localeCompare(right);
    });

const createGuestNickname = () => {
  const suffix = `${Math.floor(1000 + Math.random() * 9000)}`;
  return `Guest-${suffix}`;
};

const buildInviteMessage = ({ shareUrl, joinCode }) =>
  `18xx 収益計算補助の共同ゲームに参加してください。\n招待URL: ${shareUrl}\n参加コード: ${joinCode}`;

const isShareCanceledError = (error) =>
  error?.name === 'AbortError' || error?.name === 'NotAllowedError';

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

  const saveTimerRef = useRef(null);
  const skipNextSaveRef = useRef(false);
  const lastVersionRef = useRef(0);
  const joinTokenRef = useRef(0);
  const membersRef = useRef([]);
  const unsubscribeStateRef = useRef(null);
  const unsubscribeMembersRef = useRef(null);
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
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const refreshParticipants = useCallback(() => {
    setParticipants(buildParticipants(membersRef.current));
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

  const applyRemoteSnapshot = useCallback(
    ({ state, version, force = false, targetGameId }) => {
      if (state == null) return false;

      const normalizedRemoteState = normalizeAppState(state);
      const remoteVersion = Number(version || 0);

      // Passive sync follows monotonic server versions so stale payloads never overwrite
      // unsaved local edits during the debounce window.
      if (!force && remoteVersion <= lastVersionRef.current) {
        return false;
      }

      if (remoteVersion > 0) {
        lastVersionRef.current = remoteVersion;
      }
      setSyncStatus('synced');
      setSyncError('');
      applyRemoteState(normalizedRemoteState);
      if (targetGameId) {
        saveLocalCache(targetGameId, normalizedRemoteState);
      }
      return true;
    },
    [applyRemoteState]
  );

  const startRemotePolling = useCallback(
    (targetGameId) => {
      if (!targetGameId) return;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      pollTimerRef.current = setInterval(async () => {
        try {
          const remote = await loadGameState(targetGameId);
          applyRemoteSnapshot({
            state: remote?.state,
            version: remote?.version,
            targetGameId,
          });
        } catch (_error) {
          // Realtime の補助目的なので、ポーリング失敗時は静かに継続する
        }
      }, REMOTE_POLL_MS);
    },
    [applyRemoteSnapshot]
  );

  const connectToGame = useCallback(
    async ({ targetGameId, seedState, seedVersion }) => {
      if (!targetGameId) {
        throw new Error('gameId が指定されていません。');
      }

      const token = ++joinTokenRef.current;
      const cachedSession = loadCollabSession(targetGameId);
      const cachedJoinCode = cachedSession?.joinCode || '';
      cleanupRealtime();
      membersRef.current = [];
      setParticipants([]);
      setJoinCode(cachedJoinCode);

      setSyncStatus('syncing');
      setSyncError('');
      setLobbyError('');
      setCreatedGame(null);

      const shareMetaPromise = loadGameShareMeta(targetGameId).catch(() => null);
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

      setGameId(targetGameId);
      setPrefilledGameId(targetGameId);
      replaceGameIdInUrl(targetGameId);
      applyRemoteSnapshot({
        state: loadedState,
        version: loadedVersion,
        force: true,
        targetGameId,
      });
      setHasDraft(hasUnsyncedDraft(targetGameId));
      if (!loadedFromLocalCache) {
        setSyncStatus('synced');
      }

      const shareMeta = await shareMetaPromise;
      if (joinTokenRef.current !== token) return;
      if (shareMeta?.joinCode) {
        setJoinCode(shareMeta.joinCode);
        saveCollabSession(targetGameId, { joinCode: shareMeta.joinCode });
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
          applyRemoteSnapshot({
            state: remote?.state,
            version: remote?.version,
            targetGameId,
          });
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
    },
    [applyRemoteSnapshot, cleanupRealtime, refreshMembers, startRemotePolling]
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
        const created = await createGame({
          initialState: createBaseState(),
          nickname: trimmedName,
        });
        setJoinCode(created.joinCode);
        saveCollabSession(created.gameId, { joinCode: created.joinCode });
        setCreatedGame({
          gameId: created.gameId,
          joinCode: created.joinCode,
          shareUrl: buildShareUrl(created.gameId),
        });
        await connectToGame({
          targetGameId: created.gameId,
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
        const joined = await joinGame({
          gameId: nextGameId,
          joinCode: nextJoinCode,
          nickname: trimmedName,
        });
        setJoinCode(nextJoinCode);
        saveCollabSession(joined.gameId, { joinCode: nextJoinCode });
        await connectToGame({
          targetGameId: joined.gameId,
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
      applyRemoteSnapshot({
        state: draft.state,
        version: result.version || lastVersionRef.current,
        force: true,
        targetGameId: gameId,
      });
      clearUnsyncedDraft(gameId);
      setHasDraft(false);
      return true;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(error.message || '未同期下書きの再送に失敗しました。');
      return false;
    }
  }, [applyRemoteSnapshot, gameId]);

  const reloadFromServer = useCallback(async () => {
    if (!gameId) return false;
    setSyncStatus('syncing');
    try {
      const remote = await loadGameState(gameId);
      applyRemoteSnapshot({
        state: remote.state,
        version: remote.version,
        force: true,
        targetGameId: gameId,
      });
      return true;
    } catch (error) {
      setSyncStatus('error');
      setSyncError(error.message || 'サーバー再読込に失敗しました。');
      return false;
    }
  }, [applyRemoteSnapshot, gameId]);

  const shareRoom = useCallback(async () => {
    const shareUrl = buildShareUrl(gameId);
    if (!shareUrl || !joinCode) {
      return {
        status: 'error',
        message: '共有に失敗しました。手動でURLと参加コードを共有してください。',
      };
    }

    const text = buildInviteMessage({ shareUrl, joinCode });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: '18xx 収益計算補助',
          text,
          url: shareUrl,
        });
        return {
          status: 'shared',
          message: '招待情報を共有しました。',
        };
      } catch (error) {
        if (isShareCanceledError(error)) {
          return {
            status: 'cancelled',
            message: '',
          };
        }
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return {
          status: 'copied',
          message: '招待情報をコピーしました。',
        };
      } catch (_error) {
        return {
          status: 'error',
          message: '共有に失敗しました。手動でURLと参加コードを共有してください。',
        };
      }
    }

    return {
      status: 'error',
      message: '共有に失敗しました。手動でURLと参加コードを共有してください。',
    };
  }, [gameId, joinCode]);

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
    }).catch(() => {
      setLobbyError(
        'URLのゲームに自動参加できませんでした。参加コードを入力して参加してください。'
      );
    });
  }, [authStatus, connectToGame, gameId]);

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
      shareRoom,
      setPrefilledGameId,
    },
  };
}
