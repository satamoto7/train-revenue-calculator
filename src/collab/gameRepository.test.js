import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createGame,
  joinGame,
  listGameMembers,
  loadGameState,
  saveGameState,
  subscribeGameState,
} from './gameRepository';

let mockSupabase;

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: () => mockSupabase,
}));

describe('gameRepository', () => {
  beforeEach(() => {
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(),
      channel: vi.fn(),
      removeChannel: vi.fn(),
      auth: {
        signInAnonymously: vi.fn(),
        getUser: vi.fn(),
      },
    };
  });

  test('createGame は RPC 応答を正規化して返す', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        game_id: 'game-1',
        join_code: '123456',
        version: 1,
        state: { players: [] },
      },
      error: null,
    });

    const result = await createGame({
      initialState: { players: [] },
      nickname: 'P1',
    });

    expect(result.gameId).toBe('game-1');
    expect(result.joinCode).toBe('123456');
    expect(result.version).toBe(1);
  });

  test('joinGame は RPC エラーを送出する', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: new Error('invalid join code'),
    });

    await expect(
      joinGame({
        gameId: 'game-1',
        joinCode: '000000',
        nickname: 'P2',
      })
    ).rejects.toThrow('invalid join code');
  });

  test('loadGameState は game_states を読み込む', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        state: { players: [] },
        version: 3,
        updated_at: '2026-01-01T00:00:00.000Z',
        updated_by: 'user-1',
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    const result = await loadGameState('game-1');

    expect(mockSupabase.from).toHaveBeenCalledWith('game_states');
    expect(result.version).toBe(3);
    expect(result.updatedBy).toBe('user-1');
  });

  test('saveGameState は save_game_state RPC を使う', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        version: 4,
        updated_at: '2026-01-01T00:00:01.000Z',
        updated_by: 'user-1',
      },
      error: null,
    });

    const result = await saveGameState('game-1', { players: [] });

    expect(result.version).toBe(4);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('save_game_state', {
      game_id: 'game-1',
      next_state: expect.any(Object),
    });
  });

  test('saveGameState は RPC 未定義時に update へフォールバックする', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function save_game_state' },
    });

    const single = vi.fn().mockResolvedValue({
      data: {
        version: 5,
        updated_at: '2026-01-01T00:00:02.000Z',
        updated_by: 'user-1',
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ update });

    const result = await saveGameState('game-1', { players: [] });
    expect(result.version).toBe(5);
    expect(update).toHaveBeenCalled();
  });

  test('subscribeGameState は更新イベントを渡す', async () => {
    let updateHandler;
    const channel = {
      on: vi.fn((eventType, filter, callback) => {
        if (eventType === 'postgres_changes') {
          updateHandler = callback;
        }
        return channel;
      }),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED');
        return channel;
      }),
    };
    mockSupabase.channel.mockReturnValue(channel);

    const onUpdate = vi.fn();
    const unsubscribe = await subscribeGameState('game-1', onUpdate);

    updateHandler({
      new: {
        state: { players: [] },
        version: 7,
        updated_at: '2026-01-01T00:00:03.000Z',
        updated_by: 'user-1',
      },
    });

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 7,
      })
    );

    unsubscribe();
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  test('listGameMembers はメンバー配列を返す', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          user_id: 'u1',
          nickname: 'P1',
          joined_at: '2026-01-01T00:00:00.000Z',
          last_seen_at: '2026-01-01T00:00:10.000Z',
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    const members = await listGameMembers('game-1');
    expect(members[0].userId).toBe('u1');
    expect(members[0].nickname).toBe('P1');
  });
});
