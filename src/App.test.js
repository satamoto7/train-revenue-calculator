import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from './App';

// crypto.randomUUID のポリフィル（Jest環境用）
if (!globalThis.crypto?.randomUUID) {
  let counter = 0;
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      ...globalThis.crypto,
      randomUUID: () => `test-uuid-${++counter}`,
    },
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('アプリ初期表示', () => {
  test('アプリタイトルが表示される', () => {
    render(<App />);
    expect(screen.getByText('18xx 収益計算補助')).toBeInTheDocument();
  });

  test('3つのナビゲーションタブが表示される', () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('サマリー')).toBeInTheDocument();
    expect(within(nav).getByText('全般管理')).toBeInTheDocument();
    expect(within(nav).getByText('企業詳細')).toBeInTheDocument();
  });

  test('データがない場合は管理画面が初期表示される', () => {
    render(<App />);
    expect(screen.getByText('ゲーム設定')).toBeInTheDocument();
    expect(screen.getByText('プレイヤー管理')).toBeInTheDocument();
  });

  test('データがある場合はサマリー画面が初期表示される', () => {
    const initialData = {
      players: [{ id: 'p1', name: 'テスト' }],
      companies: [{ id: 'c1', name: 'テスト企業', trains: [], stockHoldings: [], orRevenues: [{ orNum: 1, revenue: 0 }, { orNum: 2, revenue: 0 }], treasuryStockPercentage: 0 }],
      selectedCompanyId: null,
      numORs: 2,
    };
    localStorage.setItem('trainRevenue_18xx_data', JSON.stringify(initialData));
    render(<App />);
    expect(screen.getByText(/サマリー \(全/)).toBeInTheDocument();
  });
});

describe('画面遷移', () => {
  test('全般管理タブをクリックすると管理画面に遷移する', async () => {
    const user = userEvent.setup();
    // Start from summary view with pre-seeded data
    const initialData = {
      players: [{ id: 'p1', name: 'テスト' }],
      companies: [{ id: 'c1', name: 'テスト企業', trains: [], stockHoldings: [], orRevenues: [{ orNum: 1, revenue: 0 }, { orNum: 2, revenue: 0 }], treasuryStockPercentage: 0 }],
      selectedCompanyId: null,
      numORs: 2,
    };
    localStorage.setItem('trainRevenue_18xx_data', JSON.stringify(initialData));
    render(<App />);

    const nav = screen.getByRole('navigation');
    await user.click(within(nav).getByText('全般管理'));

    expect(screen.getByText('ゲーム設定')).toBeInTheDocument();
    expect(screen.getByText('プレイヤー管理')).toBeInTheDocument();
    expect(screen.getByText('企業管理')).toBeInTheDocument();
  });

  test('企業詳細タブをクリックすると企業詳細画面に遷移する', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nav = screen.getByRole('navigation');
    await user.click(within(nav).getByText('企業詳細'));

    expect(screen.getByText('企業が選択されていません。管理画面で企業を選択するか、新しい企業を追加してください。')).toBeInTheDocument();
  });
});

describe('プレイヤー管理', () => {
  test('プレイヤーを一括追加できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Already on management view for empty state
    await user.click(screen.getByText('プレイヤーを一括追加'));

    expect(screen.getByText('プレイヤー 1')).toBeInTheDocument();
    expect(screen.getByText('プレイヤー 2')).toBeInTheDocument();
  });
});

describe('企業管理', () => {
  test('企業を一括追加できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Already on management view for empty state
    await user.click(screen.getByText('企業を一括追加 (色名)'));

    expect(screen.getByText('赤会社')).toBeInTheDocument();
    expect(screen.getByText('青会社')).toBeInTheDocument();
  });
});

describe('localStorage永続化', () => {
  test('データがlocalStorageに保存される', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Already on management view for empty state
    await user.click(screen.getByText('プレイヤーを一括追加'));

    const savedData = JSON.parse(localStorage.getItem('trainRevenue_18xx_data'));
    expect(savedData).toBeTruthy();
    expect(savedData.players).toHaveLength(2);
    expect(savedData.schemaVersion).toBe(1);
  });

  test('localStorageからデータが復元される', async () => {
    const user = userEvent.setup();
    const initialData = {
      players: [{ id: 'test-1', name: 'テストプレイヤー' }],
      companies: [],
      selectedCompanyId: null,
      numORs: 2,
    };
    localStorage.setItem('trainRevenue_18xx_data', JSON.stringify(initialData));

    render(<App />);

    const nav = screen.getByRole('navigation');
    await user.click(within(nav).getByText('全般管理'));
    expect(await screen.findByText('テストプレイヤー')).toBeInTheDocument();
  });
});

describe('アクセシビリティ', () => {
  test('モーダルにrole="dialog"が設定されている', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Already on management view for empty state
    await user.click(screen.getByText('プレイヤーを一括追加'));

    // プレイヤーを削除してモーダルを表示
    const deleteButtons = screen.getAllByTitle(/を削除/);
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);
      const dialog = screen.queryByRole('dialog');
      expect(dialog).toBeInTheDocument();
    }
  });
});
