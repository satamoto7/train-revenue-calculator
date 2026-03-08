import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import SetupView from './SetupView';

const baseProps = (overrides = {}) => ({
  players: [
    {
      id: 'p1',
      seatLabel: 'A',
      displayName: 'Player A',
      name: 'Player A',
      symbol: '●',
      color: '赤',
    },
  ],
  companies: [{ id: 'c1', displayName: '会社A', name: 'Co1', symbol: '○', color: '赤' }],
  numORs: 2,
  hasIpoShares: true,
  mergerRoundEnabled: false,
  bankPoolDividendRecipient: 'market',
  setupLocked: false,
  handleAddMultiplePlayers: vi.fn(),
  handleDeletePlayer: vi.fn(),
  handleEditPlayerName: vi.fn(),
  handleEditPlayerSymbol: vi.fn(),
  handleEditPlayerColor: vi.fn(),
  handleAddMultipleCompanies: vi.fn(),
  handleApplyCompanyTemplate: vi.fn(),
  handleDeleteCompany: vi.fn(),
  handleEditCompanyName: vi.fn(),
  handleEditCompanySymbol: vi.fn(),
  handleEditCompanyColor: vi.fn(),
  handleEditCompanyType: vi.fn(),
  handleSetNumORs: vi.fn(),
  handleSetHasIpoShares: vi.fn(),
  handleSetMergerRoundEnabled: vi.fn(),
  handleSetBankPoolDividendRecipient: vi.fn(),
  handleStartGame: vi.fn(),
  ...overrides,
});

describe('SetupView committed inputs', () => {
  test('プレイヤー名は composition 中に commit されない', async () => {
    const props = baseProps();
    render(<SetupView {...props} />);

    const input = screen.getByLabelText('プレイヤー「Player A」の名前');
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ぷ' } });
    fireEvent.blur(input);

    expect(props.handleEditPlayerName).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input);
    fireEvent.blur(input);

    expect(props.handleEditPlayerName).toHaveBeenCalledWith('p1', 'ぷ');
  });

  test('市場株の配当受取先を変更できる', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<SetupView {...props} />);

    await user.selectOptions(screen.getByLabelText('市場株の配当受取先'), 'company');

    expect(props.handleSetBankPoolDividendRecipient).toHaveBeenCalledWith('company');
  });

  test('企業テンプレートを選んで適用できる', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<SetupView {...props} />);

    await user.selectOptions(screen.getByLabelText('企業テンプレート'), '1830');
    await user.click(screen.getByRole('button', { name: '企業テンプレートを適用' }));

    expect(props.handleApplyCompanyTemplate).toHaveBeenCalledWith('1830');
  });

  test('major を含むテンプレート選択時は Merger Round 自動有効化の案内を出す', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<SetupView {...props} />);

    await user.selectOptions(screen.getByLabelText('企業テンプレート'), 'lost-atlas');

    expect(
      screen.getByText(
        'このテンプレートは major を含むため、適用時に Merger Round も自動で有効化します。'
      )
    ).toBeInTheDocument();
  });

  test('会社名は blur まで commit されない', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<SetupView {...props} />);

    const input = screen.getByLabelText('企業「会社A」の名前');
    await user.clear(input);
    await user.type(input, 'カ');

    expect(props.handleEditCompanyName).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(props.handleEditCompanyName).toHaveBeenCalledWith('c1', 'カ');
  });

  test('Merger Round 無効時は会社種別UIを表示しない', () => {
    const props = baseProps();
    render(<SetupView {...props} />);

    expect(screen.queryByLabelText('企業「会社A」の種別')).not.toBeInTheDocument();
  });

  test('Merger Round を有効にすると会社種別UIを表示する', async () => {
    const user = userEvent.setup();
    const props = baseProps({ mergerRoundEnabled: true });
    render(<SetupView {...props} />);

    expect(screen.getByLabelText('企業「会社A」の種別')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Merger Round'), 'enabled');

    expect(props.handleSetMergerRoundEnabled).toHaveBeenCalledWith(true);
  });

  test('setupLocked では企業テンプレート適用UIも無効化する', () => {
    const props = baseProps({ setupLocked: true });
    render(<SetupView {...props} />);

    expect(screen.getByLabelText('企業テンプレート')).toBeDisabled();
    expect(screen.getByRole('button', { name: '企業テンプレートを適用' })).toBeDisabled();
  });

  test('HEX のテンプレート色はマーカー風プレビューを表示する', () => {
    const props = baseProps({
      companies: [
        {
          id: 'c1',
          displayName: '会社A',
          name: 'Co1',
          symbol: '○',
          color: '#32763f',
        },
      ],
    });
    render(<SetupView {...props} />);

    expect(screen.getByLabelText('会社A のテンプレート色プレビュー')).toBeInTheDocument();
    expect(screen.getByLabelText('企業「会社A」の色')).toBeDisabled();
    expect(screen.getByRole('option', { name: 'テンプレート色 (保持のみ)' })).toBeDisabled();
  });
});
