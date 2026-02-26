import React, { useEffect, useState } from 'react';
import {
  calculateCompanyTrainRevenue,
  calculateCompanyTotalORRevenue,
  calculateDividend,
  calculateTrainRevenue,
} from '../../lib/calc';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  getCompanyDisplayName,
  getPlayerDisplayName,
  getPlayerSymbol,
  getCompanyColor,
  getCompanySymbol,
  getColorTextClass,
} from '../../lib/labels';

const getEntryRevenue = (company, orNum) => {
  const entry = (company.orRevenues || []).find((or) => or.orNum === orNum);
  return entry?.revenue ?? 0;
};

const TrainEditor = ({ train, trainIndex, onUpdateStops, onClear, onDelete }) => {
  const stops = train.stops || [];

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-muted p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-medium text-text-primary">列車 {trainIndex + 1}</p>
        <Button type="button" variant="danger" className="py-1 text-xs" onClick={onDelete}>
          削除
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {stops.map((stop, idx) => (
          <div key={`${train.id}-${idx}`} className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              value={stop}
              onChange={(e) => {
                const nextStops = [...stops];
                nextStops[idx] = Number.parseInt(e.target.value || '0', 10) || 0;
                onUpdateStops(nextStops);
              }}
              className="w-20"
              aria-label={`列車${trainIndex + 1}の地点${idx + 1}`}
            />
            <Button
              type="button"
              variant="secondary"
              className="px-2 py-1 text-xs"
              onClick={() => {
                const nextStops = stops.filter((_, stopIndex) => stopIndex !== idx);
                onUpdateStops(nextStops);
              }}
            >
              -
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="py-1 text-xs"
          onClick={() => onUpdateStops([...stops, 0])}
        >
          地点追加
        </Button>
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

const OrRoundView = ({
  players,
  companies,
  flow,
  activeCycle,
  handleSelectCompany,
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
}) => {
  const currentOR = activeCycle.currentOR;
  const companyOrder = activeCycle.companyOrder || [];
  const completed = activeCycle.completedCompanyIdsByOR?.[currentOR] || [];
  const selectedCompany = companies.find((company) => company.id === activeCycle.selectedCompanyId);
  const selectedCompanySafe =
    selectedCompany || companies.find((company) => company.id === companyOrder[0]);
  const orderLocked = completed.length > 0;
  const finalORCompleted =
    flow.numORs > 0 &&
    currentOR === flow.numORs &&
    (activeCycle.completedCompanyIdsByOR?.[flow.numORs] || []).length === companies.length;

  const [rebalanceMode, setRebalanceMode] = useState(false);
  const [draftRemaining, setDraftRemaining] = useState([]);

  const remainingCompanyIds = companyOrder.filter((companyId) => !completed.includes(companyId));

  useEffect(() => {
    if (rebalanceMode) {
      setDraftRemaining(remainingCompanyIds);
    }
  }, [rebalanceMode, remainingCompanyIds]);

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
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <SectionHeader size="page" className="mb-4 text-center text-brand-primary">
          OR実行
        </SectionHeader>
        <p className="text-center text-text-secondary">
          企業が未登録です。設定で企業を追加してください。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <SectionHeader size="page" className="mb-6 text-center text-brand-primary">
        OR実行
      </SectionHeader>

      <section className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-md">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-secondary">
            現在: OR{currentOR} / OR{flow.numORs}
          </p>
          <p className="text-sm text-text-secondary">
            進捗: {completed.length} / {companies.length}
          </p>
        </div>

        {orderLocked && !rebalanceMode && !finalORCompleted && (
          <div className="mb-3 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setRebalanceMode(true)}>
              順番を再調整
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {companyOrder.map((companyId, index) => {
            const company = companies.find((item) => item.id === companyId);
            if (!company) return null;
            const isDone = completed.includes(companyId);
            const isSelected = selectedCompanySafe?.id === companyId;

            return (
              <div
                key={companyId}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 ${isSelected ? 'border-brand-accent bg-brand-accent-soft' : 'border-border-subtle bg-surface-muted'}`}
              >
                <button
                  type="button"
                  className="flex min-w-[220px] items-center gap-2 text-left"
                  onClick={() => handleSelectCompany(companyId)}
                >
                  <span className={`text-base ${getColorTextClass(getCompanyColor(company))}`}>
                    {getCompanySymbol(company)}
                  </span>
                  <span className="font-medium text-text-primary">
                    {getCompanyDisplayName(company)}
                  </span>
                  {isDone && (
                    <span className="text-xs font-semibold text-status-success">完了</span>
                  )}
                </button>
                {!rebalanceMode && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      disabled={orderLocked || index === 0}
                      onClick={() => handleMoveOrderUp(companyId)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      disabled={orderLocked || index === companyOrder.length - 1}
                      onClick={() => handleMoveOrderDown(companyId)}
                    >
                      ↓
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {rebalanceMode && (
          <div className="mt-4 rounded-md border border-border-subtle bg-surface-muted p-3">
            <p className="mb-2 text-sm text-text-secondary">未処理企業のみ再調整できます。</p>
            <div className="space-y-2">
              {draftRemaining.map((companyId, index) => {
                const company = companies.find((item) => item.id === companyId);
                if (!company) return null;
                return (
                  <div
                    key={companyId}
                    className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-elevated p-2"
                  >
                    <span className="text-sm text-text-primary">
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
        )}
      </section>

      {selectedCompanySafe && (
        <section className="rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-md">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold text-brand-primary">
              実行企業: {getCompanyDisplayName(selectedCompanySafe)}
            </h3>
            <Button
              type="button"
              disabled={completed.includes(selectedCompanySafe.id) || finalORCompleted}
              onClick={() => handleMarkCompanyDone(selectedCompanySafe.id)}
            >
              この企業を完了
            </Button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {Array.from({ length: flow.numORs }, (_, index) => {
              const orNum = index + 1;
              return (
                <label
                  key={orNum}
                  htmlFor={`or-${orNum}-${selectedCompanySafe.id}`}
                  className="flex items-center gap-1 text-sm text-text-secondary"
                >
                  OR{orNum}
                  <Input
                    id={`or-${orNum}-${selectedCompanySafe.id}`}
                    type="number"
                    min="0"
                    value={getEntryRevenue(selectedCompanySafe, orNum)}
                    onChange={(e) =>
                      handleORRevenueChange(selectedCompanySafe.id, orNum, e.target.value)
                    }
                    className="w-24"
                  />
                </label>
              );
            })}
          </div>

          <div className="mb-4 rounded-md border border-border-subtle bg-surface-muted p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-medium text-brand-primary">列車計算</h4>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleAddTrain(selectedCompanySafe.id)}
                >
                  列車追加
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSetTrainRevenueToCurrentOR(selectedCompanySafe.id)}
                >
                  計算値をOR{currentOR}へ反映
                </Button>
              </div>
            </div>
            <p className="mb-3 text-sm text-text-secondary">
              列車計算合計:
              <span className="ml-1 font-semibold text-status-success">
                {calculateCompanyTrainRevenue(selectedCompanySafe.trains || [])}
              </span>
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(selectedCompanySafe.trains || []).map((train, trainIndex) => (
                <TrainEditor
                  key={train.id}
                  train={train}
                  trainIndex={trainIndex}
                  onUpdateStops={(newStops) =>
                    handleUpdateTrainStops(selectedCompanySafe.id, train.id, newStops)
                  }
                  onClear={() => handleClearTrain(selectedCompanySafe.id, train.id)}
                  onDelete={() => handleDeleteTrain(selectedCompanySafe.id, train.id)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border-subtle bg-surface-muted p-3">
            <p className="mb-2 text-sm text-text-secondary">配当試算（全OR合計ベース）</p>
            <ul className="space-y-1 text-sm">
              {players.map((player) => {
                const percentage = (selectedCompanySafe.stockHoldings || []).find(
                  (holding) => holding.playerId === player.id
                )?.percentage;
                const dividend = calculateDividend(
                  calculateCompanyTotalORRevenue(selectedCompanySafe.orRevenues, flow.numORs),
                  percentage || 0
                );
                return (
                  <li key={player.id} className="flex items-center justify-between">
                    <span>
                      {getPlayerSymbol(player)} {getPlayerDisplayName(player)} ({percentage || 0}%)
                    </span>
                    <span className="font-semibold text-status-success">{dividend}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {finalORCompleted && (
        <div className="mt-6 flex justify-end">
          <Button type="button" size="lg" onClick={handleStartNextCycle}>
            次SR開始
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrRoundView;
