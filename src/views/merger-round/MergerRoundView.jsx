import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../components/ui/Button';
import CommittedNumberInput from '../../components/ui/CommittedNumberInput';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  getCompanyAccentEdgeClass,
  getCompanyAccentEdgeStyle,
  getCompanyColor,
  getCompanyDisplayName,
  getCompanySymbol,
  getPlayerDisplayName,
  getPlayerSymbol,
} from '../../lib/labels';
import { getHoldingPercentage } from '../../lib/companyOwnership';

const buildInitialHoldings = (players) =>
  players.reduce((acc, player) => {
    acc[player.id] = 0;
    return acc;
  }, {});

const parseNumeric = (value) => {
  const parsed = Number.parseInt(`${value}`.trim(), 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
};

const CompanySummaryCard = ({ company, players }) => (
  <article
    className={`rounded-xl border border-l-4 bg-surface-elevated p-4 shadow-ui ${getCompanyAccentEdgeClass(
      getCompanyColor(company)
    )}`}
    style={getCompanyAccentEdgeStyle(getCompanyColor(company))}
  >
    <h3 className="text-base font-semibold text-text-primary">
      <span className="mr-2">{getCompanySymbol(company)}</span>
      {getCompanyDisplayName(company)}
    </h3>
    <p className="mt-2 text-sm text-text-secondary">定期収入: {company.periodicIncome || 0}</p>
    <ul className="mt-3 space-y-1 text-sm text-text-secondary">
      {players.map((player) => (
        <li key={player.id}>
          {getPlayerSymbol(player)} {getPlayerDisplayName(player)}:{' '}
          {getHoldingPercentage(company, player.id)}%
        </li>
      ))}
      <li>自社株: {company.treasuryStockPercentage || 0}%</li>
      <li>市場株: {company.bankPoolPercentage || 0}%</li>
      <li>列車: {(company.trains || []).length}本</li>
    </ul>
  </article>
);

const MergerRoundView = ({
  players,
  minorCandidates,
  majorCandidates,
  hasIpoShares,
  onCommitMerge,
  onComplete,
}) => {
  const [sourceAId, setSourceAId] = useState('');
  const [sourceBId, setSourceBId] = useState('');
  const [targetMajorId, setTargetMajorId] = useState('');
  const [holdings, setHoldings] = useState(() => buildInitialHoldings(players));
  const [treasuryStockPercentage, setTreasuryStockPercentage] = useState(0);
  const [bankPoolPercentage, setBankPoolPercentage] = useState(0);
  const [periodicIncome, setPeriodicIncome] = useState(0);
  const [selectedTrainIds, setSelectedTrainIds] = useState([]);

  const minorById = useMemo(
    () => new Map((minorCandidates || []).map((company) => [company.id, company])),
    [minorCandidates]
  );
  const majorById = useMemo(
    () => new Map((majorCandidates || []).map((company) => [company.id, company])),
    [majorCandidates]
  );

  const sourceA = sourceAId ? minorById.get(sourceAId) : null;
  const sourceB = sourceBId ? minorById.get(sourceBId) : null;
  const selectedTrains = useMemo(
    () => [...(sourceA?.trains || []), ...(sourceB?.trains || [])],
    [sourceA, sourceB]
  );

  useEffect(() => {
    setHoldings(buildInitialHoldings(players));
  }, [players]);

  useEffect(() => {
    const nextPeriodicIncome = (sourceA?.periodicIncome || 0) + (sourceB?.periodicIncome || 0);
    setPeriodicIncome(nextPeriodicIncome);
    setSelectedTrainIds([]);
  }, [sourceA, sourceB]);

  useEffect(() => {
    if (sourceAId && !minorById.has(sourceAId)) setSourceAId('');
    if (sourceBId && !minorById.has(sourceBId)) setSourceBId('');
    if (targetMajorId && !majorById.has(targetMajorId)) setTargetMajorId('');
  }, [majorById, minorById, sourceAId, sourceBId, targetMajorId]);

  const selectedMinorIds = [sourceAId, sourceBId].filter(Boolean);
  const playerTotal = players.reduce(
    (sum, player) => sum + parseNumeric(holdings[player.id] || 0),
    0
  );
  const bankValue = hasIpoShares
    ? bankPoolPercentage
    : Math.max(0, 100 - playerTotal - treasuryStockPercentage);
  const total = playerTotal + treasuryStockPercentage + bankValue;
  const hasValidSelection =
    sourceA &&
    sourceB &&
    sourceA.id !== sourceB.id &&
    targetMajorId &&
    majorById.has(targetMajorId);
  const hasValidDistribution = total <= 100;

  const handleCommit = () => {
    if (!hasValidSelection || !hasValidDistribution) return;

    const trains = selectedTrains
      .filter((train) => selectedTrainIds.includes(train.id))
      .map((train) => ({
        ...train,
        stops: [...(train.stops || [])],
      }));

    onCommitMerge({
      sourceCompanyIds: selectedMinorIds,
      targetCompanyId: targetMajorId,
      stockHoldings: players
        .map((player) => ({
          playerId: player.id,
          percentage: parseNumeric(holdings[player.id] || 0),
        }))
        .filter((holding) => holding.percentage > 0),
      treasuryStockPercentage,
      bankPoolPercentage: bankValue,
      periodicIncome,
      trains,
    });

    setSourceAId('');
    setSourceBId('');
    setTargetMajorId('');
    setHoldings(buildInitialHoldings(players));
    setTreasuryStockPercentage(0);
    setBankPoolPercentage(0);
    setPeriodicIncome(0);
    setSelectedTrainIds([]);
  };

  if ((minorCandidates || []).length < 2 || (majorCandidates || []).length < 1) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 shadow-ui">
        <SectionHeader size="section" as="h3" className="text-brand-primary">
          Merger Round
        </SectionHeader>
        <p className="mt-3 text-sm text-text-secondary">
          合併できる minor 2社と未使用 major がそろっていません。必要ならこのまま次SRへ進めます。
        </p>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onComplete}>
            Merger Round終了
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-accent/20 bg-surface-elevated p-6 shadow-ui-lg">
        <SectionHeader size="section" as="h3" className="text-brand-primary">
          Merger Round
        </SectionHeader>
        <p className="mt-2 text-sm text-text-secondary">
          合法な組み合わせは手動判断です。minor 2社と合併先 major
          を選び、合併後の株式配分を入力してください。
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="text-sm text-text-secondary" htmlFor="merge-source-a">
            <span className="mb-2 block font-medium">minor 1</span>
            <select
              id="merge-source-a"
              value={sourceAId}
              onChange={(event) => setSourceAId(event.target.value)}
              className="ui-select w-full"
            >
              <option value="">選択してください</option>
              {minorCandidates.map((company) => (
                <option key={company.id} value={company.id}>
                  {getCompanyDisplayName(company)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-text-secondary" htmlFor="merge-source-b">
            <span className="mb-2 block font-medium">minor 2</span>
            <select
              id="merge-source-b"
              value={sourceBId}
              onChange={(event) => setSourceBId(event.target.value)}
              className="ui-select w-full"
            >
              <option value="">選択してください</option>
              {minorCandidates.map((company) => (
                <option key={company.id} value={company.id} disabled={company.id === sourceAId}>
                  {getCompanyDisplayName(company)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-text-secondary" htmlFor="merge-target-major">
            <span className="mb-2 block font-medium">合併先 major</span>
            <select
              id="merge-target-major"
              value={targetMajorId}
              onChange={(event) => setTargetMajorId(event.target.value)}
              className="ui-select w-full"
            >
              <option value="">選択してください</option>
              {majorCandidates.map((company) => (
                <option key={company.id} value={company.id}>
                  {getCompanyDisplayName(company)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {(sourceA || sourceB) && (
        <section className="grid gap-4 lg:grid-cols-2">
          {sourceA ? <CompanySummaryCard company={sourceA} players={players} /> : null}
          {sourceB ? <CompanySummaryCard company={sourceB} players={players} /> : null}
        </section>
      )}

      <section className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 shadow-ui">
        <SectionHeader size="section" as="h3" className="text-brand-primary">
          合併後 major の入力
        </SectionHeader>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="rounded-lg border border-border-subtle bg-surface-muted p-4"
              >
                <label className="block text-sm font-medium text-text-primary">
                  {getPlayerSymbol(player)} {getPlayerDisplayName(player)}
                </label>
                <CommittedNumberInput
                  min="0"
                  max="100"
                  step="10"
                  value={holdings[player.id] || 0}
                  onCommit={(nextValue) =>
                    setHoldings((current) => ({ ...current, [player.id]: parseNumeric(nextValue) }))
                  }
                  className="mt-2 min-h-11 w-full text-center"
                  aria-label={`${getPlayerDisplayName(player)}の合併後保有率`}
                />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
              <label
                htmlFor="merged-treasury-stock"
                className="block text-sm font-medium text-text-primary"
              >
                自社株
              </label>
              <CommittedNumberInput
                id="merged-treasury-stock"
                min="0"
                max="100"
                step="10"
                value={treasuryStockPercentage}
                onCommit={(nextValue) => setTreasuryStockPercentage(parseNumeric(nextValue))}
                className="mt-2 min-h-11 w-full text-center"
                aria-label="合併後自社株"
              />
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
              <label
                htmlFor="merged-bank-pool"
                className="block text-sm font-medium text-text-primary"
              >
                市場株 {hasIpoShares ? '' : '(自動計算)'}
              </label>
              {hasIpoShares ? (
                <CommittedNumberInput
                  id="merged-bank-pool"
                  min="0"
                  max="100"
                  step="10"
                  value={bankPoolPercentage}
                  onCommit={(nextValue) => setBankPoolPercentage(parseNumeric(nextValue))}
                  className="mt-2 min-h-11 w-full text-center"
                  aria-label="合併後市場株"
                />
              ) : (
                <p className="mt-2 rounded-lg border border-border-subtle bg-surface-elevated px-3 py-3 text-center font-semibold text-text-primary">
                  {bankValue}%
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
              <label
                htmlFor="merged-periodic-income"
                className="block text-sm font-medium text-text-primary"
              >
                企業定期収入
              </label>
              <CommittedNumberInput
                id="merged-periodic-income"
                min="0"
                value={periodicIncome}
                onCommit={(nextValue) =>
                  setPeriodicIncome(Math.max(0, Number.parseInt(nextValue, 10) || 0))
                }
                className="mt-2 min-h-11 w-full text-center"
                aria-label="合併後企業定期収入"
              />
            </div>

            <div
              className={`rounded-lg border p-4 text-sm ${
                hasValidDistribution
                  ? 'border-status-success/20 bg-status-success/5 text-text-secondary'
                  : 'border-status-danger/20 bg-status-danger/5 text-status-danger'
              }`}
            >
              配分合計: {total}% {hasValidDistribution ? '' : '100%を超えています。'}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 shadow-ui">
        <SectionHeader size="section" as="h3" className="text-brand-primary">
          列車の移し替え
        </SectionHeader>
        {selectedTrains.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">
            選択中 minor に列車データはありません。
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedTrains.map((train, index) => (
              <label
                key={train.id}
                className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-muted p-4 text-sm text-text-secondary"
              >
                <input
                  type="checkbox"
                  checked={selectedTrainIds.includes(train.id)}
                  onChange={(event) =>
                    setSelectedTrainIds((current) =>
                      event.target.checked
                        ? [...current, train.id]
                        : current.filter((id) => id !== train.id)
                    )
                  }
                  aria-label={`列車${index + 1}を合併後 major に残す`}
                  className="mt-1 h-5 w-5 rounded border-border-subtle text-brand-primary focus:ring-brand-accent"
                />
                <div>
                  <p className="font-medium text-text-primary">列車 {index + 1}</p>
                  <p>経路: {(train.stops || []).join(' + ') || '未入力'}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onComplete}>
          Merger Round終了
        </Button>
        <Button
          type="button"
          disabled={!hasValidSelection || !hasValidDistribution}
          onClick={handleCommit}
        >
          合併を確定
        </Button>
      </div>
    </div>
  );
};

export default MergerRoundView;
