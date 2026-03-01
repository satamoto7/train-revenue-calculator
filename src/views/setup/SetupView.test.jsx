import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import SetupView from './SetupView';

const baseProps = () => ({
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
  setupLocked: false,
  handleAddMultiplePlayers: vi.fn(),
  handleDeletePlayer: vi.fn(),
  handleEditPlayerName: vi.fn(),
  handleEditPlayerSymbol: vi.fn(),
  handleEditPlayerColor: vi.fn(),
  handleAddMultipleCompanies: vi.fn(),
  handleDeleteCompany: vi.fn(),
  handleEditCompanyName: vi.fn(),
  handleEditCompanySymbol: vi.fn(),
  handleEditCompanyColor: vi.fn(),
  handleSetNumORs: vi.fn(),
  handleSetHasIpoShares: vi.fn(),
  handleStartGame: vi.fn(),
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
});
