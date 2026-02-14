import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('サマリー')).toBeInTheDocument();
    expect(screen.getByText('全般管理')).toBeInTheDocument();
    expect(screen.getByText('企業詳細')).toBeInTheDocument();
  });

  test('初期表示はサマリー画面', () => {
    render(<App />);
    expect(screen.getByText(/サマリー \(全/)).toBeInTheDocument();
  });
});

describe('画面遷移', () => {
  test('全般管理タブをクリックすると管理画面に遷移する', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText('全般管理'));

    expect(screen.getByText('ゲーム設定')).toBeInTheDocument();
    expect(screen.getByText('プレイヤー管理')).toBeInTheDocument();
    expect(screen.getByText('企業管理')).toBeInTheDocument();
  });

  test('企業詳細タブをクリックすると企業詳細画面に遷移する', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText('企業詳細'));

    expect(screen.getByText('企業が選択されていません。管理画面で企業を選択するか、新しい企業を追加してください。')).toBeInTheDocument();
  });
});

describe('プレイヤー管理', () => {
  test('プレイヤーを一括追加できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText('全般管理'));
    await user.click(screen.getByText('プレイヤーを一括追加'));

    expect(screen.getByText('プレイヤー 1')).toBeInTheDocument();
    expect(screen.getByText('プレイヤー 2')).toBeInTheDocument();
  });
});

describe('企業管理', () => {
  test('企業を一括追加できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText('全般管理'));
    await user.click(screen.getByText('企業を一括追加 (色名)'));

    expect(screen.getByText('赤会社')).toBeInTheDocument();
    expect(screen.getByText('青会社')).toBeInTheDocument();
  });
});

describe('localStorage永続化', () => {
  test('データがlocalStorageに保存される', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText('全般管理'));
    await user.click(screen.getByText('プレイヤーを一括追加'));

    const savedData = JSON.parse(localStorage.getItem('trainRevenue_18xx_data'));
    expect(savedData).toBeTruthy();
    expect(savedData.players).toHaveLength(2);
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

    await user.click(screen.getByText('全般管理'));
    expect(await screen.findByText('テストプレイヤー')).toBeInTheDocument();
  });
});

describe('アクセシビリティ', () => {
  test('モーダルにrole="dialog"が設定されている', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText('全般管理'));
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
