import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import OrRoundView from './OrRoundView';

const buildCompany = () => ({
  id: 'c1',
  name: 'Co1',
  displayName: '',
  genericIndex: 1,
  color: '赤',
  symbol: '○',
  isUnestablished: false,
  trains: [],
  stockHoldings: [{ playerId: 'p1', percentage: 60 }],
  treasuryStockPercentage: 0,
  orRevenues: [
    { orNum: 1, revenue: 100 },
    { orNum: 2, revenue: 0 },
  ],
});

const buildSecondCompany = () => ({
  id: 'c2',
  name: 'Co2',
  displayName: '会社B',
  genericIndex: 2,
  color: '青',
  symbol: '△',
  isUnestablished: false,
  trains: [],
  stockHoldings: [],
  treasuryStockPercentage: 0,
  orRevenues: [
    { orNum: 1, revenue: 50 },
    { orNum: 2, revenue: 10 },
  ],
});

const buildProps = (overrides = {}) => ({
  players: [
    { id: 'p1', displayName: 'Alice', name: 'Alice', color: '緑', symbol: '●' },
    { id: 'p2', displayName: 'Bob', name: 'Bob', color: '黄', symbol: '▲' },
  ],
  companies: [buildCompany(), buildSecondCompany()],
  flow: {
    numORs: 2,
  },
  activeCycle: {
    currentOR: 1,
    companyOrder: ['c1', 'c2'],
    selectedCompanyId: 'c1',
    completedCompanyIdsByOR: {
      1: [],
      2: [],
    },
  },
  handleMoveOrderUp: vi.fn(),
  handleMoveOrderDown: vi.fn(),
  handleRebalanceRemaining: vi.fn(),
  handleMarkCompanyDone: vi.fn(),
  handleORRevenueChange: vi.fn(),
  handleAddTrain: vi.fn(),
  handleUpdateTrainStops: vi.fn(),
  handleClearTrain: vi.fn(),
  handleDeleteTrain: vi.fn(),
  handleSetTrainRevenueToCurrentOR: vi.fn(),
  handleStartNextCycle: vi.fn(),
  ...overrides,
});

describe('OrRoundView OR revenue draft', () => {
  test('空欄 blur は OR収益を更新しない', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<OrRoundView {...props} />);

    const input = screen.getByRole('spinbutton', { name: 'Co1の現在OR1収益' });
    await user.clear(input);
    await user.tab();

    expect(props.handleORRevenueChange).not.toHaveBeenCalled();
  });

  test('Enter で数値を確定すると OR収益を更新する', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<OrRoundView {...props} />);

    const input = screen.getByRole('spinbutton', { name: 'Co1の現在OR1収益' });
    await user.clear(input);
    await user.type(input, '250');
    await user.keyboard('{Enter}');

    expect(props.handleORRevenueChange).toHaveBeenCalledWith('c1', 1, 250);
  });

  test('別企業の詳細を開くとその企業だけ詳細表示になる', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<OrRoundView {...props} />);

    expect(screen.getByText('実行企業: Co1')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '詳細を開く' })[0]);

    expect(screen.getByText('実行企業: 会社B')).toBeInTheDocument();
    expect(screen.queryByText('実行企業: Co1')).not.toBeInTheDocument();
  });

  test('会社カードと配当行に色アクセントを表示する', () => {
    const props = buildProps();
    render(<OrRoundView {...props} />);

    expect(screen.getByRole('heading', { name: 'Co1' }).closest('article')).toHaveClass(
      'border-l-4',
      'border-l-red-500'
    );
    expect(screen.getByText('● Alice (60%)').closest('span')).toHaveClass(
      'border-l-4',
      'border-l-emerald-300'
    );
  });
});
