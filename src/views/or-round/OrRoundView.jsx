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

const QUICK_STOP_VALUES = [10, 20, 30, 40, 50, 60];

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
    <div className="rounded-xl border-2 border-brand-accent/60 bg-surface-elevated p-3 shadow-ui">
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
            <div className="inline-flex min-w-max items-center rounded-lg border border-border-subtle bg-surface-muted p-2">
              {stops.map((stop, idx) => (
                <React.Fragment key={`${train.id}-preview-${idx}`}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-surface-elevated text-sm font-semibold text-text-primary shadow-sm">
                    {stop}
                  </div>
                  {idx < stops.length - 1 && (
                    <div
                      className="mx-1 h-1.5 w-8 shrink-0 rounded-full bg-black sm:w-10"
                      aria-hidden="true"
                    />
                  )}
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
            className="rounded-md border border-border-subtle bg-surface-muted p-2"
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
              <Input
                type="number"
                min="0"
                value={stop}
                onChange={(e) => {
                  const nextStops = [...stops];
                  nextStops[idx] = Number.parseInt(e.target.value || '0', 10) || 0;
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

      <div className="mb-3 rounded-lg border border-brand-accent bg-gradient-to-r from-brand-accent-soft to-surface-muted p-3">
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
          <Input
            type="number"
            min="0"
            value={customStopValue}
            placeholder="自由入力"
            className="w-full sm:w-28"
            aria-label={`列車${trainIndex + 1}のカスタム収益値`}
            onChange={(e) => setCustomStopValue(e.target.value)}
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
  const companiesById = new Map(companies.map((company) => [company.id, company]));
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
  const selectedCompany = companies.find((company) => company.id === activeCycle.selectedCompanyId);
  const selectedCompanySafe =
    selectedCompany && establishedSet.has(selectedCompany.id)
      ? selectedCompany
      : companiesById.get(establishedCompanyOrder[0]) || null;
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
  const [orRevenueDrafts, setOrRevenueDrafts] = useState({});

  const remainingCompanyIds = establishedCompanyOrder.filter(
    (companyId) => !completed.includes(companyId)
  );

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

  const getRevenueDraftKey = (companyId, orNum) => `${companyId}:${orNum}`;

  const commitORRevenueDraft = (companyId, orNum, fallbackValue) => {
    const key = getRevenueDraftKey(companyId, orNum);
    const raw = key in orRevenueDrafts ? `${orRevenueDrafts[key]}` : `${fallbackValue}`;
    const parsed = Number.parseInt(raw, 10);
    const normalized = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    handleORRevenueChange(companyId, orNum, normalized);
    setOrRevenueDrafts((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
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
            進捗: {completed.length} / {establishedCompanyOrder.length}
          </p>
        </div>

        {!hasEstablishedCompanies && (
          <p className="mb-3 rounded-md border border-status-warning/60 bg-status-warning/10 px-3 py-2 text-sm text-text-secondary">
            OR対象企業がありません。SRで未設立を解除してください。
          </p>
        )}

        {orderLocked && !rebalanceMode && !finalORCompleted && hasEstablishedCompanies && (
          <div className="mb-3 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setRebalanceMode(true)}>
              順番を再調整
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {displayCompanyOrder.map((companyId) => {
            const company = companiesById.get(companyId);
            if (!company) return null;
            const isUnestablished = Boolean(company.isUnestablished);
            const isDone = !isUnestablished && completed.includes(companyId);
            const isSelected = !isUnestablished && selectedCompanySafe?.id === companyId;
            const establishedIndex = establishedCompanyOrder.indexOf(companyId);

            return (
              <div
                key={companyId}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 ${
                  isUnestablished
                    ? 'border-border-subtle bg-surface-muted opacity-60'
                    : isSelected
                      ? 'border-brand-accent bg-brand-accent-soft'
                      : 'border-border-subtle bg-surface-muted'
                }`}
              >
                <button
                  type="button"
                  className={`flex min-w-[220px] items-center gap-2 text-left ${
                    isUnestablished ? 'cursor-not-allowed' : ''
                  }`}
                  disabled={isUnestablished}
                  onClick={() => handleSelectCompany(companyId)}
                >
                  <span className={`text-base ${getColorTextClass(getCompanyColor(company))}`}>
                    {getCompanySymbol(company)}
                  </span>
                  <span className="font-medium text-text-primary">
                    {getCompanyDisplayName(company)}
                  </span>
                  {isUnestablished && (
                    <span className="text-xs font-semibold text-text-secondary">未設立</span>
                  )}
                  {isDone && (
                    <span className="text-xs font-semibold text-status-success">完了</span>
                  )}
                </button>
                {!rebalanceMode && !isUnestablished && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      disabled={orderLocked || establishedIndex === 0}
                      onClick={() => handleMoveOrderUp(companyId)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      disabled={
                        orderLocked || establishedIndex === establishedCompanyOrder.length - 1
                      }
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

        {rebalanceMode && hasEstablishedCompanies && (
          <div className="mt-4 rounded-md border border-border-subtle bg-surface-muted p-3">
            <p className="mb-2 text-sm text-text-secondary">未処理企業のみ再調整できます。</p>
            <div className="space-y-2">
              {draftRemaining.map((companyId, index) => {
                const company = companiesById.get(companyId);
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

          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: flow.numORs }, (_, index) => {
              const orNum = index + 1;
              const currentRevenue = getEntryRevenue(selectedCompanySafe, orNum);
              const draftKey = getRevenueDraftKey(selectedCompanySafe.id, orNum);
              const draftValue =
                draftKey in orRevenueDrafts ? orRevenueDrafts[draftKey] : currentRevenue;
              return (
                <div
                  key={orNum}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-muted px-2 py-1.5"
                >
                  <label
                    htmlFor={`or-${orNum}-${selectedCompanySafe.id}`}
                    className="text-sm font-medium text-text-secondary"
                  >
                    OR{orNum}
                  </label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      aria-label={`OR${orNum}を-10`}
                      onClick={() => {
                        handleORRevenueChange(
                          selectedCompanySafe.id,
                          orNum,
                          Math.max(0, currentRevenue - 10)
                        );
                        setOrRevenueDrafts((prev) => {
                          const next = { ...prev };
                          delete next[draftKey];
                          return next;
                        });
                      }}
                    >
                      -10
                    </Button>
                    <Input
                      id={`or-${orNum}-${selectedCompanySafe.id}`}
                      type="number"
                      min="0"
                      value={draftValue}
                      onChange={(e) =>
                        setOrRevenueDrafts((prev) => ({
                          ...prev,
                          [draftKey]: e.target.value,
                        }))
                      }
                      onBlur={() =>
                        commitORRevenueDraft(selectedCompanySafe.id, orNum, currentRevenue)
                      }
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        commitORRevenueDraft(selectedCompanySafe.id, orNum, currentRevenue);
                      }}
                      className="w-20 text-center"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      aria-label={`OR${orNum}を+10`}
                      onClick={() => {
                        handleORRevenueChange(selectedCompanySafe.id, orNum, currentRevenue + 10);
                        setOrRevenueDrafts((prev) => {
                          const next = { ...prev };
                          delete next[draftKey];
                          return next;
                        });
                      }}
                    >
                      +10
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-4 rounded-xl border-2 border-brand-accent bg-gradient-to-br from-brand-accent-soft via-surface-elevated to-surface-muted p-4 shadow-ui-lg">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-medium text-brand-primary">列車計算</h4>
              <div className="h-2.5 w-16 rounded-full bg-brand-accent/70" aria-hidden="true" />
            </div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
