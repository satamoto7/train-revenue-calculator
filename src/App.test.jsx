import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import App from './App';
import { createBaseState } from './state/appState';

const mockUseCollaborativeGame = vi.fn();

vi.mock('./hooks/useCollaborativeGame', () => ({
  useCollaborativeGame: () => mockUseCollaborativeGame(),
}));

const baseHookState = () => ({
  appState: createBaseState(),
  dispatch: vi.fn(),
  authStatus: 'ready',
  authError: '',
  isLobbyVisible: true,
  lobbyState: {
    prefilledGameId: 'game-prefilled',
    isBusy: false,
    error: '',
    createdGame: null,
  },
  syncMeta: {
    gameId: '',
    joinCode: '',
    syncStatus: 'idle',
    syncError: '',
    participants: [],
    hasUnsyncedDraft: false,
    shareUrl: '',
  },
  actions: {
    createAndJoinGame: vi.fn(),
    joinExistingGame: vi.fn(),
    resendUnsyncedDraft: vi.fn(),
    setPrefilledGameId: vi.fn(),
  },
});

describe('App (collab mode)', () => {
  beforeEach(() => {
    mockUseCollaborativeGame.mockReset();
  });

  test('authStatus=loading では準備表示を出す', () => {
    const state = baseHookState();
    state.authStatus = 'loading';
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);

    expect(screen.getByText('匿名ログインを準備中です...')).toBeInTheDocument();
  });

  test('ロビー画面に新規作成・参加UIを表示する', () => {
    mockUseCollaborativeGame.mockReturnValue(baseHookState());
    render(<App />);

    expect(screen.getByRole('heading', { name: '共同ゲームロビー' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ゲームを新規作成' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '参加する' })).toBeInTheDocument();
  });

  test('ゲーム参加後は同期ステータスバーと通常ビューを表示する', () => {
    const state = baseHookState();
    state.isLobbyVisible = false;
    state.syncMeta = {
      gameId: 'game-1',
      joinCode: '123456',
      syncStatus: 'synced',
      syncError: '',
      participants: [{ userId: 'u1', nickname: 'P1', online: true }],
      hasUnsyncedDraft: false,
      shareUrl: 'https://example.com/?game=game-1',
    };
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);

    expect(screen.getByText(/ゲームID:/)).toBeInTheDocument();
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument();
  });

  test('未同期下書きがある場合に再送ボタンを押せる', async () => {
    const user = userEvent.setup();
    const state = baseHookState();
    state.isLobbyVisible = false;
    state.syncMeta = {
      gameId: 'game-1',
      joinCode: '123456',
      syncStatus: 'error',
      syncError: 'save failed',
      participants: [],
      hasUnsyncedDraft: true,
      shareUrl: 'https://example.com/?game=game-1',
    };
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);
    await user.click(screen.getByRole('button', { name: '下書きを再送' }));

    expect(state.actions.resendUnsyncedDraft).toHaveBeenCalled();
  });
});
