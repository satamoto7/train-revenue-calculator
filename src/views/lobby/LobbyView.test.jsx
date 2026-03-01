import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import LobbyView from './LobbyView';

const buildProps = (overrides = {}) => ({
  prefilledGameId: '',
  onPrefilledGameIdChange: vi.fn(),
  onCreateGame: vi.fn(),
  onJoinGame: vi.fn(),
  isBusy: false,
  error: '',
  createdGame: null,
  ...overrides,
});

describe('LobbyView', () => {
  test('prefilledGameId がある場合は参加コードだけで参加できる', async () => {
    const user = userEvent.setup();
    const props = buildProps({ prefilledGameId: 'game-url-id' });

    render(<LobbyView {...props} />);

    await user.type(screen.getByLabelText('参加コード'), '123456');
    await user.click(screen.getByRole('button', { name: '参加する' }));

    expect(props.onJoinGame).toHaveBeenCalledWith({
      gameId: 'game-url-id',
      joinCode: '123456',
      nickname: '',
    });
  });

  test('手入力トグルON時は入力したゲームIDで参加する', async () => {
    const user = userEvent.setup();
    const props = buildProps({ prefilledGameId: 'game-url-id' });

    render(<LobbyView {...props} />);

    await user.click(screen.getByRole('button', { name: 'ゲームIDを手入力する' }));
    const gameIdInput = screen.getByLabelText('参加用ゲームID');
    await user.clear(gameIdInput);
    await user.type(gameIdInput, 'manual-game-id');
    await user.type(screen.getByLabelText('参加コード'), '654321');
    await user.click(screen.getByRole('button', { name: '参加する' }));

    expect(props.onJoinGame).toHaveBeenCalledWith({
      gameId: 'manual-game-id',
      joinCode: '654321',
      nickname: '',
    });
  });

  test('作成完了セクションで招待URLと参加コードをコピーできる', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const props = buildProps({
      createdGame: {
        gameId: 'game-1',
        joinCode: '123456',
        shareUrl: 'https://example.com/?game=game-1',
      },
    });

    render(<LobbyView {...props} />);

    await user.click(screen.getByRole('button', { name: '招待URLをコピー' }));
    await user.click(screen.getByRole('button', { name: '参加コードをコピー' }));

    expect(writeText).toHaveBeenNthCalledWith(1, 'https://example.com/?game=game-1');
    expect(writeText).toHaveBeenNthCalledWith(2, '123456');
  });
});
