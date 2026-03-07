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
  onCompleteStockRound,
}) => {
  const isStockRound = mode === 'stockRound';

  return (
    <section className="mb-6 rounded-xl border border-brand-accent/15 bg-[radial-gradient(circle_at_top_left,_rgba(182,138,61,0.16),_transparent_28%),linear-gradient(135deg,_rgba(16,32,51,0.98),_rgba(27,47,69,0.98))] p-6 shadow-ui-lg">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-accent/90">
            Cycle Board
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Cycle {cycleNo} / {isStockRound ? 'SR モード' : 'OR モード'}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            {isStockRound
              ? '株式配分と定期収入を確認して、このサイクルの運営準備を整えます。'
              : '現在の実行企業を処理しながら、ORごとの収益と配分を確定します。'}
          </p>
        </div>
        {isStockRound ? (
          <Button type="button" size="lg" onClick={onCompleteStockRound}>
            SR完了してORへ
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="サイクル" value={`第${cycleNo}サイクル`} />
        <StatCard
          label="現在ラウンド"
          value={isStockRound ? 'SR' : `OR${currentOR} / OR${numORs}`}
        />
        <StatCard
          label={isStockRound ? '警告企業数' : '完了 / 残り'}
          value={
            isStockRound ? `${invalidCount}社` : `${completedCount}社完了 / ${remainingCount}社残り`
          }
          tone={isStockRound && invalidCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={isStockRound ? 'OR開始条件' : '次の目安'}
          value={
            isStockRound
              ? invalidCount > 0
                ? '警告を確認してから進行'
                : '準備完了'
              : remainingCount > 0
                ? '未処理企業を順に消化'
                : currentOR >= numORs
                  ? '次SRへ進行可能'
                  : '次ORへ進行可能'
          }
          tone={!isStockRound && remainingCount === 0 ? 'success' : 'default'}
        />
      </div>
    </section>
  );
};

export default CycleStatusHeader;
