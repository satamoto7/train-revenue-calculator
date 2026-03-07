import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useCollaborativeGame } from './useCollaborativeGame';
import { createBaseState } from '../state/appState';

const mockCreateGame = vi.fn();
const mockJoinGame = vi.fn();
const mockLoadGameState = vi.fn();
const mockLoadGameShareMeta = vi.fn();
const mockSaveGameState = vi.fn();
const mockSignInAnonymously = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockSubscribeGameState = vi.fn();
const mockListGameMembers = vi.fn();
const mockSubscribeGameMembers = vi.fn();
const mockHasSupabaseEnv = vi.fn();

const buildBaseState = () => createBaseState();

vi.mock('../collab/gameRepository', () => ({
  createGame: (...args) => mockCreateGame(...args),
  joinGame: (...args) => mockJoinGame(...args),
  loadGameState: (...args) => mockLoadGameState(...args),
  loadGameShareMeta: (...args) => mockLoadGameShareMeta(...args),
  saveGameState: (...args) => mockSaveGameState(...args),
  signInAnonymously: (...args) => mockSignInAnonymously(...args),
  getCurrentUser: (...args) => mockGetCurrentUser(...args),
  subscribeGameState: (...args) => mockSubscribeGameState(...args),
  listGameMembers: (...args) => mockListGameMembers(...args),
  subscribeGameMembers: (...args) => mockSubscribeGameMembers(...args),
}));

vi.mock('../collab/supabaseClient', () => ({
  hasSupabaseEnv: (...args) => mockHasSupabaseEnv(...args),
}));

describe('useCollaborativeGame', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/');

    mockHasSupabaseEnv.mockReturnValue(true);
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' });
    mockSignInAnonymously.mockResolvedValue({ id: 'user-1' });
    mockSubscribeGameState.mockResolvedValue(() => {});
    mockSubscribeGameMembers.mockResolvedValue(() => {});
    mockListGameMembers.mockResolvedValue([
      {
        userId: 'user-1',
        nickname: 'P1',
        joinedAt: '2026-01-01T00:00:00.000Z',
        lastSeenAt: '2026-01-01T00:00:10.000Z',
      },
    ]);
    mockSaveGameState.mockResolvedValue({
      version: 2,
      updatedAt: '2026-01-01T00:00:02.000Z',
      updatedBy: 'user-1',
    });
    mockLoadGameState.mockResolvedValue({
      state: buildBaseState(),
      version: 1,
    });
    mockLoadGameShareMeta.mockResolvedValue({
      joinCode: '123456',
    });
    mockCreateGame.mockResolvedValue({
      gameId: 'game-1',
      joinCode: '123456',
      version: 1,
      state: buildBaseState(),
    });
    mockJoinGame.mockResolvedValue({
      gameId: 'game-1',
      version: 1,
      state: buildBaseState(),
    });

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('認証後はロビー表示になる', async () => {
    const { result } = renderHook(() => useCollaborativeGame());

    await waitFor(() => {
      expect(result.current.authStatus).toBe('ready');
    });

    expect(result.current.isLobbyVisible).toBe(true);
  });

  test('Auth session missing 時は匿名ログインへフォールバックする', async () => {
    mockGetCurrentUser
      .mockRejectedValueOnce(new Error('Auth session missing!'))
      .mockResolvedValueOnce({ id: 'user-1' });

    const { result } = renderHook(() => useCollaborativeGame());

    await waitFor(() => {
      expect(result.current.authStatus).toBe('ready');
    });

    expect(mockSignInAnonymously).toHaveBeenCalled();
    expect(result.current.isLobbyVisible).toBe(true);
  });

  test('createAndJoinGame でゲームに接続しロビーを抜ける', async () => {
    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    await waitFor(() => {
      expect(result.current.isLobbyVisible).toBe(false);
      expect(result.current.syncMeta.gameId).toBe('game-1');
      expect(result.current.syncMeta.joinCode).toBe('123456');
    });

    expect(mockCreateGame).toHaveBeenCalled();
  });

  test('URL 自動参加時はサーバーから joinCode を復元する', async () => {
    window.history.replaceState({}, '', '/?game=game-1');

    const { result } = renderHook(() => useCollaborativeGame());

    await waitFor(() => {
      expect(result.current.syncMeta.gameId).toBe('game-1');
      expect(result.current.syncMeta.joinCode).toBe('123456');
    });

    expect(mockLoadGameShareMeta).toHaveBeenCalledWith('game-1');
  });

  test('URL 自動参加時はローカル保存済み joinCode を共有に使える', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    window.history.replaceState({}, '', '/?game=game-1');
    localStorage.setItem(
      'collab_session_game-1',
      JSON.stringify({
        joinCode: '654321',
        savedAt: '2026-01-01T00:00:00.000Z',
      })
    );
    mockLoadGameShareMeta.mockRejectedValue(new Error('join code unavailable'));

    const { result } = renderHook(() => useCollaborativeGame());

    await waitFor(() => {
      expect(result.current.syncMeta.gameId).toBe('game-1');
      expect(result.current.syncMeta.joinCode).toBe('654321');
    });

    let response;
    await act(async () => {
      response = await result.current.actions.shareRoom();
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('参加コード: 654321'));
    expect(response).toEqual({
      status: 'copied',
      message: '招待情報をコピーしました。',
    });
  });

  test('ローカル dispatch 後に debounce 保存が走る', async () => {
    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    act(() => {
      result.current.dispatch({
        type: 'CONFIG_SET_PLAYERS',
        payload: [{ id: 'p1', name: 'Player A', displayName: 'Player A' }],
      });
    });

    await waitFor(() => {
      expect(mockSaveGameState).toHaveBeenCalled();
    });

    expect(mockSaveGameState).toHaveBeenCalledWith(
      'game-1',
      expect.objectContaining({
        gameConfig: expect.objectContaining({
          players: expect.arrayContaining([expect.objectContaining({ id: 'p1' })]),
        }),
      })
    );
  });

  test('listGameMembers の結果が参加者一覧に反映される', async () => {
    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    await waitFor(() => {
      expect(result.current.syncMeta.participants).toEqual([
        expect.objectContaining({
          userId: 'user-1',
          nickname: 'P1',
          joinedAt: '2026-01-01T00:00:00.000Z',
          lastSeenAt: '2026-01-01T00:00:10.000Z',
        }),
      ]);
    });
  });

  test('game_members 更新時に参加者一覧を再取得する', async () => {
    let memberSubscriptionHandler;
    const nextMembers = [
      {
        userId: 'user-1',
        nickname: 'P1',
        joinedAt: '2026-01-01T00:00:00.000Z',
        lastSeenAt: '2026-01-01T00:00:10.000Z',
      },
      {
        userId: 'user-2',
        nickname: 'P2',
        joinedAt: '2026-01-01T00:01:00.000Z',
        lastSeenAt: '2026-01-01T00:01:05.000Z',
      },
    ];
    mockListGameMembers
      .mockResolvedValueOnce([
        {
          userId: 'user-1',
          nickname: 'P1',
          joinedAt: '2026-01-01T00:00:00.000Z',
          lastSeenAt: '2026-01-01T00:00:10.000Z',
        },
      ])
      .mockResolvedValueOnce(nextMembers)
      .mockResolvedValue(nextMembers);
    mockSubscribeGameMembers.mockImplementation(async (_gameId, onChange) => {
      memberSubscriptionHandler = onChange;
      return () => {};
    });

    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    await act(async () => {
      await memberSubscriptionHandler();
    });

    await waitFor(() => {
      expect(result.current.syncMeta.participants).toHaveLength(2);
      expect(result.current.syncMeta.participants).toEqual([
        expect.objectContaining({ userId: 'user-1', nickname: 'P1' }),
        expect.objectContaining({ userId: 'user-2', nickname: 'P2' }),
      ]);
    });
  });

  test('shareRoom は navigator.share を優先して使う', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });

    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    let response;
    await act(async () => {
      response = await result.current.actions.shareRoom();
    });

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '18xx収益計算',
        text: expect.stringContaining('参加コード: 123456'),
        url: expect.stringContaining('?game=game-1'),
      })
    );
    expect(response).toEqual({
      status: 'shared',
      message: '招待情報を共有しました。',
    });
  });

  test('shareRoom は clipboard に fallback する', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    let response;
    await act(async () => {
      response = await result.current.actions.shareRoom();
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('招待URL: '));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('?game=game-1'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('参加コード: 123456'));
    expect(response).toEqual({
      status: 'copied',
      message: '招待情報をコピーしました。',
    });
  });

  test('shareRoom は共有キャンセルをエラー扱いしない', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });

    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    let response;
    await act(async () => {
      response = await result.current.actions.shareRoom();
    });

    expect(response).toEqual({
      status: 'cancelled',
      message: '',
    });
  });

  test('同一 version の stale realtime payload では未保存ローカル変更を上書きしない', async () => {
    let stateSubscriptionHandler;
    mockSubscribeGameState.mockImplementation(async (_gameId, handler) => {
      stateSubscriptionHandler = handler;
      return () => {};
    });

    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    act(() => {
      result.current.dispatch({
        type: 'CONFIG_SET_PLAYERS',
        payload: [{ id: 'p1', name: 'Player A', displayName: 'Player A' }],
      });
    });

    expect(result.current.appState.gameConfig.players).toEqual([
      expect.objectContaining({ id: 'p1', name: 'Player A' }),
    ]);

    act(() => {
      stateSubscriptionHandler({
        version: 1,
        state: buildBaseState(),
      });
    });

    expect(result.current.appState.gameConfig.players).toEqual([
      expect.objectContaining({ id: 'p1', name: 'Player A' }),
    ]);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(mockSaveGameState).toHaveBeenCalledWith(
      'game-1',
      expect.objectContaining({
        gameConfig: expect.objectContaining({
          players: [expect.objectContaining({ id: 'p1', name: 'Player A' })],
        }),
      })
    );
  }, 10000);

  test('同一 version の stale poll payload では未保存ローカル変更を上書きしない', async () => {
    mockLoadGameState
      .mockResolvedValueOnce({
        state: buildBaseState(),
        version: 1,
      })
      .mockResolvedValue({
        state: buildBaseState(),
        version: 1,
      });

    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    act(() => {
      result.current.dispatch({
        type: 'CONFIG_SET_PLAYERS',
        payload: [{ id: 'p1', name: 'Player A', displayName: 'Player A' }],
      });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2200));
    });

    expect(result.current.appState.gameConfig.players).toEqual([
      expect.objectContaining({ id: 'p1', name: 'Player A' }),
    ]);
  }, 10000);

  test('新しい version の remote payload は適用される', async () => {
    let stateSubscriptionHandler;
    mockSubscribeGameState.mockImplementation(async (_gameId, handler) => {
      stateSubscriptionHandler = handler;
      return () => {};
    });

    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    act(() => {
      stateSubscriptionHandler({
        version: 2,
        state: {
          ...buildBaseState(),
          gameConfig: {
            ...buildBaseState().gameConfig,
            players: [{ id: 'p2', name: 'Player B', displayName: 'Player B' }],
          },
        },
      });
    });

    expect(result.current.appState.gameConfig.players).toEqual([
      expect.objectContaining({ id: 'p2', name: 'Player B' }),
    ]);
  });

  test('reloadFromServer は同一 version でも明示的にサーバー状態を再適用できる', async () => {
    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    act(() => {
      result.current.dispatch({
        type: 'CONFIG_SET_PLAYERS',
        payload: [{ id: 'p1', name: 'Local Player', displayName: 'Local Player' }],
      });
    });

    mockLoadGameState.mockResolvedValueOnce({
      version: 1,
      state: {
        ...buildBaseState(),
        gameConfig: {
          ...buildBaseState().gameConfig,
          players: [{ id: 'p2', name: 'Remote Player', displayName: 'Remote Player' }],
        },
      },
    });

    await act(async () => {
      await result.current.actions.reloadFromServer();
    });

    expect(result.current.appState.gameConfig.players).toEqual([
      expect.objectContaining({ id: 'p2', name: 'Remote Player' }),
    ]);
  });
});
