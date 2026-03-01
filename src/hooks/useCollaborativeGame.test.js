import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useCollaborativeGame } from './useCollaborativeGame';

const mockCreateGame = vi.fn();
const mockJoinGame = vi.fn();
const mockLoadGameState = vi.fn();
const mockSaveGameState = vi.fn();
const mockSignInAnonymously = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockSubscribeGameState = vi.fn();
const mockListGameMembers = vi.fn();
const mockSubscribeGameMembers = vi.fn();
const mockTrackPresence = vi.fn();
const mockHasSupabaseEnv = vi.fn();

vi.mock('../collab/gameRepository', () => ({
  createGame: (...args) => mockCreateGame(...args),
  joinGame: (...args) => mockJoinGame(...args),
  loadGameState: (...args) => mockLoadGameState(...args),
  saveGameState: (...args) => mockSaveGameState(...args),
  signInAnonymously: (...args) => mockSignInAnonymously(...args),
  getCurrentUser: (...args) => mockGetCurrentUser(...args),
  subscribeGameState: (...args) => mockSubscribeGameState(...args),
  listGameMembers: (...args) => mockListGameMembers(...args),
  subscribeGameMembers: (...args) => mockSubscribeGameMembers(...args),
}));

vi.mock('../collab/presenceRepository', () => ({
  trackPresence: (...args) => mockTrackPresence(...args),
}));

vi.mock('../collab/supabaseClient', () => ({
  hasSupabaseEnv: (...args) => mockHasSupabaseEnv(...args),
}));

describe('useCollaborativeGame', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

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
    mockTrackPresence.mockResolvedValue(async () => {});
    mockSaveGameState.mockResolvedValue({
      version: 2,
      updatedAt: '2026-01-01T00:00:02.000Z',
      updatedBy: 'user-1',
    });
    mockLoadGameState.mockResolvedValue({
      state: {
        players: [],
        companies: [],
        flow: { step: 'setup', setupLocked: false, hasIpoShares: true, numORs: 2 },
        activeCycle: {
          cycleNo: 1,
          companyOrder: [],
          currentOR: 1,
          completedCompanyIdsByOR: { 1: [], 2: [] },
          selectedCompanyId: null,
        },
        cycleHistory: [],
        summarySelectedCycleNo: null,
        srValidation: {},
      },
      version: 1,
    });
    mockCreateGame.mockResolvedValue({
      gameId: 'game-1',
      joinCode: '123456',
      version: 1,
      state: {
        players: [],
        companies: [],
        flow: { step: 'setup', setupLocked: false, hasIpoShares: true, numORs: 2 },
        activeCycle: {
          cycleNo: 1,
          companyOrder: [],
          currentOR: 1,
          completedCompanyIdsByOR: { 1: [], 2: [] },
          selectedCompanyId: null,
        },
        cycleHistory: [],
        summarySelectedCycleNo: null,
        srValidation: {},
      },
    });
    mockJoinGame.mockResolvedValue({
      gameId: 'game-1',
      version: 1,
      state: {
        players: [],
        companies: [],
        flow: { step: 'setup', setupLocked: false, hasIpoShares: true, numORs: 2 },
        activeCycle: {
          cycleNo: 1,
          companyOrder: [],
          currentOR: 1,
          completedCompanyIdsByOR: { 1: [], 2: [] },
          selectedCompanyId: null,
        },
        cycleHistory: [],
        summarySelectedCycleNo: null,
        srValidation: {},
      },
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
    });
    expect(mockCreateGame).toHaveBeenCalled();
  });

  test('ローカル dispatch 後に debounce 保存が走る', async () => {
    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    act(() => {
      result.current.dispatch({
        type: 'PLAYER_SET_ALL',
        payload: [{ id: 'p1', name: 'Player A', displayName: 'Player A' }],
      });
    });

    await waitFor(() => {
      expect(mockSaveGameState).toHaveBeenCalled();
    });

    expect(mockSaveGameState).toHaveBeenCalledWith(
      'game-1',
      expect.objectContaining({
        players: expect.arrayContaining([expect.objectContaining({ id: 'p1' })]),
      })
    );
  });

  test('Presence の join/leave で参加者の online/offline が更新される', async () => {
    let presenceHandlers;
    mockTrackPresence.mockImplementation(async (_gameId, _profile, handlers) => {
      presenceHandlers = handlers;
      return async () => {};
    });

    const { result } = renderHook(() => useCollaborativeGame());
    await waitFor(() => expect(result.current.authStatus).toBe('ready'));

    await act(async () => {
      await result.current.actions.createAndJoinGame({ nickname: 'P1' });
    });

    await waitFor(() => {
      expect(result.current.syncMeta.participants[0]).toEqual(
        expect.objectContaining({ userId: 'user-1', online: false })
      );
    });

    act(() => {
      presenceHandlers.onJoin({
        userId: 'user-1',
        profiles: [
          {
            userId: 'user-1',
            nickname: 'P1',
            onlineAt: '2026-01-01T00:00:20.000Z',
          },
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.syncMeta.participants[0]).toEqual(
        expect.objectContaining({ userId: 'user-1', online: true })
      );
    });

    act(() => {
      presenceHandlers.onLeave({
        userId: 'user-1',
        profiles: [
          {
            userId: 'user-1',
            nickname: 'P1',
            onlineAt: '2026-01-01T00:00:20.000Z',
          },
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.syncMeta.participants[0]).toEqual(
        expect.objectContaining({ userId: 'user-1', online: false })
      );
    });
  });
});
