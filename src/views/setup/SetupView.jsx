import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  COMPANY_COLOR_OPTIONS,
  COMPANY_SYMBOL_OPTIONS,
  PLAYER_COLOR_OPTIONS,
  PLAYER_SYMBOL_OPTIONS,
  getCompanyDisplayName,
  getPlayerDisplayName,
} from '../../lib/labels';

const SetupView = ({
  players,
  companies,
  numORs,
  hasIpoShares,
  setupLocked,
  handleAddMultiplePlayers,
  handleDeletePlayer,
  handleEditPlayerName,
  handleEditPlayerSymbol,
  handleEditPlayerColor,
  handleAddMultipleCompanies,
  handleDeleteCompany,
  handleEditCompanyName,
  handleEditCompanySymbol,
  handleEditCompanyColor,
  handleSetNumORs,
  handleSetHasIpoShares,
  handleStartGame,
}) => {
  const [numPlayersToAdd, setNumPlayersToAdd] = useState(2);
  const [numCompaniesToAdd, setNumCompaniesToAdd] = useState(4);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <SectionHeader size="page" className="mb-6 text-center text-brand-primary">
        設定
      </SectionHeader>

      {setupLocked && (
        <p className="mb-4 rounded-md border border-status-danger bg-brand-accent-soft p-3 text-sm text-text-secondary">
          SR開始後は設定変更を禁止しています。次SR以降も同じ設定で進行します。
        </p>
      )}

      <section className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-md sm:p-6">
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          ゲーム設定
        </SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 text-sm text-text-secondary" htmlFor="numORs">
            <span className="font-medium">運営ラウンド(OR)数</span>
            <select
              id="numORs"
              disabled={setupLocked}
              value={numORs}
              onChange={(e) => handleSetNumORs(parseInt(e.target.value, 10))}
              className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-sm"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}回
                </option>
              ))}
            </select>
          </label>
          <label
            className="flex items-center gap-3 text-sm text-text-secondary"
            htmlFor="hasIpoShares"
          >
            <span className="font-medium">IPO株の有無</span>
            <select
              id="hasIpoShares"
              disabled={setupLocked}
              value={hasIpoShares ? 'yes' : 'no'}
              onChange={(e) => handleSetHasIpoShares(e.target.value === 'yes')}
              className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-sm"
            >
              <option value="yes">あり</option>
              <option value="no">なし</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-md sm:p-6">
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          プレイヤー
        </SectionHeader>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm text-text-secondary" htmlFor="numPlayersToAdd">
            追加人数
          </label>
          <select
            id="numPlayersToAdd"
            disabled={setupLocked}
            value={numPlayersToAdd}
            onChange={(e) => setNumPlayersToAdd(parseInt(e.target.value, 10))}
            className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-sm"
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}名
              </option>
            ))}
          </select>
          <Button
            type="button"
            disabled={setupLocked}
            onClick={() => handleAddMultiplePlayers(numPlayersToAdd)}
            className="py-2 text-sm disabled:opacity-50"
          >
            プレイヤーを一括追加
          </Button>
        </div>

        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="grid gap-2 rounded-md border border-border-subtle bg-surface-muted p-3 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <Input
                type="text"
                value={getPlayerDisplayName(player)}
                disabled={setupLocked}
                onChange={(e) => handleEditPlayerName(player.id, e.target.value)}
                aria-label={`プレイヤー「${getPlayerDisplayName(player)}」の名前`}
              />
              <select
                value={player.symbol || '●'}
                disabled={setupLocked}
                onChange={(e) => handleEditPlayerSymbol(player.id, e.target.value)}
                className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-sm"
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
                disabled={setupLocked}
                onChange={(e) => handleEditPlayerColor(player.id, e.target.value)}
                className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-sm"
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
                variant="danger"
                disabled={setupLocked}
                onClick={() => handleDeletePlayer(player.id)}
                className="py-2 text-sm disabled:opacity-50"
              >
                削除
              </Button>
            </div>
          ))}
          {players.length === 0 && <p className="text-sm text-text-muted">未登録です。</p>}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-md sm:p-6">
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          企業
        </SectionHeader>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm text-text-secondary" htmlFor="numCompaniesToAdd">
            追加企業数
          </label>
          <select
            id="numCompaniesToAdd"
            disabled={setupLocked}
            value={numCompaniesToAdd}
            onChange={(e) => setNumCompaniesToAdd(parseInt(e.target.value, 10))}
            className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}社
              </option>
            ))}
          </select>
          <Button
            type="button"
            disabled={setupLocked}
            onClick={() => handleAddMultipleCompanies(numCompaniesToAdd)}
            className="py-2 text-sm disabled:opacity-50"
          >
            企業を一括追加
          </Button>
        </div>

        <div className="space-y-2">
          {companies.map((company) => (
            <div
              key={company.id}
              className="grid gap-2 rounded-md border border-border-subtle bg-surface-muted p-3 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <Input
                type="text"
                value={getCompanyDisplayName(company)}
                disabled={setupLocked}
                onChange={(e) => handleEditCompanyName(company.id, e.target.value)}
                aria-label={`企業「${getCompanyDisplayName(company)}」の名前`}
              />
              <select
                value={company.symbol || '○'}
                disabled={setupLocked}
                onChange={(e) => handleEditCompanySymbol(company.id, e.target.value)}
                className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-sm"
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
                disabled={setupLocked}
                onChange={(e) => handleEditCompanyColor(company.id, e.target.value)}
                className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-sm"
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
                variant="danger"
                disabled={setupLocked}
                onClick={() => handleDeleteCompany(company.id)}
                className="py-2 text-sm disabled:opacity-50"
              >
                削除
              </Button>
            </div>
          ))}
          {companies.length === 0 && <p className="text-sm text-text-muted">未登録です。</p>}
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={setupLocked || players.length === 0 || companies.length === 0}
          onClick={handleStartGame}
          className="disabled:opacity-50"
        >
          ゲーム開始（SRへ）
        </Button>
      </div>
    </div>
  );
};

export default SetupView;
