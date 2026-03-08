import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import CompanyColorPreview from '../../components/ui/CompanyColorPreview';
import CommittedTextInput from '../../components/ui/CommittedTextInput';
import SectionHeader from '../../components/ui/SectionHeader';
import { GAME_TEMPLATE_OPTIONS, templateRequiresMergerRound } from '../../lib/gameTemplates';
import {
  COMPANY_SYMBOL_OPTIONS,
  PLAYER_COLOR_OPTIONS,
  PLAYER_SYMBOL_OPTIONS,
  getCompanyColorOptions,
  getCompanyDisplayName,
  getPlayerDisplayName,
  normalizeHexColor,
} from '../../lib/labels';

const panelClass = 'rounded-xl border border-border-subtle bg-surface-elevated p-6 shadow-ui';
const rowClass =
  'grid gap-3 rounded-lg border border-border-subtle bg-surface-muted p-4 sm:grid-cols-[1fr_repeat(6,auto)]';

const SetupView = ({
  players,
  companies,
  numORs,
  hasIpoShares,
  mergerRoundEnabled,
  bankPoolDividendRecipient = 'market',
  setupLocked,
  handleAddMultiplePlayers,
  handleDeletePlayer,
  handleEditPlayerName,
  handleEditPlayerSymbol,
  handleEditPlayerColor,
  handleAddMultipleCompanies,
  handleApplyCompanyTemplate,
  handleDeleteCompany,
  handleEditCompanyName,
  handleEditCompanySymbol,
  handleEditCompanyColor,
  handleEditCompanyType,
  handleSetNumORs,
  handleSetHasIpoShares,
  handleSetMergerRoundEnabled,
  handleSetBankPoolDividendRecipient,
  handleStartGame,
}) => {
  const [numPlayersToAdd, setNumPlayersToAdd] = useState(2);
  const [numCompaniesToAdd, setNumCompaniesToAdd] = useState(4);
  const [selectedTemplateId, setSelectedTemplateId] = useState(GAME_TEMPLATE_OPTIONS[0]?.id || '');
  const selectedTemplateEnablesMergerRound = templateRequiresMergerRound(selectedTemplateId);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <SectionHeader size="page" className="mb-6 text-center text-brand-primary">
        設定
      </SectionHeader>

      {setupLocked && (
        <p className="ui-note-warning mb-4">
          SR開始後は設定画面からの変更を禁止しています。OR数だけは盤面のSR画面で調整できます。
        </p>
      )}

      <section className={`mb-6 ${panelClass}`}>
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          タイトルテンプレート
        </SectionHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <label
            className="flex flex-col gap-2 text-sm text-text-secondary"
            htmlFor="companyTemplate"
          >
            <span className="font-medium">企業テンプレート</span>
            <select
              id="companyTemplate"
              disabled={setupLocked}
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="ui-select min-w-[16rem]"
            >
              {GAME_TEMPLATE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            disabled={setupLocked || !selectedTemplateId}
            onClick={() => handleApplyCompanyTemplate(selectedTemplateId)}
            className="py-2 text-sm disabled:opacity-50"
          >
            企業テンプレートを適用
          </Button>
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          公開会社セットだけをまとめて投入します。プレイヤー人数や OR 数は変更しません。
        </p>
        {selectedTemplateEnablesMergerRound ? (
          <p className="mt-2 text-sm text-text-secondary">
            このテンプレートは major を含むため、適用時に Merger Round も自動で有効化します。
          </p>
        ) : null}
      </section>

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
          <label
            className="flex items-center gap-3 text-sm text-text-secondary"
            htmlFor="mergerRoundEnabled"
          >
            <span className="font-medium">Merger Round</span>
            <select
              id="mergerRoundEnabled"
              disabled={setupLocked}
              value={mergerRoundEnabled ? 'enabled' : 'disabled'}
              onChange={(e) => handleSetMergerRoundEnabled(e.target.value === 'enabled')}
              className="ui-select"
            >
              <option value="disabled">使わない</option>
              <option value="enabled">使う</option>
            </select>
          </label>
        </div>
        {mergerRoundEnabled ? (
          <p className="mt-4 text-sm text-text-secondary">
            Merger Round 有効時は、`major`
            にした会社は開始時に待機状態となり、合併後に盤面へ出ます。
          </p>
        ) : null}
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
                disabled={setupLocked || Boolean(normalizeHexColor(company.color))}
                onChange={(e) => handleEditCompanyColor(company.id, e.target.value)}
                className="ui-select"
                aria-label={`企業「${getCompanyDisplayName(company)}」の色`}
              >
                {getCompanyColorOptions(company.color).map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
              <CompanyColorPreview company={company} />
              {mergerRoundEnabled ? (
                <select
                  value={company.companyType || 'minor'}
                  disabled={setupLocked}
                  onChange={(e) => handleEditCompanyType(company.id, e.target.value)}
                  className="ui-select"
                  aria-label={`企業「${getCompanyDisplayName(company)}」の種別`}
                >
                  <option value="minor">minor</option>
                  <option value="major">major</option>
                </select>
              ) : null}
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
