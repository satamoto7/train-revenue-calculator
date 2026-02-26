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

const setCompanyHolding = async (user, companyName, percentage) => {
  const input = screen.getByLabelText(`${companyName}のPlayer A保有率`);
  await user.clear(input);
  await user.type(input, `${percentage}`);
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
  test('初期表示では未入力企業が未設立としてチェックされる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);

    expect(screen.getByRole('checkbox', { name: 'Co1を未設立として扱う' })).toBeChecked();
  });

  test('株式入力をすると未設立チェックが自動で外れる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await setCompanyHolding(user, 'Co1', 10);

    expect(screen.getByRole('checkbox', { name: 'Co1を未設立として扱う' })).not.toBeChecked();
  });

  test('株数入力は10刻みを基本にしつつ自由入力できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);

    const input = screen.getByLabelText('Co1のPlayer A保有率');
    expect(input).toHaveAttribute('step', '10');

    await user.clear(input);
    await user.type(input, '7');

    expect(input).toHaveValue(7);
    expect(screen.getByRole('checkbox', { name: 'Co1を未設立として扱う' })).not.toBeChecked();
  });

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
  test('列車の収益地点にサンプル値と自由入力を追加できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await setCompanyHolding(user, 'Co1', 10);
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));

    await user.click(screen.getByRole('button', { name: '列車追加' }));
    await user.click(screen.getByRole('button', { name: '列車1に10を追加' }));

    expect(screen.getByRole('spinbutton', { name: '列車1の地点1' })).toHaveValue(10);

    const customInput = screen.getByRole('spinbutton', { name: '列車1のカスタム収益値' });
    await user.type(customInput, '35');
    await user.click(screen.getByRole('button', { name: '列車1にカスタム値を追加' }));

    expect(screen.getByRole('spinbutton', { name: '列車1の地点2' })).toHaveValue(35);
  });

  test('列車地点を10刻みで増減でき、0未満にはならない', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await setCompanyHolding(user, 'Co1', 10);
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));

    await user.click(screen.getByRole('button', { name: '列車追加' }));
    await user.click(screen.getByRole('button', { name: '列車1に10を追加' }));

    const stop1Input = screen.getByRole('spinbutton', { name: '列車1の地点1' });
    expect(stop1Input).toHaveValue(10);

    await user.click(screen.getByRole('button', { name: '列車1の地点1を+10' }));
    expect(stop1Input).toHaveValue(20);

    await user.click(screen.getByRole('button', { name: '列車1の地点1を-10' }));
    expect(stop1Input).toHaveValue(10);

    await user.click(screen.getByRole('button', { name: '列車1の地点1を-10' }));
    await user.click(screen.getByRole('button', { name: '列車1の地点1を-10' }));
    expect(stop1Input).toHaveValue(0);
  });

  test('地点削除ボタンは×表示でアクセシブル名を持ち、押下で対象地点を削除できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await setCompanyHolding(user, 'Co1', 10);
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));

    await user.click(screen.getByRole('button', { name: '列車追加' }));
    await user.click(screen.getByRole('button', { name: '列車1に10を追加' }));
    await user.click(screen.getByRole('button', { name: '列車1に20を追加' }));

    const deleteStopButton = screen.getByRole('button', { name: '列車1の地点1を削除' });
    expect(deleteStopButton).toHaveTextContent('×');

    await user.click(deleteStopButton);

    expect(screen.queryByRole('spinbutton', { name: '列車1の地点2' })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: '列車1の地点1' })).toHaveValue(20);
  });

  test('OR収益を10刻みボタンで増減できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await setCompanyHolding(user, 'Co1', 10);
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));

    const or1Input = screen.getByRole('spinbutton', { name: 'OR1' });
    expect(or1Input).toHaveValue(0);

    await user.click(screen.getByRole('button', { name: 'OR1を+10' }));
    expect(or1Input).toHaveValue(10);

    await user.click(screen.getByRole('button', { name: 'OR1を+10' }));
    expect(or1Input).toHaveValue(20);

    await user.click(screen.getByRole('button', { name: 'OR1を-10' }));
    expect(or1Input).toHaveValue(10);

    await user.click(screen.getByRole('button', { name: 'OR1を-10' }));
    await user.click(screen.getByRole('button', { name: 'OR1を-10' }));
    expect(or1Input).toHaveValue(0);
  });

  test('企業完了後は順序変更がロックされる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await setCompanyHolding(user, 'Co1', 10);
    await setCompanyHolding(user, 'Co2', 10);
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
    await setCompanyHolding(user, 'Co1', 10);
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));
    await user.click(screen.getByRole('button', { name: 'この企業を完了' }));

    expect(screen.getByRole('button', { name: '次SR開始' })).toBeInTheDocument();
  });

  test('未設立にした企業はORで選択不可になり進捗対象から除外される', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await setCompanyHolding(user, 'Co1', 10);
    await setCompanyHolding(user, 'Co2', 10);
    await user.click(screen.getByRole('checkbox', { name: 'Co2を未設立として扱う' }));
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));

    expect(screen.getByText('進捗: 0 / 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Co2.*未設立/ })).toBeDisabled();
  });

  test('全社未設立でORに進むと警告のみ表示される', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    await user.click(screen.getByRole('button', { name: 'SR完了してORへ' }));

    expect(
      screen.getByText('OR対象企業がありません。SRで未設立を解除してください。')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'この企業を完了' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '次SR開始' })).not.toBeInTheDocument();
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
    await setCompanyHolding(user, 'Co1', 10);
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

describe('全体リセット', () => {
  test('確認後に全データを初期状態へ戻す', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setupToStockRound(user);
    expect(screen.getByRole('heading', { name: 'SR株式入力' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全体リセット' }));
    expect(
      screen.getByText('全データをリセットしますか？この操作は取り消せません。')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'OK' }));

    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Player A')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Co1')).not.toBeInTheDocument();
    expect(screen.getAllByText('未登録です。')).toHaveLength(2);
  });
});
