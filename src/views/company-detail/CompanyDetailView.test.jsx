import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import CompanyDetailView from './CompanyDetailView';

const buildCompany = () => ({
  id: 'c1',
  name: 'Co1',
  displayName: '',
  genericIndex: 1,
  color: '赤',
  symbol: '○',
  trains: [],
  stockHoldings: [],
  treasuryStockPercentage: 0,
  orRevenues: [
    { orNum: 1, revenue: 120 },
    { orNum: 2, revenue: 0 },
  ],
});

const buildProps = (overrides = {}) => {
  const selectedCompany = buildCompany();
  return {
    selectedCompany,
    companies: [selectedCompany],
    players: [],
    handleUpdateTrainStops: vi.fn(),
    handleClearTrain: vi.fn(),
    handleDeleteTrain: vi.fn(),
    handleAddNewTrainToCompany: vi.fn(),
    handleStockHoldingChange: vi.fn(),
    handleTreasuryStockChange: vi.fn(),
    handleORRevenueChange: vi.fn(),
    handleSetTrainRevenueToOR: vi.fn(),
    numORs: 2,
    handleSelectCompany: vi.fn(),
    handleEditCompanyName: vi.fn(),
    handleEditCompanySymbol: vi.fn(),
    handleEditCompanyColor: vi.fn(),
    ...overrides,
  };
};

describe('CompanyDetailView OR revenue draft', () => {
  test('空欄で blur しても OR収益は更新しない', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<CompanyDetailView {...props} />);

    const input = screen.getByRole('spinbutton', { name: /OR1:/ });
    await user.clear(input);
    await user.tab();

    expect(props.handleORRevenueChange).not.toHaveBeenCalled();
  });

  test('0 を明示入力して blur すると OR収益を更新する', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<CompanyDetailView {...props} />);

    const input = screen.getByRole('spinbutton', { name: /OR1:/ });
    await user.clear(input);
    await user.type(input, '0');
    await user.tab();

    expect(props.handleORRevenueChange).toHaveBeenCalledWith('c1', 1, 0);
  });
});
