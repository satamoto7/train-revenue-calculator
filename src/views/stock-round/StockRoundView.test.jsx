import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import StockRoundView from './StockRoundView';

const baseProps = () => ({
  players: [
    { id: 'p1', displayName: 'Player A', name: 'Player A', color: '赤', symbol: '●' },
    { id: 'p2', displayName: 'Player B', name: 'Player B', color: '青', symbol: '▲' },
  ],
  companies: [
    {
      id: 'c1',
      displayName: '会社A',
      name: 'Co1',
      color: '赤',
      symbol: '○',
      stockHoldings: [
        { playerId: 'p1', percentage: 20 },
        { playerId: 'p2', percentage: 10 },
      ],
      treasuryStockPercentage: 10,
      bankPoolPercentage: 30,
      isUnestablished: false,
    },
  ],
  numORs: 2,
  hasIpoShares: true,
  validation: {},
  handleStockChange: vi.fn(),
  handlePresidentChange: vi.fn(),
  handleUnestablishedChange: vi.fn(),
  handleValidate: vi.fn(),
  handleSetNumORs: vi.fn(),
  handleComplete: vi.fn(),
  handlePlayerPeriodicIncomeChange: vi.fn(),
  handleCompanyPeriodicIncomeChange: vi.fn(),
});

describe('StockRoundView committed number inputs', () => {
  const openUtilityPanel = async (user) => {
    await user.click(screen.getByText('補助設定: プレイヤー定期収入 / OR数'));
  };

  test('株式割合は blur まで commit されない', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StockRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: '編集' }));
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

    await user.click(screen.getByRole('button', { name: '編集' }));
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

    await user.click(screen.getByRole('button', { name: '編集' }));
    await user.click(screen.getByLabelText('会社AのPlayer Bを社長にする'));

    expect(props.handlePresidentChange).toHaveBeenCalledWith('c1', 'p2');
  });

  test('プレイヤー定期収入は blur で commit される', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StockRoundView {...props} />);

    await openUtilityPanel(user);
    const input = screen.getByLabelText('Player Aの定期収入');
    await user.clear(input);
    await user.type(input, '35');

    expect(props.handlePlayerPeriodicIncomeChange).not.toHaveBeenCalled();

    await user.tab();

    expect(props.handlePlayerPeriodicIncomeChange).toHaveBeenCalledWith('p1', 35);
  });

  test('企業定期収入は空欄で blur すると 0 が commit される', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StockRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: '編集' }));
    const input = screen.getByLabelText('会社Aの企業定期収入');
    await user.clear(input);
    await user.tab();

    expect(props.handleCompanyPeriodicIncomeChange).toHaveBeenCalledWith('c1', 0);
  });

  test('会社カードと保有チップに色アクセントを表示する', () => {
    const props = baseProps();
    render(<StockRoundView {...props} />);

    expect(screen.getByRole('heading', { name: '会社A' }).closest('article')).toHaveClass(
      'border-l-4',
      'border-l-red-500'
    );
    const accentBlocks = screen.getAllByText('● Player A');
    expect(accentBlocks[0].closest('.border-l-4')).toHaveClass('border-l-4', 'border-l-rose-300');
  });

  test('SR完了後の OR 数を変更できる', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StockRoundView {...props} />);

    await openUtilityPanel(user);
    await user.selectOptions(screen.getByLabelText('SR完了後の OR 数'), '3');

    expect(props.handleSetNumORs).toHaveBeenCalledWith(3);
  });
});
