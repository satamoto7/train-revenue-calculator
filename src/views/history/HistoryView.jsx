import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  getColorTextClass,
  getCompanyColor,
  getCompanyDisplayName,
  getCompanySymbol,
  getPlayerColor,
  getPlayerDisplayName,
  getPlayerSymbol,
} from '../../lib/labels';

const modeLabelMap = {
  full: '配当',
  withhold: '無配',
  half: '半配当',
};

const buildViewOptions = (cycles, numORs) =>
  cycles.flatMap((cycle) => [
    {
      key: `${cycle.cycleNo}-total`,
      cycleNo: cycle.cycleNo,
      orNum: null,
      label: `Cycle ${cycle.cycleNo}`,
    },
    ...Array.from({ length: numORs }, (_, idx) => ({
      key: `${cycle.cycleNo}-${idx + 1}`,
      cycleNo: cycle.cycleNo,
      orNum: idx + 1,
      label: `Cycle ${cycle.cycleNo}.OR${idx + 1}`,
    })),
  ]);

const HistoryView = ({ cycles, numORs }) => {
  const viewOptions = useMemo(() => buildViewOptions(cycles, numORs), [cycles, numORs]);
  const [selectedViewKey, setSelectedViewKey] = useState(viewOptions[0]?.key || '');

  useEffect(() => {
    if (viewOptions.some((option) => option.key === selectedViewKey)) return;
    setSelectedViewKey(viewOptions[0]?.key || '');
  }, [selectedViewKey, viewOptions]);

  const selectedView =
    viewOptions.find((option) => option.key === selectedViewKey) || viewOptions[0] || null;
  const selectedCycle =
    cycles.find((cycle) => cycle.cycleNo === selectedView?.cycleNo) || cycles[0] || null;

  if (!selectedCycle || !selectedView) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader size="page" className="mb-8 text-center text-brand-primary">
          履歴
        </SectionHeader>
        <p className="text-center text-text-secondary">まだ表示できる履歴がありません。</p>
      </div>
    );
  }

  const players = selectedCycle.gameConfigSnapshot.players || [];
  const companies = selectedCycle.gameConfigSnapshot.companies || [];
  const isTotalView = selectedView.orNum === null;

  const playerEntries = players.map((player) => {
    const periodicIncome = player.periodicIncome || 0;
    const relevantResults = companies.flatMap((company) =>
      Array.from({ length: numORs }, (_, index) => {
        const orNum = index + 1;
        if (!isTotalView && selectedView.orNum !== orNum) return null;
        return selectedCycle.operatingResultsSnapshot?.[`${orNum}`]?.[company.id] || null;
      }).filter(Boolean)
    );

    const dividendReceived = relevantResults.reduce((sum, result) => {
      const payout = (result.playerPayouts || []).find((entry) => entry.playerId === player.id);
      return sum + (payout?.amount || 0);
    }, 0);
    const periodicIncomeReceived = isTotalView ? periodicIncome * numORs : periodicIncome;

    return {
      player,
      dividendReceived,
      periodicIncomeReceived,
      totalReceived: dividendReceived + periodicIncomeReceived,
    };
  });

  const companyEntries = companies.map((company) => {
    const relevantResults = Array.from({ length: numORs }, (_, index) => {
      const orNum = index + 1;
      if (!isTotalView && selectedView.orNum !== orNum) return null;
      return selectedCycle.operatingResultsSnapshot?.[`${orNum}`]?.[company.id] || null;
    }).filter(Boolean);

    const companyReceived = relevantResults.reduce(
      (sum, result) => sum + (result.companyAmount || 0),
      0
    );
    const marketReceived = relevantResults.reduce(
      (sum, result) => sum + (result.marketAmount || 0),
      0
    );
    const operatingRevenue = relevantResults.reduce(
      (sum, result) => sum + (result.revenue || 0),
      0
    );
    const detail = relevantResults.length
      ? relevantResults
          .map(
            (result) =>
              `OR${result.orNum}: ${modeLabelMap[result.dividendMode] || '配当'} / 配当原資 ${result.distributableRevenue}`
          )
          .join(' / ')
      : '結果未入力';

    return {
      company,
      companyReceived,
      marketReceived,
      operatingRevenue,
      detail,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <SectionHeader size="page" className="mb-8 text-center text-brand-primary">
        履歴
      </SectionHeader>

      <div className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-5 shadow-ui">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="flex flex-col gap-2 text-sm text-text-secondary" htmlFor="history-view">
            <span className="font-medium">表示対象</span>
            <select
              id="history-view"
              value={selectedViewKey}
              onChange={(event) => setSelectedViewKey(event.target.value)}
              className="ui-select min-w-[14rem]"
            >
              {viewOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-border-subtle bg-surface-muted px-4 py-3 text-sm">
            <p className="text-text-secondary">現在表示</p>
            <p className="font-semibold text-text-primary">
              {selectedView.label}
              {selectedCycle.isCompleted ? '' : ' (進行中)'}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              市場株の配当受取先:{' '}
              {selectedCycle.gameConfigSnapshot.bankPoolDividendRecipient === 'company'
                ? '会社'
                : '市場'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Card>
          <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
            プレイヤー受取一覧
          </SectionHeader>
          <ul className="space-y-3">
            {playerEntries.map((entry) => (
              <li
                key={entry.player.id}
                className="rounded-lg border border-border-subtle bg-surface-muted p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                    <span
                      className={`text-base leading-none ${getColorTextClass(
                        getPlayerColor(entry.player)
                      )}`}
                    >
                      {getPlayerSymbol(entry.player)}
                    </span>
                    <span>{getPlayerDisplayName(entry.player)}</span>
                  </span>
                  <span className="text-lg font-semibold text-brand-primary">
                    {entry.totalReceived}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  配当 {entry.dividendReceived} / 定期 {entry.periodicIncomeReceived}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
            企業受取一覧
          </SectionHeader>
          <ul className="space-y-3">
            {companyEntries.map((entry) => (
              <li
                key={entry.company.id}
                className="rounded-lg border border-border-subtle bg-surface-muted p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                    <span
                      className={`text-base leading-none ${getColorTextClass(
                        getCompanyColor(entry.company)
                      )}`}
                    >
                      {getCompanySymbol(entry.company)}
                    </span>
                    <span>{getCompanyDisplayName(entry.company)}</span>
                  </span>
                  <span className="text-lg font-semibold text-brand-primary">
                    {entry.companyReceived}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  営業収益 {entry.operatingRevenue} / 市場受取 {entry.marketReceived}
                </p>
                <p className="mt-1 text-xs text-text-secondary">{entry.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default HistoryView;
