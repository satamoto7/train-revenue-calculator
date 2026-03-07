import React from 'react';
import Button from '../../components/ui/Button';

const StatCard = ({ label, value, tone = 'default' }) => {
  const toneClass =
    tone === 'warning'
      ? 'text-status-warning'
      : tone === 'success'
        ? 'text-status-success'
        : 'text-white';

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-accent/90">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
};

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

  return (
    <section className="mb-6 rounded-xl border border-brand-accent/15 bg-[radial-gradient(circle_at_top_left,_rgba(182,138,61,0.16),_transparent_28%),linear-gradient(135deg,_rgba(16,32,51,0.98),_rgba(27,47,69,0.98))] p-6 shadow-ui-lg">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-accent/90">
            Cycle Board
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Cycle {cycleNo} /{' '}
            {isStockRound ? 'SR モード' : isMergerRound ? 'MR モード' : 'OR モード'}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            {isStockRound
              ? '株式配分と定期収入を確認して、このサイクルの運営準備を整えます。'
              : isMergerRound
                ? 'minor 同士の合併を処理して、次の SR に引き継ぐ会社構成を確定します。'
                : '現在の実行企業を処理しながら、ORごとの収益と配分を確定します。'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          {mergerRoundEnabled ? (
            <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
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
            <Button type="button" size="lg" onClick={onCompleteStockRound}>
              SR完了してORへ
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="サイクル" value={`第${cycleNo}サイクル`} />
        <StatCard
          label="現在ラウンド"
          value={isStockRound ? 'SR' : isMergerRound ? 'MR' : `OR${currentOR} / OR${numORs}`}
        />
        <StatCard
          label={isStockRound ? '警告企業数' : isMergerRound ? '合併準備' : '完了 / 残り'}
          value={
            isStockRound
              ? `${invalidCount}社`
              : isMergerRound
                ? 'major 登場待ち'
                : `${completedCount}社完了 / ${remainingCount}社残り`
          }
          tone={isStockRound && invalidCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={isStockRound ? 'OR開始条件' : isMergerRound ? '次の目安' : '次の目安'}
          value={
            isStockRound
              ? invalidCount > 0
                ? '警告を確認してから進行'
                : '準備完了'
              : isMergerRound
                ? '合併確定後に次SRへ'
                : remainingCount > 0
                  ? '未処理企業を順に消化'
                  : currentOR >= numORs
                    ? '次フェーズへ進行可能'
                    : '次ORへ進行可能'
          }
          tone={
            (!isStockRound && !isMergerRound && remainingCount === 0) || isMergerRound
              ? 'success'
              : 'default'
          }
        />
      </div>
    </section>
  );
};

export default CycleStatusHeader;
