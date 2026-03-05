import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import SummaryView from './SummaryView';

const buildCycle = () => ({
  cycleNo: 1,
  isCompleted: false,
  flowSnapshot: {
    bankPoolDividendRecipient: 'market',
  },
  playersSnapshot: [
    { id: 'p1', displayName: 'Alice', name: 'Alice', color: '緑', symbol: '●', periodicIncome: 5 },
    { id: 'p2', displayName: 'Bob', name: 'Bob', color: '黄', symbol: '▲', periodicIncome: 0 },
  ],
  companiesSnapshot: [
    {
      id: 'c1',
      name: 'Co1',
      displayName: '会社A',
      color: '赤',
      symbol: '○',
      periodicIncome: 20,
      stockHoldings: [
        { playerId: 'p1', percentage: 60 },
        { playerId: 'p2', percentage: 10 },
      ],
      treasuryStockPercentage: 30,
      bankPoolPercentage: 0,
      orRevenues: [
        { orNum: 1, revenue: 100 },
        { orNum: 2, revenue: 100 },
      ],
      orDividendModes: [
        { orNum: 1, mode: 'full' },
        { orNum: 2, mode: 'withhold' },
      ],
    },
  ],
});

describe('SummaryView', () => {
  test('記録された配当種別を使ってプレイヤー収入を計算する', () => {
    render(
      <SummaryView
        cycles={[buildCycle()]}
        selectedCycleNo={1}
        handleSelectCycle={() => {}}
        numORs={2}
        flow={{ bankPoolDividendRecipient: 'market' }}
      />
    );

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'li' &&
          element.textContent?.includes('Alice') &&
          element.textContent?.includes('70')
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'li' &&
          element.textContent?.includes('Bob') &&
          element.textContent?.includes('10')
      )
    ).toBeInTheDocument();
  });

  test('企業サマリーに配当種別と会社受取合計を表示する', () => {
    render(
      <SummaryView
        cycles={[buildCycle()]}
        selectedCycleNo={1}
        handleSelectCycle={() => {}}
        numORs={2}
        flow={{ bankPoolDividendRecipient: 'market' }}
      />
    );

    expect(screen.getByText('OR1: 100(配), OR2: 100(無) / 定期: 20 x 2')).toBeInTheDocument();
    expect(screen.getByText('会社受取 170 / 市場受取 0')).toBeInTheDocument();
  });
});
