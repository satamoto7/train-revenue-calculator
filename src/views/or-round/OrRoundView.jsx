import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/ui/Button';
import CommittedNumberInput from '../../components/ui/CommittedNumberInput';
import MetricCard from '../../components/ui/MetricCard';
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
import OrRoundActivePanel from './OrRoundActivePanel';
import OrRoundQueueCard from './OrRoundQueueCard';

const OrRoundView = ({
  embedded = false,
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
  handleEnterMergerRound,
  handlePlayerPeriodicIncomeChange,
  handleCompanyPeriodicIncomeChange,
  handleSetORDividendMode,
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
  const remainingCompanyIds = establishedCompanyOrder.filter(
    (companyId) => !completed.includes(companyId)
  );
  const selectableCompanyIds = establishedCompanyOrder;
  const hasEstablishedCompanies = establishedCompanyOrder.length > 0;
  const orderLocked = completed.length > 0;
  const finalORCompleted =
    hasEstablishedCompanies &&
    flow.numORs > 0 &&
    currentOR === flow.numORs &&
    (activeCycle.completedCompanyIdsByOR?.[flow.numORs] || []).filter((companyId) =>
      establishedSet.has(companyId)
    ).length === establishedCompanyOrder.length;
  const preferredLocalSelectedCompanyId = remainingCompanyIds.includes(
    activeCycle.selectedCompanyId
  )
    ? activeCycle.selectedCompanyId
    : remainingCompanyIds[0] || null;

  const [rebalanceMode, setRebalanceMode] = useState(false);
  const [draftRemaining, setDraftRemaining] = useState([]);
  const [manualSelectedCompanyId, setManualSelectedCompanyId] = useState(null);
  const previousCurrentORRef = useRef(currentOR);

  useEffect(() => {
    if (rebalanceMode) {
      setDraftRemaining(remainingCompanyIds);
    }
  }, [rebalanceMode, remainingCompanyIds]);

  useEffect(() => {
    const isRoundChanged = previousCurrentORRef.current !== currentOR;
    previousCurrentORRef.current = currentOR;

    setManualSelectedCompanyId((current) => {
      if (isRoundChanged) return null;
      if (current && selectableCompanyIds.includes(current)) return current;
      return null;
    });
  }, [currentOR, selectableCompanyIds]);

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
        {!embedded ? (
          <SectionHeader size="page" className="mb-4 text-center text-brand-primary">
            OR
          </SectionHeader>
        ) : null}
        <p className="text-center text-text-secondary">
          企業が未登録です。設定で企業を追加してください。
        </p>
      </div>
    );
  }

  const activeCompanyId = selectableCompanyIds.includes(manualSelectedCompanyId)
    ? manualSelectedCompanyId
    : preferredLocalSelectedCompanyId;
  const activeCompany = activeCompanyId ? companiesById.get(activeCompanyId) : null;

  const handleMarkSelectedCompanyDone = (companyId) => {
    setManualSelectedCompanyId((current) => (current === companyId ? null : current));
    handleMarkCompanyDone(companyId);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {!embedded ? (
        <SectionHeader size="page" className="mb-6 text-center text-brand-primary">
          OR
        </SectionHeader>
      ) : null}

      <section className="ui-panel mb-6 p-5">
        <details className="rounded-2xl border border-border-subtle bg-surface-muted shadow-ui">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
            補助設定: プレイヤー定期収入
          </summary>
          <div className="grid gap-3 border-t border-border-subtle px-4 pb-4 pt-3 sm:grid-cols-2 xl:grid-cols-3">
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
        </details>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricCard
            label="現在ラウンド"
            value={`OR${currentOR} / OR${flow.numORs}`}
            hint="この画面で処理するOR"
          />
          <MetricCard
            label="進捗"
            value={`${completed.length} / ${establishedCompanyOrder.length}`}
            hint="完了済み / 対象企業"
          />
          <MetricCard
            label="未処理企業"
            value={remainingCompanyIds.length}
            hint="まだ処理していない会社数"
          />
        </div>

        {!hasEstablishedCompanies ? (
          <p className="mt-4 rounded-2xl border border-status-warning/25 bg-status-warning/10 px-4 py-3 text-sm text-text-primary">
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
                    style={getCompanyAccentEdgeStyle(getCompanyColor(company))}
                  >
                    <span className="text-sm text-text-primary">
                      <span
                        className={getColorTextClass(getCompanyColor(company))}
                        style={getColorTextStyle(getCompanyColor(company))}
                      >
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

      {activeCompany ? (
        <OrRoundActivePanel
          company={activeCompany}
          currentOR={currentOR}
          flow={flow}
          players={players}
          queuePosition={remainingCompanyIds.indexOf(activeCompanyId) + 1}
          queueLength={remainingCompanyIds.length}
          establishedPosition={establishedCompanyOrder.indexOf(activeCompanyId) + 1}
          establishedCount={establishedCompanyOrder.length}
          isDone={completed.includes(activeCompany.id)}
          finalORCompleted={finalORCompleted}
          handleMarkCompanyDone={handleMarkSelectedCompanyDone}
          handleORRevenueChange={handleORRevenueChange}
          handleSetORDividendMode={handleSetORDividendMode}
          handleAddTrain={handleAddTrain}
          handleUpdateTrainStops={handleUpdateTrainStops}
          handleClearTrain={handleClearTrain}
          handleDeleteTrain={handleDeleteTrain}
          handleSetTrainRevenueToCurrentOR={handleSetTrainRevenueToCurrentOR}
          handleCompanyPeriodicIncomeChange={handleCompanyPeriodicIncomeChange}
        />
      ) : hasEstablishedCompanies ? (
        <div className="mb-6 rounded-2xl border border-status-success/20 bg-status-success/5 p-6 shadow-ui">
          <h3 className="text-lg font-semibold text-status-success">
            このORの処理は完了しています
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            企業キューで結果を確認できます。最終ORなら次SRへ進んでください。
          </p>
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">企業キュー</h3>
          <p className="text-sm text-text-secondary">
            他社はここでは圧縮表示し、必要な企業だけ切り替えて処理します。
          </p>
        </div>

        <div className="space-y-3">
          {displayCompanyOrder.map((companyId) => {
            const company = companiesById.get(companyId);
            if (!company) return null;

            const isUnestablished = Boolean(company.isUnestablished);
            const isDone = !isUnestablished && completed.includes(companyId);

            return (
              <OrRoundQueueCard
                key={companyId}
                company={company}
                currentOR={currentOR}
                flow={flow}
                isActive={activeCompanyId === companyId}
                isDone={isDone}
                isUnestablished={isUnestablished}
                orderLocked={orderLocked}
                finalORCompleted={finalORCompleted}
                establishedIndex={establishedCompanyOrder.indexOf(companyId)}
                establishedCompanyOrder={establishedCompanyOrder}
                handleMoveOrderUp={handleMoveOrderUp}
                handleMoveOrderDown={handleMoveOrderDown}
                onSelect={() => setManualSelectedCompanyId(companyId)}
              />
            );
          })}
        </div>
      </section>

      {finalORCompleted ? (
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            size="lg"
            onClick={flow.shouldEnterMergerRound ? handleEnterMergerRound : handleStartNextCycle}
          >
            {flow.shouldEnterMergerRound ? 'Merger Roundへ' : '次SR開始'}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default OrRoundView;
