import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import StockRoundView from './StockRoundView';

const baseProps = () => ({
  players: [
    { id: 'p1', displayName: 'Player A', name: 'Player A', symbol: '●' },
    { id: 'p2', displayName: 'Player B', name: 'Player B', symbol: '▲' },
  ],
  companies: [
    {
      id: 'c1',
      displayName: '会社A',
      name: 'Co1',
      stockHoldings: [
        { playerId: 'p1', percentage: 20 },
        { playerId: 'p2', percentage: 10 },
      ],
      treasuryStockPercentage: 10,
      bankPoolPercentage: 30,
      isUnestablished: false,
    },
  ],
  hasIpoShares: true,
  validation: {},
  handleStockChange: vi.fn(),
  handlePresidentChange: vi.fn(),
  handleUnestablishedChange: vi.fn(),
  handleValidate: vi.fn(),
  handleComplete: vi.fn(),
});

describe('StockRoundView committed number inputs', () => {
  test('株式割合は blur まで commit されない', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StockRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: '詳細を開く' }));
    const input = screen.getByLabelText('会社AのPlayer A保有率');
    await user.clear(input);
    await user.type(input, '55');

    expect(props.handleStockChange).not.toHaveBeenCalled();

    await user.tab();

    expect(props.handleStockChange).toHaveBeenCalledWith('c1', {
      target: 'player',
      playerId: 'p1',
      value: 55,
    });
  });

  test('株式割合は commit 時に 100 へ clamp される', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StockRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: '詳細を開く' }));
    const input = screen.getByLabelText('会社AのPlayer A保有率');
    await user.clear(input);
    await user.type(input, '120');
    await user.tab();

    expect(props.handleStockChange).toHaveBeenCalledWith('c1', {
      target: 'player',
      playerId: 'p1',
      value: 100,
    });
  });

  test('手動社長指定はチェックで切り替えられる', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StockRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: '詳細を開く' }));
    await user.click(screen.getByLabelText('会社AのPlayer Bを社長にする'));

    expect(props.handlePresidentChange).toHaveBeenCalledWith('c1', 'p2');
  });
});
