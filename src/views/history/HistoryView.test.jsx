import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import HistoryView from './HistoryView';

const buildCycle = () => ({
  cycleNo: 1,
  isCompleted: false,
  gameConfigSnapshot: {
    numORs: 2,
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
      {
        id: 'p2',
        displayName: 'Bob',
        name: 'Bob',
        color: '黄',
        symbol: '▲',
        periodicIncome: 0,
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
        playerPayouts: [
          { playerId: 'p1', percentage: 60, amount: 60 },
          { playerId: 'p2', percentage: 10, amount: 10 },
        ],
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

const buildSecondCycle = () => ({
  cycleNo: 2,
  isCompleted: true,
  gameConfigSnapshot: {
    numORs: 2,
    bankPoolDividendRecipient: 'company',
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
        revenue: 180,
        dividendMode: 'half',
        distributableRevenue: 90,
        companyAmount: 95,
        marketAmount: 0,
        playerPayouts: [{ playerId: 'p1', percentage: 60, amount: 90 }],
      },
    },
    2: {
      c1: {
        companyId: 'c1',
        orNum: 2,
        revenue: 220,
        dividendMode: 'full',
        distributableRevenue: 220,
        companyAmount: 0,
        marketAmount: 20,
        playerPayouts: [{ playerId: 'p1', percentage: 60, amount: 132 }],
      },
    },
  },
});

const buildThirdCycle = () => ({
  cycleNo: 3,
  isCompleted: true,
  gameConfigSnapshot: {
    numORs: 3,
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
        revenue: 90,
        dividendMode: 'full',
        distributableRevenue: 90,
        companyAmount: 0,
        marketAmount: 0,
        playerPayouts: [{ playerId: 'p1', percentage: 60, amount: 54 }],
      },
    },
    2: {
      c1: {
        companyId: 'c1',
        orNum: 2,
        revenue: 100,
        dividendMode: 'full',
        distributableRevenue: 100,
        companyAmount: 0,
        marketAmount: 0,
        playerPayouts: [{ playerId: 'p1', percentage: 60, amount: 60 }],
      },
    },
    3: {
      c1: {
        companyId: 'c1',
        orNum: 3,
        revenue: 110,
        dividendMode: 'full',
        distributableRevenue: 110,
        companyAmount: 0,
        marketAmount: 0,
        playerPayouts: [{ playerId: 'p1', percentage: 60, amount: 66 }],
      },
    },
  },
});

describe('HistoryView', () => {
  test('Cycle 合計と OR 単位の表示対象を切り替えられる', async () => {
    const user = userEvent.setup();
    render(<HistoryView cycles={[buildCycle()]} />);

    expect(screen.getByLabelText('表示対象')).toHaveDisplayValue('Cycle 1');
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/配当 60 \/ 定期 10/)).toBeInTheDocument();
    expect(screen.getByText(/配当 10 \/ 定期 0/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('表示対象'), '1-2');

    expect(screen.getByText('Cycle 1.OR2 (進行中)')).toBeInTheDocument();
    expect(screen.getByText(/配当 0 \/ 定期 5/)).toBeInTheDocument();
    expect(screen.getByText(/営業収益 50 \/ 市場受取 0/)).toBeInTheDocument();
    expect(screen.getByText(/OR2: 無配 \/ 配当原資 0/)).toBeInTheDocument();
  });

  test('スプレッドシート表示で全サイクルの OR 履歴を横持ち表示できる', async () => {
    const user = userEvent.setup();
    render(<HistoryView cycles={[buildCycle(), buildSecondCycle()]} />);

    await user.click(screen.getByRole('button', { name: 'スプレッドシート表示' }));

    expect(screen.getByRole('heading', { name: 'スプレッドシート表示' })).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: '1.1' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: '1.2' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: '2.1' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: '2.2' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: /会社A/ })).toBeInTheDocument();
    expect(within(table).getByText('100')).toBeInTheDocument();
    expect(within(table).getByText('180')).toBeInTheDocument();
    expect(within(table).getByText('220')).toBeInTheDocument();
    expect(within(table).getByText('無配')).toBeInTheDocument();
    expect(within(table).getByText('半配当')).toBeInTheDocument();
    expect(within(table).getByText('人 70 / 会 20 / 市 10')).toBeInTheDocument();
    expect(within(table).getByText('原 0 / 留 50')).toBeInTheDocument();
    expect(within(table).getByText('人 90 / 会 95 / 市 0')).toBeInTheDocument();
    expect(within(table).getByText('原 90 / 留 90')).toBeInTheDocument();
    expect(within(table).getByText('Alice 60')).toBeInTheDocument();
    expect(within(table).getByText('Bob 10')).toBeInTheDocument();
    expect(within(table).getAllByText('プレイヤー配当なし').length).toBeGreaterThan(0);

    expect(screen.getByRole('heading', { name: 'プレイヤー受取詳細' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '企業受取詳細' })).toBeInTheDocument();
  });

  test('サイクルごとに異なる OR 数を表示対象とスプレッドシートへ反映する', async () => {
    const user = userEvent.setup();
    render(<HistoryView cycles={[buildCycle(), buildThirdCycle()]} />);

    await user.selectOptions(screen.getByLabelText('表示対象'), '3-total');

    expect(screen.getByLabelText('表示対象')).toHaveDisplayValue('Cycle 3');
    expect(screen.getByText(/配当 180 \/ 定期 15/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'スプレッドシート表示' }));

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: '3.1' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: '3.2' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: '3.3' })).toBeInTheDocument();
    expect(screen.getByLabelText('表示対象')).toHaveDisplayValue('Cycle 3');
  });
});
