import React from 'react';
import Button from '../../components/ui/Button';

const CycleStatusHeader = ({
  cycleNo,
  mode,
  currentOR,
  numORs,
  completedCount,
  remainingCount,
  invalidCount,
  mergerRoundEnabled,
  greenTrainTriggered,
  onGreenTrainTriggeredChange,
  onCompleteStockRound,
}) => {
  const isStockRound = mode === 'stockRound';
  const isMergerRound = mode === 'mergerRound';
  const statusSummary = isStockRound
    ? invalidCount > 0
      ? `${invalidCount}社に確認事項`
      : 'SR準備完了'
    : isMergerRound
      ? '合併確定後に次SRへ'
      : `${completedCount}社完了 / ${remainingCount}社残り`;
  const roundLabel = isStockRound
    ? `Cycle ${cycleNo} / SR`
    : isMergerRound
      ? `Cycle ${cycleNo} / MR`
      : `Cycle ${cycleNo} / OR${currentOR} / OR${numORs}`;

  return (
    <section className="ui-panel mb-4 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="ui-chip bg-brand-soft text-brand-primary">{roundLabel}</span>
          <span className="ui-chip">{statusSummary}</span>
          {!isStockRound && !isMergerRound ? <span className="ui-chip">全体順の確認用</span> : null}
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:items-end">
          {mergerRoundEnabled ? (
            <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={greenTrainTriggered}
                onChange={(event) => onGreenTrainTriggeredChange(event.target.checked)}
                aria-label="緑列車条件達成"
                className="h-5 w-5 rounded border-border-subtle text-brand-primary focus:ring-brand-accent"
              />
              緑列車条件達成
            </label>
          ) : null}
          {isStockRound ? (
            <Button type="button" onClick={onCompleteStockRound}>
              SR完了してORへ
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CycleStatusHeader;
