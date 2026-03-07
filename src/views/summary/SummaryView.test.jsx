import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import SummaryView from './SummaryView';

const buildCycle = () => ({
  cycleNo: 1,
  isCompleted: false,
  flowSnapshot: {
    bankPoolDividendRecipient: 'market',
  },
  playersSnapshot: [
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
  test('表示対象にサイクル合計と各ORを並べる', () => {
    render(
      <SummaryView
        cycles={[buildCycle()]}
        selectedCycleNo={1}
        handleSelectCycle={() => {}}
        numORs={2}
        flow={{ bankPoolDividendRecipient: 'market' }}
      />
    );

    const select = screen.getByLabelText('表示対象');
    expect(select).toHaveDisplayValue('OR1');
    expect(screen.getByRole('option', { name: 'OR1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'OR1.1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'OR1.2' })).toBeInTheDocument();
  });

  test('サイクル合計ではプレイヤーと企業の受取総額を表示する', () => {
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
          element.textContent?.includes('70') &&
          element.textContent?.includes('配当 60 / 定期 10')
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'li' &&
          element.textContent?.includes('会社A') &&
          element.textContent?.includes('170') &&
          element.textContent?.includes('営業収益 200 / 定期 40 / 市場受取 0') &&
          element.textContent?.includes('OR1.1 配:50 / OR1.2 無:120')
      )
    ).toBeInTheDocument();
  });

  test('OR個別表示では途中経過の受取額を確認できる', async () => {
    const user = userEvent.setup();
    const handleSelectCycle = vi.fn();

    render(
      <SummaryView
        cycles={[buildCycle()]}
        selectedCycleNo={1}
        handleSelectCycle={handleSelectCycle}
        numORs={2}
        flow={{ bankPoolDividendRecipient: 'market' }}
      />
    );

    await user.selectOptions(screen.getByLabelText('表示対象'), '1-2');

    expect(handleSelectCycle).toHaveBeenCalledWith(1);
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'p' && element.textContent?.trim() === 'OR1.2'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'li' &&
          element.textContent?.includes('Alice') &&
          element.textContent?.includes('5') &&
          element.textContent?.includes('配当 0 / 定期 5')
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'li' &&
          element.textContent?.includes('会社A') &&
          element.textContent?.includes('120') &&
          element.textContent?.includes('営業収益 100 / 定期 20 / 市場受取 0') &&
          element.textContent?.includes('配当種別: 無配')
      )
    ).toBeInTheDocument();
  });
});
