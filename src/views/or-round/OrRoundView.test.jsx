import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import OrRoundView from './OrRoundView';

const buildCompany = (overrides = {}) => ({
  id: 'c1',
  name: 'Co1',
  displayName: '',
  genericIndex: 1,
  color: '赤',
  symbol: '○',
  isUnestablished: false,
  trains: [],
  stockHoldings: [{ playerId: 'p1', percentage: 60 }],
  treasuryStockPercentage: 10,
  bankPoolPercentage: 20,
  periodicIncome: 0,
  orDividendModes: [
    { orNum: 1, mode: 'full' },
    { orNum: 2, mode: 'full' },
  ],
  orRevenues: [
    { orNum: 1, revenue: 100 },
    { orNum: 2, revenue: 0 },
  ],
  ...overrides,
});

const buildSecondCompany = (overrides = {}) => ({
  id: 'c2',
  name: 'Co2',
  displayName: '会社B',
  genericIndex: 2,
  color: '青',
  symbol: '△',
  isUnestablished: false,
  trains: [],
  stockHoldings: [],
  treasuryStockPercentage: 10,
  bankPoolPercentage: 20,
  periodicIncome: 0,
  orDividendModes: [
    { orNum: 1, mode: 'full' },
    { orNum: 2, mode: 'full' },
  ],
  orRevenues: [
    { orNum: 1, revenue: 50 },
    { orNum: 2, revenue: 10 },
  ],
  ...overrides,
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
  handlePlayerPeriodicIncomeChange: vi.fn(),
  handleCompanyPeriodicIncomeChange: vi.fn(),
  handleSetORDividendMode: vi.fn(),
  ...overrides,
});

const getFocusPanel = () => {
  const label = screen.getByText('現在操作中の企業');
  const article = label.closest('article');
  if (!article) throw new Error('focus panel not found');
  return article;
};

const getQueueCard = (companyName) => {
  const queueSection = screen.getByText('企業キュー').closest('section');
  if (!queueSection) throw new Error('queue section not found');
  const heading = within(queueSection).getByRole('heading', { name: companyName });
  const article = heading.closest('article');
  if (!article) throw new Error(`queue card not found: ${companyName}`);
  return article;
};

describe('OrRoundView focused OR flow', () => {
  test('初期表示で一社集中レイアウトを表示する', () => {
    const props = buildProps();
    render(<OrRoundView {...props} />);

    expect(screen.getByText('現在操作中の企業')).toBeInTheDocument();
    expect(screen.getByText('企業キュー')).toBeInTheDocument();
    expect(within(getFocusPanel()).getByRole('heading', { name: 'Co1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'この会社を開く' })).toBeInTheDocument();
    expect(screen.getByText('補助設定: プレイヤー定期収入').closest('details')).not.toHaveAttribute(
      'open'
    );
  });

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

  test('前OR値は自動コピーされず、セットボタンから取り込める', async () => {
    const user = userEvent.setup();
    const props = buildProps({
      activeCycle: {
        currentOR: 2,
        companyOrder: ['c1', 'c2'],
        selectedCompanyId: 'c1',
        completedCompanyIdsByOR: {
          1: [],
          2: [],
        },
      },
    });
    render(<OrRoundView {...props} />);

    expect(screen.getByRole('spinbutton', { name: 'Co1の現在OR2収益' })).toHaveValue(0);

    await user.click(screen.getByRole('button', { name: 'Co1の前回OR1収益100を現在OR2へセット' }));

    expect(props.handleORRevenueChange).toHaveBeenCalledWith('c1', 2, 100);
  });

  test('現在OR収益のクイック調整ボタンで増減できる', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<OrRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: 'Co1の現在OR1収益を-20' }));
    await user.click(screen.getByRole('button', { name: 'Co1の現在OR1収益を+20' }));

    expect(props.handleORRevenueChange).toHaveBeenNthCalledWith(1, 'c1', 1, 80);
    expect(props.handleORRevenueChange).toHaveBeenNthCalledWith(2, 'c1', 1, 120);
  });

  test('企業キューから別企業へ切り替える', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<OrRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: 'この会社を開く' }));

    expect(within(getFocusPanel()).getByRole('heading', { name: '会社B' })).toBeInTheDocument();
    expect(within(getFocusPanel()).queryByRole('heading', { name: 'Co1' })).not.toBeInTheDocument();
  });

  test('完了済み企業も開き直して進行中サイクル内で修正できる', async () => {
    const user = userEvent.setup();
    const props = buildProps({
      activeCycle: {
        currentOR: 1,
        companyOrder: ['c1', 'c2'],
        selectedCompanyId: 'c2',
        completedCompanyIdsByOR: {
          1: ['c1'],
          2: [],
        },
      },
    });
    render(<OrRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: '完了済みを開く' }));

    const panel = within(getFocusPanel());
    expect(panel.getByRole('heading', { name: 'Co1' })).toBeInTheDocument();
    expect(panel.getByText('完了済みを修正中')).toBeInTheDocument();
    expect(panel.getByText(/前OR分は下の補助設定から直せます/)).toBeInTheDocument();
    expect(
      screen.getByText('補助設定 / 詳細（前OR修正はこちら）').closest('details')
    ).toHaveAttribute('open');

    const input = panel.getByRole('spinbutton', { name: 'Co1の現在OR1収益' });
    await user.clear(input);
    await user.type(input, '130');
    await user.keyboard('{Enter}');

    expect(props.handleORRevenueChange).toHaveBeenCalledWith('c1', 1, 130);
  });

  test('通常の完了操作では次の未処理企業へ進み、完了直後に修正モードへ留まらない', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    const { rerender } = render(<OrRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: 'この企業を完了' }));
    expect(props.handleMarkCompanyDone).toHaveBeenCalledWith('c1');

    rerender(
      <OrRoundView
        {...buildProps({
          activeCycle: {
            currentOR: 1,
            companyOrder: ['c1', 'c2'],
            selectedCompanyId: 'c2',
            completedCompanyIdsByOR: {
              1: ['c1'],
              2: [],
            },
          },
        })}
      />
    );

    expect(within(getFocusPanel()).getByRole('heading', { name: '会社B' })).toBeInTheDocument();
    expect(screen.queryByText('完了済みを修正中')).not.toBeInTheDocument();
  });

  test('最終OR完了後も同一サイクル内なら完了済み企業を確認できる', async () => {
    const user = userEvent.setup();
    const props = buildProps({
      activeCycle: {
        currentOR: 2,
        companyOrder: ['c1', 'c2'],
        selectedCompanyId: 'c2',
        completedCompanyIdsByOR: {
          1: ['c1', 'c2'],
          2: ['c1', 'c2'],
        },
      },
    });
    render(<OrRoundView {...props} />);

    expect(screen.getByText('このORの処理は完了しています')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '次SR開始' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '完了済みを開く' })[0]);

    expect(within(getFocusPanel()).getByRole('heading', { name: 'Co1' })).toBeInTheDocument();
    expect(within(getFocusPanel()).getByText('完了済みを修正中')).toBeInTheDocument();
  });

  test('最終OR完了直後は確認画面へ戻り、必要なら完了済み企業を開ける', () => {
    const props = buildProps({
      activeCycle: {
        currentOR: 2,
        companyOrder: ['c1', 'c2'],
        selectedCompanyId: 'c2',
        completedCompanyIdsByOR: {
          1: ['c1', 'c2'],
          2: ['c1', 'c2'],
        },
      },
    });
    render(<OrRoundView {...props} />);

    expect(screen.getByText('このORの処理は完了しています')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '次SR開始' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '完了済みを開く' })).toHaveLength(2);
  });

  test('ORが進んだら選択中企業を先頭企業へ戻す', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    const { rerender } = render(<OrRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: 'この会社を開く' }));
    expect(within(getFocusPanel()).getByRole('heading', { name: '会社B' })).toBeInTheDocument();

    rerender(
      <OrRoundView
        {...buildProps({
          activeCycle: {
            currentOR: 2,
            companyOrder: ['c1', 'c2'],
            selectedCompanyId: 'c1',
            completedCompanyIdsByOR: {
              1: ['c1', 'c2'],
              2: [],
            },
          },
        })}
      />
    );

    expect(within(getFocusPanel()).getByRole('heading', { name: 'Co1' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Co1の現在OR2収益' })).toBeInTheDocument();
  });

  test('配当種別を詳細展開なしで変更できる', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<OrRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: '無配' }));

    expect(props.handleSetORDividendMode).toHaveBeenCalledWith('c1', 1, 'withhold');
  });

  test('収益配分プレビューを折りたたみできる', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<OrRoundView {...props} />);

    const summary = screen.getByText('OR1 収益配分プレビュー（折りたたみ）');
    const details = summary.closest('details');
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute('open');

    await user.click(summary);

    expect(details).not.toHaveAttribute('open');
  });

  test('市場株の配当受取先が会社設定なら表示も会社になる', () => {
    const props = buildProps({
      flow: {
        numORs: 2,
        bankPoolDividendRecipient: 'company',
      },
    });
    render(<OrRoundView {...props} />);

    expect(screen.getByText(/市場株の配当受取先: 会社/)).toBeInTheDocument();
  });

  test('列車地点編集では OR収益を更新せず、反映ボタンでのみ反映する', async () => {
    const user = userEvent.setup();
    const props = buildProps({
      companies: [
        buildCompany({
          trains: [{ id: 't1', stops: [40, 50] }],
        }),
        buildSecondCompany(),
      ],
    });
    render(<OrRoundView {...props} />);

    await user.click(screen.getByRole('button', { name: '列車1の地点1を+10' }));

    expect(props.handleUpdateTrainStops).toHaveBeenCalledWith('c1', 't1', [50, 50]);
    expect(props.handleORRevenueChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '列車計算値 90 を現在OR1へ反映' }));

    expect(props.handleSetTrainRevenueToCurrentOR).toHaveBeenCalledWith('c1');
  });

  test('配分プレビューにプレイヤー配当を表示する', () => {
    const props = buildProps();
    render(<OrRoundView {...props} />);

    const panel = within(getFocusPanel());
    expect(panel.getByText('配当原資 100 / 会社留保 0 / 定期会社受取 0')).toBeInTheDocument();
    expect(panel.getByText(/市場株の配当受取先: 市場/)).toBeInTheDocument();
    expect(panel.getByText('● Alice (60%)').closest('span')).toHaveClass(
      'border-l-4',
      'border-l-emerald-300'
    );
  });

  test('会社アクセント色をフォーカスパネルとキューに表示する', () => {
    const props = buildProps();
    render(<OrRoundView {...props} />);

    expect(getFocusPanel()).toHaveClass('border-l-4', 'border-l-red-500');
    expect(getQueueCard('会社B')).toHaveClass('border-l-4', 'border-l-blue-500');
  });
});
