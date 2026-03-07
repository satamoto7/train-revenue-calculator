import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import HistoryView from './HistoryView';

const buildCycle = () => ({
  cycleNo: 1,
  isCompleted: false,
  gameConfigSnapshot: {
    bankPoolDividendRecipient: 'market',
    players: [
      {
        id: 'p1',
        displayName: 'Alice',
        name: 'Alice',
        color: '緑',
        symbol: '●',
        periodicIncome: 5,
      },
    ],
    companies: [
      {
        id: 'c1',
        displayName: '会社A',
        name: 'Co1',
        color: '赤',
        symbol: '○',
      },
    ],
  },
  operatingResultsSnapshot: {
    1: {
      c1: {
        companyId: 'c1',
        orNum: 1,
        revenue: 100,
        dividendMode: 'full',
        distributableRevenue: 100,
        companyAmount: 20,
        marketAmount: 10,
        playerPayouts: [{ playerId: 'p1', percentage: 60, amount: 60 }],
      },
    },
    2: {
      c1: {
        companyId: 'c1',
        orNum: 2,
        revenue: 50,
        dividendMode: 'withhold',
        distributableRevenue: 0,
        companyAmount: 50,
        marketAmount: 0,
        playerPayouts: [],
      },
    },
  },
});

describe('HistoryView', () => {
  test('Cycle 合計と OR 単位の表示対象を切り替えられる', async () => {
    const user = userEvent.setup();
    render(<HistoryView cycles={[buildCycle()]} numORs={2} />);

    expect(screen.getByLabelText('表示対象')).toHaveDisplayValue('Cycle 1');
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/配当 60 \/ 定期 10/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('表示対象'), '1-2');

    expect(screen.getByText('Cycle 1.OR2 (進行中)')).toBeInTheDocument();
    expect(screen.getByText(/配当 0 \/ 定期 5/)).toBeInTheDocument();
    expect(screen.getByText(/営業収益 50 \/ 市場受取 0/)).toBeInTheDocument();
    expect(screen.getByText(/OR2: 無配 \/ 配当原資 0/)).toBeInTheDocument();
  });
});
