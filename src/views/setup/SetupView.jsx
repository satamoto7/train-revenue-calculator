import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import CommittedTextInput from '../../components/ui/CommittedTextInput';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  COMPANY_COLOR_OPTIONS,
  COMPANY_SYMBOL_OPTIONS,
  PLAYER_COLOR_OPTIONS,
  PLAYER_SYMBOL_OPTIONS,
  getCompanyDisplayName,
  getPlayerDisplayName,
} from '../../lib/labels';

const panelClass = 'rounded-xl border border-border-subtle bg-surface-elevated p-6 shadow-ui';
const rowClass =
  'grid gap-3 rounded-lg border border-border-subtle bg-surface-muted p-4 sm:grid-cols-[1fr_auto_auto_auto]';

const SetupView = ({
  players,
  companies,
  numORs,
  hasIpoShares,
  bankPoolDividendRecipient = 'market',
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
  handleSetBankPoolDividendRecipient,
  handleStartGame,
}) => {
  const [numPlayersToAdd, setNumPlayersToAdd] = useState(2);
  const [numCompaniesToAdd, setNumCompaniesToAdd] = useState(4);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <SectionHeader size="page" className="mb-6 text-center text-brand-primary">
        設定
      </SectionHeader>

      {setupLocked && (
        <p className="ui-note-warning mb-4">
          SR開始後は設定変更を禁止しています。次SR以降も同じ設定で進行します。
        </p>
      )}

      <section className={`mb-6 ${panelClass}`}>
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
              className="ui-select"
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
              className="ui-select"
            >
              <option value="yes">あり</option>
              <option value="no">なし</option>
            </select>
          </label>
          <label
            className="flex items-center gap-3 text-sm text-text-secondary"
            htmlFor="bankPoolDividendRecipient"
          >
            <span className="font-medium">市場株の配当受取先</span>
            <select
              id="bankPoolDividendRecipient"
              disabled={setupLocked}
              value={bankPoolDividendRecipient}
              onChange={(e) => handleSetBankPoolDividendRecipient(e.target.value)}
              className="ui-select"
            >
              <option value="market">市場</option>
              <option value="company">会社</option>
            </select>
          </label>
        </div>
      </section>

      <section className={`mb-6 ${panelClass}`}>
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
            className="ui-select"
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
            <div key={player.id} className={rowClass}>
              <CommittedTextInput
                value={getPlayerDisplayName(player)}
                disabled={setupLocked}
                onCommit={(nextValue) => handleEditPlayerName(player.id, nextValue)}
                aria-label={`プレイヤー「${getPlayerDisplayName(player)}」の名前`}
              />
              <select
                value={player.symbol || '●'}
                disabled={setupLocked}
                onChange={(e) => handleEditPlayerSymbol(player.id, e.target.value)}
                className="ui-select"
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
                className="ui-select"
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

      <section className={`mb-6 ${panelClass}`}>
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
            className="ui-select"
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
            <div key={company.id} className={rowClass}>
              <CommittedTextInput
                value={getCompanyDisplayName(company)}
                disabled={setupLocked}
                onCommit={(nextValue) => handleEditCompanyName(company.id, nextValue)}
                aria-label={`企業「${getCompanyDisplayName(company)}」の名前`}
              />
              <select
                value={company.symbol || '○'}
                disabled={setupLocked}
                onChange={(e) => handleEditCompanySymbol(company.id, e.target.value)}
                className="ui-select"
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
                className="ui-select"
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

      <div className="flex justify-end pt-2">
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
