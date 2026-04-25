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
    reloadFromServer: vi.fn(),
    shareRoom: vi.fn().mockResolvedValue({ status: 'shared', message: '招待情報を共有しました。' }),
    setPrefilledGameId: vi.fn(),
  },
});

const buildJoinedState = () => {
  const state = baseHookState();
  state.isLobbyVisible = false;
  state.syncMeta = {
    gameId: 'game-1',
    joinCode: '123456',
    syncStatus: 'synced',
    syncError: '',
    participants: [{ userId: 'u1', nickname: 'P1' }],
    hasUnsyncedDraft: false,
    shareUrl: 'https://example.com/?game=game-1',
  };
  return state;
};

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

    expect(screen.getByRole('heading', { name: '18xx収益計算' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '共同ゲームロビー' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ゲームを新規作成' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '参加する' })).toBeInTheDocument();
  });

  test('ゲーム参加後は同期ステータスバーと通常ビューを表示する', () => {
    const state = buildJoinedState();
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);

    expect(screen.getByRole('heading', { name: '18xx収益計算' })).toBeInTheDocument();
    expect(screen.getByText('ゲームID')).toBeInTheDocument();
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument();
    const tablist = screen.getByRole('tablist', { name: 'ワークスペース切り替え' });
    expect(tablist).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '設定', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ボード' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '履歴' })).toBeInTheDocument();
  });

  test('設定完了後にゲーム開始でボード進行へ入る action を dispatch する', async () => {
    const user = userEvent.setup();
    const state = buildJoinedState();
    state.appState = {
      ...createBaseState(),
      gameConfig: {
        ...createBaseState().gameConfig,
        players: [{ id: 'p1', seatLabel: 'A', displayName: 'Player A', name: 'Player A' }],
        companies: [{ id: 'c1', displayName: '会社A', name: 'Co1', symbol: '○', color: '赤' }],
      },
    };
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'ゲーム開始（SRへ）' }));

    expect(state.dispatch).toHaveBeenCalledWith({ type: 'SETUP_LOCK', payload: true });
  });

  test('共有ボタン押下で shareRoom を呼ぶ', async () => {
    const user = userEvent.setup();
    const state = buildJoinedState();
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'この部屋を共有' }));

    expect(state.actions.shareRoom).toHaveBeenCalled();
  });

  test('未同期下書きがある場合に再送ボタンを押せる', async () => {
    const user = userEvent.setup();
    const state = buildJoinedState();
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

  test('企業未登録ならテンプレート適用で即座に企業一覧を置き換える', async () => {
    const user = userEvent.setup();
    const state = buildJoinedState();
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);
    await user.selectOptions(screen.getByLabelText('企業テンプレート'), '1830');
    await user.click(screen.getByRole('button', { name: '企業テンプレートを適用' }));

    expect(state.dispatch).toHaveBeenCalledTimes(1);
    expect(state.dispatch.mock.calls[0][0].type).toBe('CONFIG_SET_COMPANIES');
    expect(state.dispatch.mock.calls[0][0].payload).toHaveLength(8);
    expect(state.dispatch.mock.calls[0][0].payload[0]).toMatchObject({
      displayName: 'PRR',
      name: 'Pennsylvania Railroad',
      color: '#32763f',
    });
  });

  test('major を含むテンプレート適用時は Merger Round も有効化する', async () => {
    const user = userEvent.setup();
    const state = buildJoinedState();
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);
    await user.selectOptions(screen.getByLabelText('企業テンプレート'), 'lost-atlas');
    await user.click(screen.getByRole('button', { name: '企業テンプレートを適用' }));

    expect(state.dispatch).toHaveBeenCalledTimes(2);
    expect(state.dispatch.mock.calls[0][0]).toEqual({
      type: 'CONFIG_SET_MERGER_ROUND_ENABLED',
      payload: true,
    });
    expect(state.dispatch.mock.calls[1][0].type).toBe('CONFIG_SET_COMPANIES');
    expect(state.dispatch.mock.calls[1][0].payload).toHaveLength(18);
    expect(state.dispatch.mock.calls[1][0].payload[12]).toMatchObject({
      displayName: 'Consortium',
      companyType: 'major',
    });
  });

  test('企業登録済みならテンプレート適用前に確認モーダルを出す', async () => {
    const user = userEvent.setup();
    const state = buildJoinedState();
    state.appState = {
      ...createBaseState(),
      gameConfig: {
        ...createBaseState().gameConfig,
        companies: [{ id: 'c1', name: 'Co1', displayName: '会社A', color: '赤', symbol: '○' }],
      },
    };
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);
    await user.selectOptions(screen.getByLabelText('企業テンプレート'), '1846');
    await user.click(screen.getByRole('button', { name: '企業テンプレートを適用' }));

    expect(
      screen.getByText(
        /既存の企業一覧・株式入力・OR結果・進行順は新しい企業セットに置き換わります。/
      )
    ).toBeInTheDocument();
    expect(state.dispatch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'OK' }));

    expect(state.dispatch).toHaveBeenCalledTimes(1);
    expect(state.dispatch.mock.calls[0][0].type).toBe('CONFIG_SET_COMPANIES');
    expect(state.dispatch.mock.calls[0][0].payload).toHaveLength(7);
  });

  test('major を含むテンプレートを上書き適用する前は追加説明つきで確認する', async () => {
    const user = userEvent.setup();
    const state = buildJoinedState();
    state.appState = {
      ...createBaseState(),
      gameConfig: {
        ...createBaseState().gameConfig,
        companies: [{ id: 'c1', name: 'Co1', displayName: '会社A', color: '赤', symbol: '○' }],
      },
    };
    mockUseCollaborativeGame.mockReturnValue(state);

    render(<App />);
    await user.selectOptions(screen.getByLabelText('企業テンプレート'), 'lost-atlas');
    await user.click(screen.getByRole('button', { name: '企業テンプレートを適用' }));

    expect(
      screen.getByText((content) =>
        content.includes('このテンプレートは Merger Round も有効化します。')
      )
    ).toBeInTheDocument();
    expect(state.dispatch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'OK' }));

    expect(state.dispatch).toHaveBeenCalledTimes(2);
    expect(state.dispatch.mock.calls[0][0]).toEqual({
      type: 'CONFIG_SET_MERGER_ROUND_ENABLED',
      payload: true,
    });
    expect(state.dispatch.mock.calls[1][0].type).toBe('CONFIG_SET_COMPANIES');
    expect(state.dispatch.mock.calls[1][0].payload).toHaveLength(18);
  });
});
