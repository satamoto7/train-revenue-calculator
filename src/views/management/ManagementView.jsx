import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  COMPANY_COLOR_OPTIONS,
  COMPANY_SYMBOL_OPTIONS,
  PLAYER_COLOR_OPTIONS,
  PLAYER_SYMBOL_OPTIONS,
  getColorTextClass,
  getCompanyColor,
  getCompanyDisplayName,
  getCompanySymbol,
  getPlayerDisplayName,
  getPlayerShortLabel,
} from '../../lib/labels';

const ManagementView = ({
  players,
  handleAddMultiplePlayers,
  handleDeletePlayer,
  handleEditPlayerName,
  handleEditPlayerSymbol,
  handleEditPlayerColor,
  companies,
  handleAddMultipleCompanies,
  handleDeleteCompany,
  handleEditCompanySymbol,
  handleEditCompanyColor,
  handleSelectCompany,
  selectedCompanyId,
  numORs,
  setNumORs,
  handleResetAllORRevenues,
}) => {
  const [numPlayersToAdd, setNumPlayersToAdd] = useState(2);
  const [numCompaniesToAdd, setNumCompaniesToAdd] = useState(4);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingPlayerNameInput, setEditingPlayerNameInput] = useState('');

  const startEditPlayerName = (player) => {
    setEditingPlayerId(player.id);
    setEditingPlayerNameInput(getPlayerDisplayName(player));
  };
  const confirmEditPlayerName = () => {
    if (editingPlayerId && editingPlayerNameInput.trim()) {
      handleEditPlayerName(editingPlayerId, editingPlayerNameInput.trim());
    }
    setEditingPlayerId(null);
    setEditingPlayerNameInput('');
  };
  const cancelEditPlayerName = () => {
    setEditingPlayerId(null);
    setEditingPlayerNameInput('');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <SectionHeader size="page" className="mb-8 text-center text-brand-primary">
        全般管理
      </SectionHeader>

      <div className="mb-8 p-4 sm:p-6 bg-brand-accent-soft rounded-xl shadow-md border border-border-strong">
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          ゲーム設定
        </SectionHeader>
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <label htmlFor="numORs" className="font-medium text-text-secondary">
            運営ラウンド(OR)の数:
          </label>
          <select
            id="numORs"
            value={numORs}
            onChange={(e) => setNumORs(parseInt(e.target.value))}
            className="p-2 border border-border-subtle rounded-md shadow-sm"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}回
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-8 p-4 sm:p-6 bg-surface-elevated rounded-xl shadow-md border border-border-subtle">
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          プレイヤー管理
        </SectionHeader>
        <div className="flex flex-col sm:flex-row items-end gap-3 mb-6">
          <div>
            <label
              htmlFor="numPlayersToAdd"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              追加するプレイヤー数:
            </label>
            <select
              id="numPlayersToAdd"
              value={numPlayersToAdd}
              onChange={(e) => setNumPlayersToAdd(parseInt(e.target.value))}
              className="p-2 border border-border-subtle rounded-md shadow-sm"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}名
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={() => handleAddMultiplePlayers(numPlayersToAdd)}
            className="py-2.5 px-5"
          >
            プレイヤーを一括追加
          </Button>
        </div>
        {players.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-text-secondary mb-2">
              登録済みプレイヤー (クリックで名前編集):
            </h4>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-1 bg-surface-elevated px-3 py-1.5 rounded-md shadow-sm border border-border-subtle"
                >
                  {editingPlayerId === player.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={editingPlayerNameInput}
                        onChange={(e) => setEditingPlayerNameInput(e.target.value)}
                        className="w-32 border-border-strong"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEditPlayerName();
                          if (e.key === 'Escape') cancelEditPlayerName();
                        }}
                        onBlur={confirmEditPlayerName}
                      />
                    </div>
                  ) : (
                    <>
                      <select
                        value={player.symbol || '●'}
                        onChange={(e) => handleEditPlayerSymbol(player.id, e.target.value)}
                        className="rounded border border-border-subtle bg-surface-elevated px-1 py-0.5 text-sm"
                        aria-label={`プレイヤー「${getPlayerDisplayName(player)}」の記号`}
                      >
                        {PLAYER_SYMBOL_OPTIONS.map((symbol) => (
                          <option key={symbol} value={symbol}>
                            {symbol}
                          </option>
                        ))}
                      </select>
                      <select
                        value={player.color || '赤'}
                        onChange={(e) => handleEditPlayerColor(player.id, e.target.value)}
                        className="rounded border border-border-subtle bg-surface-elevated px-1 py-0.5 text-sm"
                        aria-label={`プレイヤー「${getPlayerDisplayName(player)}」の色`}
                      >
                        {PLAYER_COLOR_OPTIONS.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        onClick={() => startEditPlayerName(player)}
                        variant="ghost"
                        className="text-text-primary p-0 shadow-none hover:bg-transparent hover:text-brand-accent"
                        aria-label={`プレイヤー「${getPlayerDisplayName(player)}」の名前を編集`}
                      >
                        <span className={`text-lg leading-none ${getColorTextClass(player.color)}`}>
                          {player.symbol || '●'}
                        </span>{' '}
                        / {getPlayerShortLabel(player)} {getPlayerDisplayName(player)} (
                        {player.color || '無色'})
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDeletePlayer(player.id)}
                        title={`プレイヤー「${getPlayerDisplayName(player)}」を削除`}
                        variant="danger"
                        className="p-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-8 p-4 sm:p-6 bg-surface-elevated rounded-xl shadow-md border border-border-subtle">
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          企業管理
        </SectionHeader>
        <div className="flex flex-col sm:flex-row items-end gap-3 mb-6">
          <div>
            <label
              htmlFor="numCompaniesToAdd"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              追加する企業数:
            </label>
            <select
              id="numCompaniesToAdd"
              value={numCompaniesToAdd}
              onChange={(e) => setNumCompaniesToAdd(parseInt(e.target.value))}
              className="p-2 border border-border-subtle rounded-md shadow-sm"
            >
              {Array.from({ length: 15 }, (_, i) => i + 4).map((n) => (
                <option key={n} value={n}>
                  {n}社
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={() => handleAddMultipleCompanies(numCompaniesToAdd)}
            className="py-2.5 px-5"
          >
            企業を一括追加 (汎用 Co)
          </Button>
        </div>
        {companies.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-text-secondary mb-2">
              登録済み企業 (クリックで詳細表示):
            </h4>
            <div className="flex flex-wrap gap-2">
              {companies.map((company) => (
                <div key={company.id} className="flex items-center gap-1">
                  <Button
                    type="button"
                    onClick={() => handleSelectCompany(company.id)}
                    variant={company.id === selectedCompanyId ? 'primary' : 'secondary'}
                    className={`py-2 px-4 text-sm ${company.id === selectedCompanyId ? 'ring-2 ring-brand-accent' : 'text-brand-primary border border-border-strong'}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`text-base leading-none ${getColorTextClass(getCompanyColor(company))}`}
                      >
                        {getCompanySymbol(company)}
                      </span>
                      <span className="text-ui-xs text-text-muted">
                        ({getCompanyColor(company)})
                      </span>
                      <span>{getCompanyDisplayName(company)}</span>
                    </span>
                  </Button>
                  <select
                    value={company.symbol || '○'}
                    onChange={(e) => handleEditCompanySymbol(company.id, e.target.value)}
                    className="rounded border border-border-subtle bg-surface-elevated px-1 py-1 text-sm"
                    aria-label={`企業「${getCompanyDisplayName(company)}」の記号`}
                  >
                    {COMPANY_SYMBOL_OPTIONS.map((symbol) => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))}
                  </select>
                  <select
                    value={company.color || '赤'}
                    onChange={(e) => handleEditCompanyColor(company.id, e.target.value)}
                    className="rounded border border-border-subtle bg-surface-elevated px-1 py-1 text-sm"
                    aria-label={`企業「${getCompanyDisplayName(company)}」の色`}
                  >
                    {COMPANY_COLOR_OPTIONS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => handleDeleteCompany(company.id)}
                    title={`企業「${getCompanyDisplayName(company)}」を削除`}
                    variant="danger"
                    className="p-1.5"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        {companies.length === 0 && (
          <p className="text-center text-text-muted italic">企業がありません。</p>
        )}
      </div>

      <div className="mt-8 p-4 sm:p-6 bg-brand-accent-soft rounded-xl shadow-md border border-border-strong">
        <SectionHeader size="section" as="h3" className="mb-3 text-status-danger">
          破壊操作（確認あり）
        </SectionHeader>
        <p className="text-ui-sm text-text-secondary mb-3">
          この操作は全企業の OR 収益入力を 0 に戻します。
        </p>
        <Button
          type="button"
          onClick={handleResetAllORRevenues}
          variant="danger"
          className="text-ui-sm"
        >
          全企業のOR収益をリセット
        </Button>
      </div>
    </div>
  );
};

export default ManagementView;
