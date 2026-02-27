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
  stockHoldings: [],
  treasuryStockPercentage: 0,
  orRevenues: [
    { orNum: 1, revenue: 100 },
    { orNum: 2, revenue: 0 },
  ],
});

const buildProps = (overrides = {}) => ({
  players: [],
  companies: [buildCompany()],
  flow: {
    numORs: 2,
  },
  activeCycle: {
    currentOR: 1,
    companyOrder: ['c1'],
    selectedCompanyId: 'c1',
    completedCompanyIdsByOR: {
      1: [],
      2: [],
    },
  },
  handleSelectCompany: vi.fn(),
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

    const input = screen.getByRole('spinbutton', { name: /OR1/ });
    await user.clear(input);
    await user.tab();

    expect(props.handleORRevenueChange).not.toHaveBeenCalled();
  });

  test('Enter で数値を確定すると OR収益を更新する', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<OrRoundView {...props} />);

    const input = screen.getByRole('spinbutton', { name: /OR1/ });
    await user.clear(input);
    await user.type(input, '250');
    await user.keyboard('{Enter}');

    expect(props.handleORRevenueChange).toHaveBeenCalledWith('c1', 1, 250);
  });
});
