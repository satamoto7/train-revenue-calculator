import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from './App';
import { APP_SCHEMA_VERSION, APP_STORAGE_KEY } from './storage/appStorage';

if (!window.crypto?.randomUUID) {
  let counter = 0;
  Object.defineProperty(window, 'crypto', {
    value: {
      ...window.crypto,
      randomUUID: () => `test-uuid-${++counter}`,
    },
  });
}

beforeEach(() => {
  localStorage.clear();
});

const setupToStockRound = async (user) => {
  await user.click(screen.getByRole('button', { name: 'プレイヤーを一括追加' }));
  await user.click(screen.getByRole('button', { name: '企業を一括追加' }));
  await user.click(screen.getByRole('button', { name: 'ゲーム開始（SRへ）' }));
};

describe('新フロー表示', () => {
  test('初期表示は設定ステップで、4ステップナビが表示される', () => {
    render(<App />);

    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('button', { name: '設定' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'SR株式' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'OR実行' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'サマリー' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument();
  });

  test('ゲーム開始後は設定編集が無効化される', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await user.click(screen.getByRole('button', { name: '設定' }));

    expect(screen.getByText(/SR開始後は設定変更を禁止しています/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'プレイヤーを一括追加' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '企業を一括追加' })).toBeDisabled();
  });
});

describe('SR株式', () => {
  test('IPOなしではバンクが自動計算表示になる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText('IPO株の有無'), 'no');
    await setupToStockRound(user);

    expect(screen.queryByLabelText(/バンクプール/)).not.toBeInTheDocument();
    expect(screen.getAllByText('100').length).toBeGreaterThan(0);
  });

  test('合計異常で ! が表示され、警告のままORへ進める', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);

    const playerInput = screen.getByLabelText('Co1のPlayer A保有率');
    const treasuryInput = screen.getByLabelText('Co1の自社株');

    await user.clear(playerInput);
    await user.type(playerInput, '90');
    await user.clear(treasuryInput);
    await user.type(treasuryInput, '20');

    await user.click(screen.getByRole('button', { name: '妥当性チェック' }));
    expect(screen.getByTitle('配分合計が100%を超えています。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));
    expect(screen.getByRole('heading', { name: 'OR実行' })).toBeInTheDocument();
  });
});

describe('OR実行', () => {
  test('企業完了後は順序変更がロックされる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));

    const upButtonsBefore = screen.getAllByRole('button', { name: '↑' });
    expect(upButtonsBefore.some((button) => !button.hasAttribute('disabled'))).toBe(true);

    await user.click(screen.getByRole('button', { name: 'この企業を完了' }));

    const upButtonsAfter = screen.getAllByRole('button', { name: '↑' });
    expect(upButtonsAfter.every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.getByRole('button', { name: '順番を再調整' })).toBeInTheDocument();
  });

  test('全OR完了で次SR開始が表示される', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText('運営ラウンド(OR)数'), '1');
    await user.selectOptions(screen.getByLabelText('追加企業数'), '1');

    await user.click(screen.getByRole('button', { name: 'プレイヤーを一括追加' }));
    await user.click(screen.getByRole('button', { name: '企業を一括追加' }));
    await user.click(screen.getByRole('button', { name: 'ゲーム開始（SRへ）' }));
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));
    await user.click(screen.getByRole('button', { name: 'この企業を完了' }));

    expect(screen.getByRole('button', { name: '次SR開始' })).toBeInTheDocument();
  });
});

describe('サイクルと保存', () => {
  test('次SR開始でサイクル履歴を保持し、サマリーで選択できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText('運営ラウンド(OR)数'), '1');
    await user.selectOptions(screen.getByLabelText('追加企業数'), '1');

    await user.click(screen.getByRole('button', { name: 'プレイヤーを一括追加' }));
    await user.click(screen.getByRole('button', { name: '企業を一括追加' }));
    await user.click(screen.getByRole('button', { name: 'ゲーム開始（SRへ）' }));
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));
    await user.click(screen.getByRole('button', { name: 'この企業を完了' }));
    await user.click(screen.getByRole('button', { name: '次SR開始' }));
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await user.click(screen.getByRole('button', { name: 'サマリー' }));

    const selector = screen.getByLabelText('表示サイクル');
    expect(
      within(selector).getByRole('option', { name: /サイクル 1 \(完了\)/ })
    ).toBeInTheDocument();
    expect(
      within(selector).getByRole('option', { name: /サイクル 2 \(進行中\)/ })
    ).toBeInTheDocument();
    expect(selector).toHaveValue('1');
  });

  test('保存データは schemaVersion=4 で書き込まれる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'プレイヤーを一括追加' }));

    const savedRaw = localStorage.getItem(APP_STORAGE_KEY);
    const saved = JSON.parse(savedRaw);

    expect(saved.schemaVersion).toBe(APP_SCHEMA_VERSION);
    expect(saved.flow.step).toBe('setup');
  });
});
