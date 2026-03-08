import React, { useEffect, useState } from 'react';
import {
  calculateCompanyTrainRevenue,
  calculateCompanyTotalORRevenue,
  calculateORRevenueDistribution,
  calculateTrainRevenue,
} from '../../lib/calc';
import Button from '../../components/ui/Button';
import CommittedNumberInput from '../../components/ui/CommittedNumberInput';
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
import { getHoldingPercentage } from '../../lib/companyOwnership';
import {
  DIVIDEND_PATTERNS,
  QUICK_REVENUE_ADJUSTMENTS,
  QUICK_STOP_VALUES,
  getEntryDividendMode,
  getEntryRevenue,
} from './orRoundShared';

const StatusBadge = ({ className, children }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
  >
    {children}
  </span>
);

const RevenueControl = ({ company, orNum, inputIdPrefix = 'or', handleORRevenueChange }) => {
  const currentRevenue = getEntryRevenue(company, orNum);
  const label = `${getCompanyDisplayName(company)}のOR${orNum}収益(詳細)`;
  const inputId = `${inputIdPrefix}-${orNum}-${company.id}`;

  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
        OR{orNum}
      </label>
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 px-3 py-1 text-xs"
        aria-label={`${label}を-10`}
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
        className="min-h-11 w-24 text-center text-base"
        aria-label={label}
      />
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 px-3 py-1 text-xs"
        aria-label={`${label}を+10`}
        onClick={() => handleORRevenueChange(company.id, orNum, currentRevenue + 10)}
      >
        +10
      </Button>
    </div>
  );
};

const CurrentRevenuePanel = ({ company, currentOR, handleORRevenueChange }) => {
  const companyName = getCompanyDisplayName(company);
  const currentRevenue = getEntryRevenue(company, currentOR);
  const previousOR = currentOR > 1 ? currentOR - 1 : null;
  const previousRevenue = previousOR ? getEntryRevenue(company, previousOR) : null;
  const trainRevenue = calculateCompanyTrainRevenue(company.trains || []);
  const revenueInputLabel = `${companyName}の現在OR${currentOR}収益`;

  return (
    <section className="rounded-2xl border border-brand-accent/20 bg-surface-muted p-5 shadow-ui">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary/80">
            Step 1
          </p>
          <h4 className="mt-1 text-lg font-semibold text-text-primary">現在OR収益を決める</h4>
          <p className="mt-1 text-sm text-text-secondary">
            まず収益だけ確定します。列車計算は下で確認してから反映できます。
          </p>
        </div>
        <StatusBadge className="border-border-subtle bg-surface-elevated text-text-secondary">
          列車計算値 {trainRevenue}
        </StatusBadge>
      </div>

      <div className="mt-4 space-y-3">
        {previousOR ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 px-4"
              aria-label={`${companyName}の前回OR${previousOR}収益${previousRevenue}を現在OR${currentOR}へセット`}
              onClick={() => handleORRevenueChange(company.id, currentOR, previousRevenue)}
            >
              前回OR{previousOR}: {previousRevenue}をセット
            </Button>
            <p className="text-sm text-text-secondary">
              自動コピーはしません。必要なときだけ取り込みます。
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_REVENUE_ADJUSTMENTS.map((delta) => {
              const nextValue = Math.max(0, currentRevenue + delta);
              const deltaLabel = delta > 0 ? `+${delta}` : `${delta}`;
              return (
                <Button
                  key={delta}
                  type="button"
                  variant="secondary"
                  className="min-h-11 px-3 py-1 text-sm"
                  aria-label={`${revenueInputLabel}を${deltaLabel}`}
                  onClick={() => handleORRevenueChange(company.id, currentOR, nextValue)}
                >
                  {deltaLabel}
                </Button>
              );
            })}
          </div>

          <CommittedNumberInput
            min="0"
            value={currentRevenue}
            shouldCommit={(rawValue) => `${rawValue ?? ''}`.trim() !== ''}
            onCommit={(nextValue) => handleORRevenueChange(company.id, currentOR, nextValue)}
            className="min-h-12 w-full xl:max-w-sm text-center text-lg font-semibold"
            aria-label={revenueInputLabel}
          />
        </div>
      </div>
    </section>
  );
};

const DistributionPreview = ({ company, currentOR, flow, players, handleSetORDividendMode }) => {
  const periodicIncome = company.periodicIncome ?? 0;
  const currentORRevenue = getEntryRevenue(company, currentOR);
  const currentORDividendMode = getEntryDividendMode(company, currentOR);
  const bankPoolDividendRecipient =
    flow?.bankPoolDividendRecipient === 'company' ? 'company' : 'market';
  const [isOpen, setIsOpen] = useState(true);

  const distributionPatterns = DIVIDEND_PATTERNS.map((pattern) => {
    const distribution = calculateORRevenueDistribution({
      company,
      players,
      totalRevenue: currentORRevenue,
      companyIncome: periodicIncome,
      mode: pattern.key,
      bankPoolDividendRecipient,
    });

    return {
      ...pattern,
      distribution,
      playerTotal: distribution.playerPayouts.reduce((sum, entry) => sum + entry.amount, 0),
    };
  });

  const activePattern =
    distributionPatterns.find((pattern) => pattern.key === currentORDividendMode) ||
    distributionPatterns[0];

  const playerRows = players
    .map((player) => {
      const percentage = getHoldingPercentage(company, player.id);
      const payout = activePattern.distribution.playerPayouts.find(
        (entry) => entry.playerId === player.id
      );
      const amount = payout?.amount || 0;
      return { player, percentage, amount };
    })
    .filter((row) => row.amount > 0);

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-elevated p-5 shadow-ui">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary/80">
          Step 2
        </p>
        <h4 className="mt-1 text-lg font-semibold text-text-primary">配当方式を選ぶ</h4>
        <p className="mt-1 text-sm text-text-secondary">
          収益を決めたら、配当・無配・半配当から今回の処理を選びます。
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {distributionPatterns.map((pattern) => (
          <Button
            key={pattern.key}
            type="button"
            variant={pattern.key === activePattern.key ? 'primary' : 'secondary'}
            className="min-h-[2.5rem] px-4 py-2 text-sm"
            onClick={() => handleSetORDividendMode(company.id, currentOR, pattern.key)}
          >
            {pattern.label}
          </Button>
        ))}
      </div>

      <details
        className="mt-4 rounded-xl border border-border-subtle bg-surface-muted"
        open={isOpen}
        onToggle={(event) => setIsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand-primary [&::-webkit-details-marker]:hidden">
          OR{currentOR} 収益配分プレビュー（折りたたみ）
        </summary>
        <div className="space-y-3 border-t border-border-subtle px-4 pb-4 pt-3">
          <p className="text-xs text-text-muted">
            OR{currentOR}収益 {currentORRevenue} / 企業定期収入 +{periodicIncome}
            （会社受取） / 市場株の配当受取先:{' '}
            {bankPoolDividendRecipient === 'company' ? '会社' : '市場'}
          </p>
          <section className="rounded-lg border border-border-subtle bg-surface-elevated p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h5 className="text-sm font-semibold text-brand-primary">{activePattern.label}</h5>
              <span className="text-xs text-text-muted">{activePattern.summary}</span>
            </div>
            <p className="mb-2 text-xs text-text-secondary">
              配当原資 {activePattern.distribution.distributableRevenue} / 会社留保{' '}
              {activePattern.distribution.retainedRevenue} / 定期会社受取{' '}
              {activePattern.distribution.companyIncome}
            </p>
            <p className="mb-2 text-xs text-text-secondary">
              プレイヤー配当合計 {activePattern.playerTotal} / 市場受取{' '}
              {activePattern.distribution.marketAmount} / 会社受取合計{' '}
              {activePattern.distribution.companyAmount}
            </p>
            <ul className="space-y-1 text-sm">
              {playerRows.length === 0 ? (
                <li className="rounded-md border border-dashed border-border-subtle bg-surface-muted px-3 py-2 text-text-muted">
                  プレイヤー配当なし
                </li>
              ) : (
                playerRows.map((row) => (
                  <li
                    key={`${activePattern.key}-${row.player.id}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span
                      className={`flex-1 rounded-md border border-border-subtle bg-surface-muted px-3 py-2 border-l-4 ${getPlayerAccentEdgeClass(
                        getPlayerColor(row.player)
                      )}`}
                    >
                      {getPlayerSymbol(row.player)} {getPlayerDisplayName(row.player)} (
                      {row.percentage}%)
                    </span>
                    <span className="font-semibold text-status-success">{row.amount}</span>
                  </li>
                ))
              )}
              {activePattern.distribution.treasury.amount > 0 ? (
                <li className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-muted px-3 py-2">
                  <span>自社株 ({activePattern.distribution.treasury.percentage}%)</span>
                  <span className="font-semibold text-status-success">
                    {activePattern.distribution.treasury.amount}
                  </span>
                </li>
              ) : null}
              {activePattern.distribution.bankPool.amount > 0 ? (
                <li className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-muted px-3 py-2">
                  <span>
                    市場株 ({activePattern.distribution.bankPool.percentage}%) →{' '}
                    {activePattern.distribution.bankPool.recipient === 'company' ? '会社' : '市場'}
                  </span>
                  <span className="font-semibold text-status-success">
                    {activePattern.distribution.bankPool.amount}
                  </span>
                </li>
              ) : null}
              <li className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-muted px-3 py-2">
                <span>会社受取合計</span>
                <span className="font-semibold text-brand-primary">
                  {activePattern.distribution.companyAmount}
                </span>
              </li>
            </ul>
          </section>
        </div>
      </details>
    </section>
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
    nextStops[stopIndex] = Math.max(
      0,
      (Number.parseInt(`${nextStops[stopIndex] || 0}`, 10) || 0) + delta
    );
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
                    <div className="mx-1 h-1.5 w-8 shrink-0 rounded-full bg-border-strong sm:w-10" />
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
                onClick={() => onUpdateStops(stops.filter((_, stopIndex) => stopIndex !== idx))}
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

const TrainSection = ({
  company,
  currentOR,
  handleAddTrain,
  handleUpdateTrainStops,
  handleClearTrain,
  handleDeleteTrain,
  handleSetTrainRevenueToCurrentOR,
}) => {
  const trainRevenue = calculateCompanyTrainRevenue(company.trains || []);

  return (
    <section className="rounded-2xl border border-brand-accent/20 bg-surface-muted p-5 shadow-ui">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary/80">
            Step 3
          </p>
          <h4 className="mt-1 text-lg font-semibold text-text-primary">必要なら列車計算で確認</h4>
          <p className="mt-1 text-sm text-text-secondary">
            列車ごとの地点をメモしてから、必要なときだけ現在OR収益へ反映します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => handleAddTrain(company.id)}>
            列車追加
          </Button>
          <Button type="button" onClick={() => handleSetTrainRevenueToCurrentOR(company.id)}>
            列車計算値 {trainRevenue} を現在OR{currentOR}へ反映
          </Button>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3 text-sm">
        <p className="text-text-secondary">列車計算合計</p>
        <p className="font-semibold text-status-success">{trainRevenue}</p>
      </div>
      <div className="mt-4">
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
                onUpdateStops={(newStops) => handleUpdateTrainStops(company.id, train.id, newStops)}
                onClear={() => handleClearTrain(company.id, train.id)}
                onDelete={() => handleDeleteTrain(company.id, train.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const SupplementalDetails = ({
  company,
  currentOR,
  flow,
  isCorrectionMode,
  handleORRevenueChange,
  handleSetORDividendMode,
  handleCompanyPeriodicIncomeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isCorrectionMode) {
      setIsOpen(true);
    }
  }, [company.id, isCorrectionMode]);

  return (
    <details
      className="rounded-2xl border border-border-subtle bg-surface-elevated shadow-ui"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-brand-primary [&::-webkit-details-marker]:hidden">
        {isCorrectionMode ? '補助設定 / 詳細（前OR修正はこちら）' : '補助設定 / 詳細'}
      </summary>
      <div className="space-y-5 border-t border-border-subtle px-5 pb-5 pt-4">
        {isCorrectionMode ? (
          <div className="rounded-lg border border-status-warning/20 bg-status-warning/10 px-4 py-3 text-sm text-text-primary">
            このサイクル内の前OR分は、下の「全OR入力」から修正できます。
          </div>
        ) : null}
        <section>
          <h4 className="text-base font-semibold text-text-primary">企業定期収入</h4>
          <p className="mt-1 text-sm text-text-secondary">
            配当原資には混ぜず、会社受取として扱います。
          </p>
          <div className="mt-3 max-w-xs rounded-lg border border-border-subtle bg-surface-muted p-4">
            <CommittedNumberInput
              min="0"
              value={company.periodicIncome ?? 0}
              onCommit={(nextValue) => handleCompanyPeriodicIncomeChange(company.id, nextValue)}
              className="min-h-11 w-full text-center text-base"
              aria-label={`${getCompanyDisplayName(company)}の企業定期収入`}
            />
          </div>
        </section>
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-semibold text-text-primary">全OR入力</h4>
              <p className="mt-1 text-sm text-text-secondary">
                OR{currentOR}以外の値もここで確認・調整できます。
              </p>
            </div>
            <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
              OR数 {flow.numORs}
            </StatusBadge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {DIVIDEND_PATTERNS.map((pattern) => (
                      <Button
                        key={`${orNum}-${pattern.key}`}
                        type="button"
                        variant={
                          getEntryDividendMode(company, orNum) === pattern.key
                            ? 'primary'
                            : 'secondary'
                        }
                        className="min-h-[2.25rem] px-3 py-1.5 text-xs"
                        onClick={() => handleSetORDividendMode(company.id, orNum, pattern.key)}
                      >
                        OR{orNum} {pattern.label}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </details>
  );
};

const OrRoundActivePanel = ({
  company,
  currentOR,
  flow,
  players,
  queuePosition,
  queueLength,
  establishedPosition,
  establishedCount,
  isDone,
  finalORCompleted,
  handleMarkCompanyDone,
  handleORRevenueChange,
  handleSetORDividendMode,
  handleAddTrain,
  handleUpdateTrainStops,
  handleClearTrain,
  handleDeleteTrain,
  handleSetTrainRevenueToCurrentOR,
  handleCompanyPeriodicIncomeChange,
}) => {
  const companyName = getCompanyDisplayName(company);
  const totalRevenue =
    calculateCompanyTotalORRevenue(company.orRevenues, flow.numORs) +
    (company.periodicIncome ?? 0) * flow.numORs;
  const isCorrectionMode = isDone || finalORCompleted || queuePosition <= 0;

  return (
    <article
      className={`mb-6 rounded-2xl border border-l-4 p-6 shadow-ui-lg ${getCompanyAccentEdgeClass(
        getCompanyColor(company)
      )} bg-surface-elevated`}
      style={getCompanyAccentEdgeStyle(getCompanyColor(company))}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-primary/80">
            現在操作中の企業
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`text-2xl ${getColorTextClass(getCompanyColor(company))}`}
              style={getColorTextStyle(getCompanyColor(company))}
            >
              {getCompanySymbol(company)}
            </span>
            <div>
              <h3 className="text-2xl font-semibold text-text-primary">{companyName}</h3>
              <p className="text-sm text-text-secondary">
                {isCorrectionMode
                  ? `このサイクル中なら、OR${currentOR} を含む既存入力を修正できます。前OR分は下の補助設定から直せます。`
                  : `OR${currentOR} の収益と配当方式をこの順で確定します。`}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge className="border-brand-accent/20 bg-brand-accent-soft text-brand-primary">
              OR{currentOR}
            </StatusBadge>
            {isCorrectionMode ? (
              <StatusBadge className="border-status-warning/20 bg-status-warning/10 text-text-primary">
                完了済みを修正中
              </StatusBadge>
            ) : (
              <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
                残り順 {queuePosition} / {queueLength}
              </StatusBadge>
            )}
            <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
              全体順 {establishedPosition} / {establishedCount}
            </StatusBadge>
            <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
              総収益 {totalRevenue}
            </StatusBadge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isDone || finalORCompleted}
            onClick={() => handleMarkCompanyDone(company.id)}
          >
            {isDone || finalORCompleted ? '完了済み' : 'この企業を完了'}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <CurrentRevenuePanel
          company={company}
          currentOR={currentOR}
          handleORRevenueChange={handleORRevenueChange}
        />
        <DistributionPreview
          company={company}
          currentOR={currentOR}
          flow={flow}
          players={players}
          handleSetORDividendMode={handleSetORDividendMode}
        />
        <TrainSection
          company={company}
          currentOR={currentOR}
          handleAddTrain={handleAddTrain}
          handleUpdateTrainStops={handleUpdateTrainStops}
          handleClearTrain={handleClearTrain}
          handleDeleteTrain={handleDeleteTrain}
          handleSetTrainRevenueToCurrentOR={handleSetTrainRevenueToCurrentOR}
        />
        <SupplementalDetails
          company={company}
          currentOR={currentOR}
          flow={flow}
          isCorrectionMode={isCorrectionMode}
          handleORRevenueChange={handleORRevenueChange}
          handleSetORDividendMode={handleSetORDividendMode}
          handleCompanyPeriodicIncomeChange={handleCompanyPeriodicIncomeChange}
        />
      </div>
    </article>
  );
};

export default OrRoundActivePanel;
