import React, { useEffect, useMemo, useState } from 'react';
import {
  calculateCompanyTrainRevenue,
  calculateCompanyTotalORRevenue,
  calculateDividend,
  calculateTrainRevenue,
} from '../../lib/calc';
import Button from '../../components/ui/Button';
import CommittedNumberInput from '../../components/ui/CommittedNumberInput';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  getCompanyAccentEdgeClass,
  getColorTextClass,
  getCompanyColor,
  getCompanyDisplayName,
  getCompanySymbol,
  getPlayerAccentEdgeClass,
  getPlayerColor,
  getPlayerDisplayName,
  getPlayerSymbol,
} from '../../lib/labels';
import { getHoldingPercentage } from '../../lib/companyOwnership';

const getEntryRevenue = (company, orNum) => {
  const entry = (company.orRevenues || []).find((or) => or.orNum === orNum);
  return entry?.revenue ?? 0;
};

const QUICK_STOP_VALUES = [10, 20, 30, 40, 50, 60];

const StatusBadge = ({ className, children }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
  >
    {children}
  </span>
);

const RevenueControl = ({
  company,
  orNum,
  disabled = false,
  compact = false,
  inputIdPrefix = 'or',
  labelMode = 'detail',
  handleORRevenueChange,
}) => {
  const currentRevenue = getEntryRevenue(company, orNum);
  const label =
    labelMode === 'summary'
      ? `${getCompanyDisplayName(company)}の現在OR${orNum}収益`
      : `${getCompanyDisplayName(company)}のOR${orNum}収益(詳細)`;
  const inputId = `${inputIdPrefix}-${orNum}-${company.id}`;

  return (
    <div
      className={`flex items-center gap-2 ${compact ? 'flex-wrap sm:flex-nowrap' : 'justify-between'}`}
    >
      {!compact ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          OR{orNum}
        </label>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 px-3 py-1 text-xs"
        aria-label={`${label}を-10`}
        disabled={disabled}
        onClick={() => handleORRevenueChange(company.id, orNum, Math.max(0, currentRevenue - 10))}
      >
        -10
      </Button>
      <CommittedNumberInput
        id={inputId}
        min="0"
        value={currentRevenue}
        shouldCommit={(rawValue) => `${rawValue ?? ''}`.trim() !== ''}
        onCommit={(nextValue) => handleORRevenueChange(company.id, orNum, nextValue)}
        className={`min-h-11 text-center text-base ${compact ? 'w-24 flex-1 sm:flex-none' : 'w-24'}`}
        aria-label={label}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 px-3 py-1 text-xs"
        aria-label={`${label}を+10`}
        disabled={disabled}
        onClick={() => handleORRevenueChange(company.id, orNum, currentRevenue + 10)}
      >
        +10
      </Button>
    </div>
  );
};

const TrainEditor = ({ train, trainIndex, onUpdateStops, onClear, onDelete }) => {
  const stops = train.stops || [];
  const [customStopValue, setCustomStopValue] = useState('');

  const handleAddStop = (value) => {
    const parsed = Number.parseInt(`${value}`.trim(), 10);
    if (Number.isNaN(parsed)) return;
    onUpdateStops([...stops, Math.max(0, parsed)]);
  };

  const handleAdjustStop = (stopIndex, delta) => {
    const nextStops = [...stops];
    const currentValue = Number.parseInt(`${nextStops[stopIndex] || 0}`, 10) || 0;
    nextStops[stopIndex] = Math.max(0, currentValue + delta);
    onUpdateStops(nextStops);
  };

  return (
    <div className="rounded-xl border border-brand-accent/20 bg-surface-elevated p-4 shadow-ui">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-medium text-text-primary">列車 {trainIndex + 1}</p>
        <Button type="button" variant="danger" className="py-1 text-xs" onClick={onDelete}>
          削除
        </Button>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-xs font-medium text-text-secondary">経路プレビュー:</p>
        {stops.length > 0 ? (
          <div className="overflow-x-auto pb-1">
            <div className="inline-flex min-w-max items-center rounded-lg border border-border-subtle bg-surface-muted p-3">
              {stops.map((stop, idx) => (
                <React.Fragment key={`${train.id}-preview-${idx}`}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-elevated text-sm font-semibold text-text-primary shadow-sm">
                    {stop}
                  </div>
                  {idx < stops.length - 1 ? (
                    <div
                      className="mx-1 h-1.5 w-8 shrink-0 rounded-full bg-border-strong sm:w-10"
                      aria-hidden="true"
                    />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            地点未追加。下のボタンから収益地点を追加できます。
          </p>
        )}
      </div>

      <div className="mb-3 space-y-2">
        {stops.map((stop, idx) => (
          <div
            key={`${train.id}-${idx}`}
            className="rounded-lg border border-border-subtle bg-surface-muted p-3"
          >
            <p className="mb-1 text-xs font-medium text-text-secondary">地点 {idx + 1}</p>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <Button
                type="button"
                variant="secondary"
                className="min-h-[2.25rem] px-3 py-1.5 text-xs"
                aria-label={`列車${trainIndex + 1}の地点${idx + 1}を-10`}
                onClick={() => handleAdjustStop(idx, -10)}
              >
                -10
              </Button>
              <CommittedNumberInput
                min="0"
                value={stop}
                onCommit={(nextValue) => {
                  const nextStops = [...stops];
                  nextStops[idx] = nextValue;
                  onUpdateStops(nextStops);
                }}
                className="w-24 text-center sm:w-20"
                aria-label={`列車${trainIndex + 1}の地点${idx + 1}`}
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-[2.25rem] px-3 py-1.5 text-xs"
                aria-label={`列車${trainIndex + 1}の地点${idx + 1}を+10`}
                onClick={() => handleAdjustStop(idx, 10)}
              >
                +10
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-[2.25rem] px-3 py-1.5 text-sm font-semibold leading-none"
                aria-label={`列車${trainIndex + 1}の地点${idx + 1}を削除`}
                onClick={() => {
                  const nextStops = stops.filter((_, stopIndex) => stopIndex !== idx);
                  onUpdateStops(nextStops);
                }}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-lg border border-brand-accent/20 bg-brand-accent-soft/50 p-4">
        <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK_STOP_VALUES.map((value) => (
            <Button
              key={value}
              type="button"
              className="min-h-[2.25rem] px-2 py-1.5 text-xs"
              aria-label={`列車${trainIndex + 1}に${value}を追加`}
              onClick={() => handleAddStop(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <CommittedNumberInput
            min="0"
            value={customStopValue}
            placeholder="自由入力"
            className="w-full sm:w-28"
            aria-label={`列車${trainIndex + 1}のカスタム収益値`}
            onChange={(event) => setCustomStopValue(event.target.value)}
            onCommit={(nextValue) => setCustomStopValue(`${nextValue}`)}
            emptyValue={0}
            formatCommittedValue={(nextValue) => `${nextValue ?? ''}`}
          />
          <Button
            type="button"
            className="min-h-[2.25rem] w-full px-3 py-1.5 text-xs sm:w-auto"
            aria-label={`列車${trainIndex + 1}にカスタム値を追加`}
            onClick={() => {
              handleAddStop(customStopValue);
              setCustomStopValue('');
            }}
          >
            追加
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="danger" className="py-1 text-xs" onClick={onClear}>
          経路クリア
        </Button>
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        列車収益:{' '}
        <span className="font-semibold text-status-success">{calculateTrainRevenue(stops)}</span>
      </p>
    </div>
  );
};

const CompanyCard = ({
  company,
  currentOR,
  flow,
  players,
  isDone,
  isSelected,
  isUnestablished,
  canExpand,
  orderLocked,
  finalORCompleted,
  establishedIndex,
  establishedCompanyOrder,
  handleMoveOrderUp,
  handleMoveOrderDown,
  handleORRevenueChange,
  handleMarkCompanyDone,
  handleAddTrain,
  handleUpdateTrainStops,
  handleClearTrain,
  handleDeleteTrain,
  handleSetTrainRevenueToCurrentOR,
  onExpand,
  handleCompanyPeriodicIncomeChange,
}) => {
  const periodicIncome = company.periodicIncome || 0;
  const totalRevenue =
    calculateCompanyTotalORRevenue(company.orRevenues, flow.numORs) + periodicIncome * flow.numORs;

  return (
    <article
      className={`rounded-xl border p-5 shadow-ui ${
        isUnestablished
          ? 'border-border-subtle bg-surface-muted opacity-80'
          : isDone
            ? 'border-status-success/20 bg-status-success/5'
            : isSelected
              ? 'border-brand-accent/30 bg-brand-accent-soft/60'
              : 'border-border-subtle bg-surface-elevated'
      } border-l-4 ${getCompanyAccentEdgeClass(getCompanyColor(company))}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-lg ${getColorTextClass(getCompanyColor(company))}`}>
              {getCompanySymbol(company)}
            </span>
            <h3 className="text-lg font-semibold text-text-primary">
              {getCompanyDisplayName(company)}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {isUnestablished ? (
              <StatusBadge className="border-border-subtle bg-surface-elevated text-text-secondary">
                未設立
              </StatusBadge>
            ) : null}
            {isDone ? (
              <StatusBadge className="border-status-success/20 bg-status-success/10 text-status-success">
                完了
              </StatusBadge>
            ) : (
              <StatusBadge className="border-brand-accent/20 bg-brand-accent-soft text-brand-primary">
                処理中
              </StatusBadge>
            )}
            <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
              総収益 {totalRevenue}
            </StatusBadge>
            <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
              定期 +{periodicIncome}/OR
            </StatusBadge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            disabled={orderLocked || isUnestablished || establishedIndex === 0}
            onClick={() => handleMoveOrderUp(company.id)}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            disabled={
              orderLocked ||
              isUnestablished ||
              establishedIndex === establishedCompanyOrder.length - 1
            }
            onClick={() => handleMoveOrderDown(company.id)}
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 px-4"
            disabled={!canExpand}
            aria-expanded={isSelected}
            onClick={onExpand}
          >
            {isSelected ? '詳細を表示中' : '詳細を開く'}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
          <p className="mb-2 text-sm font-medium text-text-secondary">現在の OR{currentOR} 収益</p>
          <RevenueControl
            company={company}
            orNum={currentOR}
            disabled={isUnestablished}
            compact
            inputIdPrefix="or-summary"
            labelMode="summary"
            handleORRevenueChange={handleORRevenueChange}
          />
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
          <p className="mb-2 text-sm font-medium text-text-secondary">企業定期収入（ORごと）</p>
          <CommittedNumberInput
            min="0"
            value={periodicIncome}
            onCommit={(nextValue) => handleCompanyPeriodicIncomeChange(company.id, nextValue)}
            className="min-h-11 w-28 text-center text-base"
            aria-label={`${getCompanyDisplayName(company)}の企業定期収入`}
            disabled={isUnestablished}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[240px]">
          <div className="rounded-lg border border-border-subtle bg-surface-muted px-4 py-3 text-sm">
            <p className="text-text-secondary">列車計算</p>
            <p className="font-semibold text-status-success">
              {calculateCompanyTrainRevenue(company.trains || [])}
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-muted px-4 py-3 text-sm">
            <p className="text-text-secondary">保有株主数</p>
            <p className="font-semibold text-text-primary">
              {
                (company.stockHoldings || []).filter(
                  (holding) => getHoldingPercentage(company, holding.playerId) > 0
                ).length
              }
            </p>
          </div>
        </div>
      </div>

      {isSelected ? (
        <div className="mt-5 space-y-4 border-t border-border-subtle pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-base font-semibold text-brand-primary">
              実行企業: {getCompanyDisplayName(company)}
            </h4>
            <Button
              type="button"
              disabled={isDone || finalORCompleted}
              onClick={() => handleMarkCompanyDone(company.id)}
            >
              この企業を完了
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: flow.numORs }, (_, index) => {
              const orNum = index + 1;
              return (
                <div
                  key={orNum}
                  className="rounded-lg border border-border-subtle bg-surface-muted px-4 py-3"
                >
                  <RevenueControl
                    company={company}
                    orNum={orNum}
                    inputIdPrefix="or-detail"
                    handleORRevenueChange={handleORRevenueChange}
                  />
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-brand-accent/20 bg-surface-muted p-5 shadow-ui">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h5 className="font-medium text-brand-primary">列車計算</h5>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleAddTrain(company.id)}
                >
                  列車追加
                </Button>
                <Button type="button" onClick={() => handleSetTrainRevenueToCurrentOR(company.id)}>
                  計算値をOR{currentOR}へ反映
                </Button>
              </div>
            </div>
            <p className="mb-3 text-sm text-text-secondary">
              列車計算合計:
              <span className="ml-1 font-semibold text-status-success">
                {calculateCompanyTrainRevenue(company.trains || [])}
              </span>
            </p>
            {(company.trains || []).length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-subtle bg-surface-elevated p-4 text-sm text-text-secondary">
                まだ列車がありません。列車追加から経路入力を始めてください。
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {(company.trains || []).map((train, trainIndex) => (
                  <TrainEditor
                    key={train.id}
                    train={train}
                    trainIndex={trainIndex}
                    onUpdateStops={(newStops) =>
                      handleUpdateTrainStops(company.id, train.id, newStops)
                    }
                    onClear={() => handleClearTrain(company.id, train.id)}
                    onDelete={() => handleDeleteTrain(company.id, train.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
            <p className="mb-2 text-sm text-text-secondary">配当試算（全OR合計ベース）</p>
            <ul className="space-y-1 text-sm">
              {players.map((player) => {
                const percentage = getHoldingPercentage(company, player.id);
                const dividend = calculateDividend(totalRevenue, percentage);
                return (
                  <li key={player.id} className="flex items-center justify-between gap-2">
                    <span
                      className={`flex-1 rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 border-l-4 ${getPlayerAccentEdgeClass(
                        getPlayerColor(player)
                      )}`}
                    >
                      {getPlayerSymbol(player)} {getPlayerDisplayName(player)} ({percentage}%)
                    </span>
                    <span className="font-semibold text-status-success">{dividend}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </article>
  );
};

const OrRoundView = ({
  players,
  companies,
  flow,
  activeCycle,
  handleMoveOrderUp,
  handleMoveOrderDown,
  handleRebalanceRemaining,
  handleMarkCompanyDone,
  handleORRevenueChange,
  handleAddTrain,
  handleUpdateTrainStops,
  handleClearTrain,
  handleDeleteTrain,
  handleSetTrainRevenueToCurrentOR,
  handleStartNextCycle,
  handlePlayerPeriodicIncomeChange,
  handleCompanyPeriodicIncomeChange,
}) => {
  const currentOR = activeCycle.currentOR;
  const companyOrder = activeCycle.companyOrder || [];
  const companiesById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );
  const knownOrder = companyOrder.filter((companyId) => companiesById.has(companyId));
  const missingCompanyIds = companies
    .map((company) => company.id)
    .filter((companyId) => !knownOrder.includes(companyId));
  const normalizedOrder = [...knownOrder, ...missingCompanyIds];
  const establishedCompanyOrder = normalizedOrder.filter(
    (companyId) => !companiesById.get(companyId)?.isUnestablished
  );
  const unestablishedCompanyOrder = normalizedOrder.filter(
    (companyId) => companiesById.get(companyId)?.isUnestablished
  );
  const displayCompanyOrder = [...establishedCompanyOrder, ...unestablishedCompanyOrder];
  const establishedSet = new Set(establishedCompanyOrder);
  const completed = (activeCycle.completedCompanyIdsByOR?.[currentOR] || []).filter((companyId) =>
    establishedSet.has(companyId)
  );
  const hasEstablishedCompanies = establishedCompanyOrder.length > 0;
  const orderLocked = completed.length > 0;
  const finalORCompleted =
    hasEstablishedCompanies &&
    flow.numORs > 0 &&
    currentOR === flow.numORs &&
    (activeCycle.completedCompanyIdsByOR?.[flow.numORs] || []).filter((companyId) =>
      establishedSet.has(companyId)
    ).length === establishedCompanyOrder.length;

  const [rebalanceMode, setRebalanceMode] = useState(false);
  const [draftRemaining, setDraftRemaining] = useState([]);
  const remainingCompanyIds = establishedCompanyOrder.filter(
    (companyId) => !completed.includes(companyId)
  );
  const preferredLocalSelectedCompanyId = remainingCompanyIds.includes(
    activeCycle.selectedCompanyId
  )
    ? activeCycle.selectedCompanyId
    : remainingCompanyIds[0] || null;
  const [localSelectedCompanyId, setLocalSelectedCompanyId] = useState(
    preferredLocalSelectedCompanyId
  );

  useEffect(() => {
    if (rebalanceMode) {
      setDraftRemaining(remainingCompanyIds);
    }
  }, [rebalanceMode, remainingCompanyIds]);

  useEffect(() => {
    setLocalSelectedCompanyId((current) => {
      if (current && remainingCompanyIds.includes(current)) return current;
      return preferredLocalSelectedCompanyId;
    });
  }, [preferredLocalSelectedCompanyId, remainingCompanyIds]);

  const moveDraft = (targetCompanyId, direction) => {
    setDraftRemaining((prev) => {
      const index = prev.indexOf(targetCompanyId);
      if (index < 0) return prev;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  if (companies.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader size="page" className="mb-4 text-center text-brand-primary">
          OR
        </SectionHeader>
        <p className="text-center text-text-secondary">
          企業が未登録です。設定で企業を追加してください。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <SectionHeader size="page" className="mb-6 text-center text-brand-primary">
        OR
      </SectionHeader>

      <section className="mb-6 rounded-xl border border-brand-accent/15 bg-[radial-gradient(circle_at_top_left,_rgba(182,138,61,0.16),_transparent_28%),linear-gradient(135deg,_rgba(16,32,51,0.98),_rgba(27,47,69,0.98))] p-6 shadow-ui-lg">
        <section className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-ui">
          <p className="mb-3 text-sm font-medium text-text-primary">プレイヤー定期収入（ORごと）</p>
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
                  onCommit={(nextValue) => handlePlayerPeriodicIncomeChange(player.id, nextValue)}
                  className="min-h-11 w-full text-center text-base"
                  aria-label={`${getPlayerDisplayName(player)}の定期収入`}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-accent/90">
              現在ラウンド
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              OR{currentOR} / OR{flow.numORs}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-accent/90">進捗</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {completed.length} / {establishedCompanyOrder.length}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-accent/90">
              未処理企業
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{remainingCompanyIds.length}</p>
          </div>
        </div>

        {!hasEstablishedCompanies ? (
          <p className="mt-4 rounded-xl border border-status-warning/25 bg-status-warning/10 px-4 py-3 text-sm text-slate-100">
            OR対象企業がありません。SRで未設立を解除してください。
          </p>
        ) : null}

        {orderLocked && !rebalanceMode && !finalORCompleted && hasEstablishedCompanies ? (
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setRebalanceMode(true)}>
              順番を再調整
            </Button>
          </div>
        ) : null}

        {rebalanceMode && hasEstablishedCompanies ? (
          <div className="mt-4 rounded-lg border border-border-subtle bg-surface-muted p-4">
            <p className="mb-3 text-sm text-text-secondary">未処理企業のみ再調整できます。</p>
            <div className="space-y-2">
              {draftRemaining.map((companyId, index) => {
                const company = companiesById.get(companyId);
                if (!company) return null;
                return (
                  <div
                    key={companyId}
                    className={`flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated p-3 border-l-4 ${getCompanyAccentEdgeClass(
                      getCompanyColor(company)
                    )}`}
                  >
                    <span className="text-sm text-text-primary">
                      <span className={getColorTextClass(getCompanyColor(company))}>
                        {getCompanySymbol(company)}
                      </span>{' '}
                      {getCompanyDisplayName(company)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        disabled={index === 0}
                        onClick={() => moveDraft(companyId, 'up')}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        disabled={index === draftRemaining.length - 1}
                        onClick={() => moveDraft(companyId, 'down')}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  handleRebalanceRemaining(draftRemaining);
                  setRebalanceMode(false);
                }}
              >
                再調整を適用
              </Button>
              <Button type="button" variant="secondary" onClick={() => setRebalanceMode(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="space-y-4">
        {displayCompanyOrder.map((companyId) => {
          const company = companiesById.get(companyId);
          if (!company) return null;

          const isUnestablished = Boolean(company.isUnestablished);
          const isDone = !isUnestablished && completed.includes(companyId);
          const canExpand = !isUnestablished && !isDone && !finalORCompleted;
          const isSelected = canExpand && localSelectedCompanyId === companyId;
          const establishedIndex = establishedCompanyOrder.indexOf(companyId);

          return (
            <CompanyCard
              key={companyId}
              company={company}
              currentOR={currentOR}
              flow={flow}
              players={players}
              isDone={isDone}
              isSelected={isSelected}
              isUnestablished={isUnestablished}
              canExpand={canExpand}
              orderLocked={orderLocked}
              finalORCompleted={finalORCompleted}
              establishedIndex={establishedIndex}
              establishedCompanyOrder={establishedCompanyOrder}
              handleMoveOrderUp={handleMoveOrderUp}
              handleMoveOrderDown={handleMoveOrderDown}
              handleORRevenueChange={handleORRevenueChange}
              handleMarkCompanyDone={handleMarkCompanyDone}
              handleAddTrain={handleAddTrain}
              handleUpdateTrainStops={handleUpdateTrainStops}
              handleClearTrain={handleClearTrain}
              handleDeleteTrain={handleDeleteTrain}
              handleSetTrainRevenueToCurrentOR={handleSetTrainRevenueToCurrentOR}
              handleCompanyPeriodicIncomeChange={handleCompanyPeriodicIncomeChange}
              onExpand={() => setLocalSelectedCompanyId(companyId)}
            />
          );
        })}
      </div>

      {finalORCompleted ? (
        <div className="mt-6 flex justify-end">
          <Button type="button" size="lg" onClick={handleStartNextCycle}>
            次SR開始
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default OrRoundView;
