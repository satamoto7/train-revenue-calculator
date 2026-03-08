import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import CommittedNumberInput from '../../components/ui/CommittedNumberInput';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  getCompanyAccentEdgeClass,
  getCompanyAccentEdgeStyle,
  getColorTextClass,
  getColorTextStyle,
  getCompanyColor,
  getCompanyDisplayName,
  getCompanySymbol,
  getPlayerAccentEdgeClass,
  getPlayerColor,
  getPlayerDisplayName,
  getPlayerSymbol,
} from '../../lib/labels';
import {
  getEffectivePresidentPlayerIds,
  getHoldingPercentage,
  getLeadingPlayerIds,
} from '../../lib/companyOwnership';

const getNumeric = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return parsed;
};

const StatusBadge = ({ className, children }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
  >
    {children}
  </span>
);

const SummaryHoldingChip = ({ player, percentage, isPresident, isManualPresident }) => (
  <div
    className={`rounded-lg border px-4 py-3 text-sm border-l-4 ${getPlayerAccentEdgeClass(
      getPlayerColor(player)
    )} ${
      isPresident
        ? 'border-brand-accent bg-brand-accent-soft text-text-primary'
        : 'border-border-subtle bg-surface-muted text-text-secondary'
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium">
        {getPlayerSymbol(player)} {getPlayerDisplayName(player)}
      </span>
      <span className="font-semibold text-text-primary">{percentage}%</span>
    </div>
    {isPresident && (
      <div className="mt-1">
        <StatusBadge
          className={
            isManualPresident ? 'bg-brand-primary text-white' : 'bg-white text-brand-primary'
          }
        >
          {isManualPresident ? '社長(手動)' : '最大株主'}
        </StatusBadge>
      </div>
    )}
  </div>
);

const DetailLabel = ({ title, helper }) => (
  <div>
    <p className="text-sm font-medium text-text-primary">{title}</p>
    {helper ? <p className="text-xs text-text-secondary">{helper}</p> : null}
  </div>
);

const CompanyCard = ({
  company,
  players,
  hasIpoShares,
  isExpanded,
  validation,
  onToggle,
  handleStockChange,
  handlePresidentChange,
  handleUnestablishedChange,
  handleCompanyPeriodicIncomeChange,
}) => {
  const bankInput = getNumeric(company.bankPoolPercentage || 0);
  const treasury = getNumeric(company.treasuryStockPercentage || 0);
  const playerTotal = players.reduce(
    (sum, player) => sum + getHoldingPercentage(company, player.id),
    0
  );
  const autoBank = hasIpoShares ? bankInput : 100 - playerTotal - treasury;
  const autoIpo = hasIpoShares ? 100 - playerTotal - treasury - bankInput : 0;
  const leadingPlayerIds = new Set(getLeadingPlayerIds(company));
  const effectivePresidentIds = new Set(getEffectivePresidentPlayerIds(company));
  const isManualPresident = Boolean(company.presidentPlayerId);

  return (
    <article
      className={`rounded-xl border p-5 shadow-ui ${
        validation?.invalid
          ? 'border-status-danger/20 bg-status-danger/5'
          : 'border-border-subtle bg-surface-elevated'
      } border-l-4 ${getCompanyAccentEdgeClass(getCompanyColor(company))}`}
      style={getCompanyAccentEdgeStyle(getCompanyColor(company))}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-lg ${getColorTextClass(getCompanyColor(company))}`}
              style={getColorTextStyle(getCompanyColor(company))}
            >
              {getCompanySymbol(company)}
            </span>
            <h2 className="text-lg font-semibold text-text-primary">
              {getCompanyDisplayName(company)}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {company.isUnestablished ? (
              <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
                未設立
              </StatusBadge>
            ) : (
              <StatusBadge className="border-status-success/20 bg-status-success/10 text-status-success">
                設立済み
              </StatusBadge>
            )}
            {validation?.invalid ? (
              <StatusBadge className="border-status-danger/20 bg-status-danger/10 text-status-danger">
                警告あり
              </StatusBadge>
            ) : (
              <StatusBadge className="border-status-success/20 bg-status-success/10 text-status-success">
                入力良好
              </StatusBadge>
            )}
            {effectivePresidentIds.size > 0 ? (
              <StatusBadge className="border-brand-accent/20 bg-brand-accent-soft text-brand-primary">
                {isManualPresident
                  ? '社長手動指定中'
                  : leadingPlayerIds.size > 1
                    ? '最大株主同率'
                    : '最大株主あり'}
              </StatusBadge>
            ) : (
              <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
                株式未入力
              </StatusBadge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-44 rounded-lg border border-border-subtle bg-surface-muted p-3">
            <DetailLabel title="企業定期収入" helper="ORごとに加算" />
            <CommittedNumberInput
              min="0"
              value={company.periodicIncome || 0}
              onCommit={(normalized) => handleCompanyPeriodicIncomeChange(company.id, normalized)}
              className="mt-2 min-h-11 w-full text-center text-base"
              aria-label={`${getCompanyDisplayName(company)}の企業定期収入`}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 px-4"
            onClick={onToggle}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '詳細を閉じる' : '詳細を開く'}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {players.map((player) => {
          const percentage = getHoldingPercentage(company, player.id);
          return (
            <SummaryHoldingChip
              key={player.id}
              player={player}
              percentage={percentage}
              isPresident={effectivePresidentIds.has(player.id)}
              isManualPresident={company.presidentPlayerId === player.id}
            />
          );
        })}
      </div>

      {validation?.invalid ? (
        <p className="mt-3 text-sm text-status-danger">{validation.message}</p>
      ) : null}

      {isExpanded ? (
        <div className="mt-5 space-y-4 border-t border-border-subtle pt-5">
          <div className="grid gap-3 lg:grid-cols-2">
            {players.map((player) => {
              const percentage = getHoldingPercentage(company, player.id);
              const isPresident = company.presidentPlayerId === player.id;
              return (
                <div
                  key={player.id}
                  className={`rounded-lg border p-4 border-l-4 ${getPlayerAccentEdgeClass(
                    getPlayerColor(player)
                  )} ${
                    effectivePresidentIds.has(player.id)
                      ? 'border-brand-accent bg-brand-accent-soft'
                      : 'border-border-subtle bg-surface-muted'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <DetailLabel
                      title={`${getPlayerSymbol(player)} ${getPlayerDisplayName(player)}`}
                      helper={`現在 ${percentage}%`}
                    />
                    {leadingPlayerIds.has(player.id) ? (
                      <StatusBadge className="border-border-subtle bg-surface-elevated text-brand-primary">
                        {leadingPlayerIds.size > 1 ? '同率首位' : '首位'}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <CommittedNumberInput
                      min="0"
                      max="100"
                      step="10"
                      value={percentage}
                      onCommit={(normalized) =>
                        handleStockChange(company.id, {
                          target: 'player',
                          playerId: player.id,
                          value: normalized,
                        })
                      }
                      className="min-h-11 w-full text-center text-base"
                      aria-label={`${getCompanyDisplayName(company)}の${getPlayerDisplayName(player)}保有率`}
                    />
                    <label className="inline-flex min-h-11 items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={isPresident}
                        onChange={(event) =>
                          handlePresidentChange(company.id, event.target.checked ? player.id : null)
                        }
                        aria-label={`${getCompanyDisplayName(company)}の${getPlayerDisplayName(player)}を社長にする`}
                        className="h-5 w-5 rounded border-border-subtle text-brand-primary focus:ring-brand-accent"
                      />
                      社長にする
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
              <DetailLabel title="自社株" helper="手元保有分" />
              <CommittedNumberInput
                min="0"
                max="100"
                step="10"
                value={treasury}
                onCommit={(normalized) =>
                  handleStockChange(company.id, { target: 'treasury', value: normalized })
                }
                className="mt-3 min-h-11 w-full text-center text-base"
                aria-label={`${getCompanyDisplayName(company)}の自社株`}
              />
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
              <DetailLabel
                title="バンク"
                helper={hasIpoShares ? '手入力で調整' : 'IPO なし時は自動計算'}
              />
              {hasIpoShares ? (
                <CommittedNumberInput
                  min="0"
                  max="100"
                  step="10"
                  value={bankInput}
                  onCommit={(normalized) =>
                    handleStockChange(company.id, { target: 'bank', value: normalized })
                  }
                  className="mt-3 min-h-11 w-full text-center text-base"
                  aria-label={`${getCompanyDisplayName(company)}のバンクプール`}
                />
              ) : (
                <p className="mt-3 rounded-lg border border-border-subtle bg-surface-elevated px-3 py-3 text-center text-base font-semibold text-text-primary">
                  {autoBank}%
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
              <DetailLabel title="IPO" helper="残り自動計算" />
              <p
                className={`mt-3 rounded-lg border px-3 py-3 text-center text-base font-semibold ${
                  autoIpo < 0
                    ? 'border-status-danger/20 bg-status-danger/10 text-status-danger'
                    : 'border-border-subtle bg-surface-elevated text-text-primary'
                }`}
              >
                {autoIpo}%
              </p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
              <DetailLabel title="未設立扱い" helper="OR 対象外にする" />
              <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={Boolean(company.isUnestablished)}
                  onChange={(event) => handleUnestablishedChange(company.id, event.target.checked)}
                  aria-label={`${getCompanyDisplayName(company)}を未設立として扱う`}
                  className="h-5 w-5 rounded border-border-subtle text-brand-primary focus:ring-brand-accent"
                />
                この会社を未設立にする
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
};

const StockRoundView = ({
  embedded = false,
  players,
  companies,
  numORs,
  hasIpoShares,
  validation,
  handleStockChange,
  handlePresidentChange,
  handleUnestablishedChange,
  handleValidate,
  handleSetNumORs,
  handleComplete,
  handlePlayerPeriodicIncomeChange,
  handleCompanyPeriodicIncomeChange,
}) => {
  const invalidCompanyIds = Object.values(validation || {})
    .filter((entry) => entry?.invalid)
    .map((entry) => entry.companyId);
  const [expandedCompanyId, setExpandedCompanyId] = useState(null);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {!embedded ? (
        <>
          <SectionHeader size="page" className="mb-6 text-center text-brand-primary">
            SR
          </SectionHeader>

          <p className="mb-5 rounded-xl border border-brand-accent/15 bg-[linear-gradient(135deg,_rgba(16,32,51,0.98),_rgba(39,68,93,0.96))] px-5 py-4 text-sm text-slate-200 shadow-ui-lg">
            会社ごとに保有率を確認し、必要な会社だけ詳細を開いて調整します。最大株主は自動強調され、
            例外だけ手動で社長指定できます。
          </p>
        </>
      ) : null}

      <section className="mb-5 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-ui">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <p className="mb-3 text-sm font-medium text-text-primary">
              プレイヤー定期収入（ORごと）
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`rounded-lg border border-border-subtle bg-surface-muted p-3 border-l-4 ${getPlayerAccentEdgeClass(
                    getPlayerColor(player)
                  )}`}
                >
                  <p className="mb-2 text-sm font-medium text-text-primary">
                    {getPlayerSymbol(player)} {getPlayerDisplayName(player)}
                  </p>
                  <CommittedNumberInput
                    min="0"
                    value={player.periodicIncome || 0}
                    onCommit={(normalized) =>
                      handlePlayerPeriodicIncomeChange(player.id, normalized)
                    }
                    className="min-h-11 w-full text-center text-base"
                    aria-label={`${getPlayerDisplayName(player)}の定期収入`}
                  />
                </div>
              ))}
            </div>
          </div>

          {typeof handleSetNumORs === 'function' ? (
            <div className="w-full rounded-lg border border-brand-accent/15 bg-brand-accent-soft/40 p-4 lg:w-72">
              <label
                className="flex flex-col gap-2 text-sm text-text-secondary"
                htmlFor="stock-round-num-ors"
              >
                <span className="font-medium text-text-primary">SR完了後の OR 数</span>
                <select
                  id="stock-round-num-ors"
                  value={numORs}
                  onChange={(event) => handleSetNumORs(Number.parseInt(event.target.value, 10))}
                  className="ui-select"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}回
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs text-text-muted">
                OR セットの途中では変えず、この SR が終わった直後の本数だけを調整します。
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="space-y-4">
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            players={players}
            hasIpoShares={hasIpoShares}
            isExpanded={expandedCompanyId === company.id}
            validation={validation?.[company.id]}
            onToggle={() =>
              setExpandedCompanyId((current) => (current === company.id ? null : company.id))
            }
            handleStockChange={handleStockChange}
            handlePresidentChange={handlePresidentChange}
            handleUnestablishedChange={handleUnestablishedChange}
            handleCompanyPeriodicIncomeChange={handleCompanyPeriodicIncomeChange}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-accent/15 bg-[linear-gradient(135deg,_rgba(16,32,51,0.98),_rgba(27,47,69,0.98))] p-4 shadow-ui-lg">
        <p className="text-sm text-text-secondary">
          <span className="text-slate-300">警告企業数:</span>{' '}
          <span className="font-semibold text-red-300">{invalidCompanyIds.length}</span>
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleValidate}>
            妥当性チェック
          </Button>
          <Button type="button" onClick={handleComplete}>
            SR完了してORへ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StockRoundView;
