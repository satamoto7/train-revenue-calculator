import React, { useEffect, useState } from 'react';
import { calculateCompanyTotalORRevenue, calculateORRevenueDistribution } from '../../lib/calc';
import Card from '../../components/ui/Card';
import MetricCard from '../../components/ui/MetricCard';
import SectionHeader from '../../components/ui/SectionHeader';
import {
  getColorTextClass,
  getColorTextStyle,
  getCompanyColor,
  getCompanyDisplayName,
  getCompanySymbol,
  getPlayerColor,
  getPlayerDisplayName,
  getPlayerSymbol,
} from '../../lib/labels';

const getEntryRevenue = (company, orNum) =>
  (company.orRevenues || []).find((entry) => entry.orNum === orNum)?.revenue || 0;

const getEntryDividendMode = (company, orNum) => {
  const mode = (company.orDividendModes || []).find((entry) => entry.orNum === orNum)?.mode;
  if (mode === 'withhold' || mode === 'half') return mode;
  return 'full';
};

const modeShortLabelMap = {
  full: '配',
  withhold: '無',
  half: '半',
};

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
      label: `OR${cycle.cycleNo}`,
    },
    ...Array.from({ length: numORs }, (_, idx) => ({
      key: `${cycle.cycleNo}-${idx + 1}`,
      cycleNo: cycle.cycleNo,
      orNum: idx + 1,
      label: `OR${cycle.cycleNo}.${idx + 1}`,
    })),
  ]);

const SummaryView = ({ cycles, selectedCycleNo, handleSelectCycle, numORs, flow }) => {
  const viewOptions = buildViewOptions(cycles, numORs);
  const defaultViewKey =
    viewOptions.find((option) => option.cycleNo === selectedCycleNo && option.orNum === null)
      ?.key ||
    viewOptions[0]?.key ||
    '';
  const [selectedViewKey, setSelectedViewKey] = useState(defaultViewKey);

  useEffect(() => {
    if (viewOptions.some((option) => option.key === selectedViewKey)) return;
    setSelectedViewKey(defaultViewKey);
  }, [defaultViewKey, selectedViewKey, viewOptions]);

  const selectedView =
    viewOptions.find((option) => option.key === selectedViewKey) || viewOptions[0];
  const selectedCycle =
    cycles.find((cycle) => cycle.cycleNo === selectedView?.cycleNo) || cycles[0] || null;

  if (!selectedCycle || !selectedView) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeader size="page" className="mb-8 text-center text-brand-primary">
          サマリー
        </SectionHeader>
        <p className="text-center text-text-secondary">表示できるサイクルがありません。</p>
      </div>
    );
  }

  const players = selectedCycle.playersSnapshot || [];
  const companies = selectedCycle.companiesSnapshot || [];
  const bankPoolDividendRecipient =
    selectedCycle?.flowSnapshot?.bankPoolDividendRecipient === 'company'
      ? 'company'
      : flow?.bankPoolDividendRecipient === 'company'
        ? 'company'
        : 'market';

  const companyDistributionSummaries = companies.map((company) => {
    const periodicIncome = company.periodicIncome || 0;
    const perOR = Array.from({ length: numORs }, (_, idx) => {
      const orNum = idx + 1;
      const mode = getEntryDividendMode(company, orNum);
      const revenue = getEntryRevenue(company, orNum);
      const distribution = calculateORRevenueDistribution({
        company,
        players,
        totalRevenue: revenue,
        companyIncome: periodicIncome,
        mode,
        bankPoolDividendRecipient,
      });

      return { orNum, mode, revenue, distribution };
    });

    return {
      company,
      perOR,
      operatingRevenueTotal: calculateCompanyTotalORRevenue(company.orRevenues, numORs),
      companyReceivedTotal: perOR.reduce((sum, item) => sum + item.distribution.companyAmount, 0),
      marketReceivedTotal: perOR.reduce((sum, item) => sum + item.distribution.marketAmount, 0),
      periodicIncomeTotal: periodicIncome * numORs,
    };
  });

  const isTotalView = selectedView.orNum === null;
  const selectedLabel = isTotalView
    ? `OR${selectedCycle.cycleNo} 合計`
    : `OR${selectedCycle.cycleNo}.${selectedView.orNum}`;

  const playerEntries = players.map((player) => {
    const dividendReceived = companyDistributionSummaries.reduce((sum, companySummary) => {
      const relevantORs = isTotalView
        ? companySummary.perOR
        : companySummary.perOR.filter((item) => item.orNum === selectedView.orNum);

      return (
        sum +
        relevantORs.reduce((orSum, item) => {
          const payout = item.distribution.playerPayouts.find(
            (entry) => entry.playerId === player.id
          );
          return orSum + (payout?.amount || 0);
        }, 0)
      );
    }, 0);

    const periodicIncomeReceived = isTotalView
      ? (player.periodicIncome || 0) * numORs
      : player.periodicIncome || 0;

    return {
      player,
      dividendReceived,
      periodicIncomeReceived,
      totalReceived: dividendReceived + periodicIncomeReceived,
    };
  });

  const companyEntries = companyDistributionSummaries.map((summary) => {
    if (isTotalView) {
      return {
        company: summary.company,
        companyReceived: summary.companyReceivedTotal,
        revenueAmount: summary.operatingRevenueTotal,
        periodicIncomeReceived: summary.periodicIncomeTotal,
        marketReceived: summary.marketReceivedTotal,
        detail: summary.perOR
          .map(
            (item) =>
              `OR${selectedCycle.cycleNo}.${item.orNum} ${modeShortLabelMap[item.mode] || '配'}:${item.distribution.companyAmount}`
          )
          .join(' / '),
      };
    }

    const selectedOR = summary.perOR.find((item) => item.orNum === selectedView.orNum);
    return {
      company: summary.company,
      companyReceived: selectedOR?.distribution.companyAmount || 0,
      revenueAmount: selectedOR?.revenue || 0,
      periodicIncomeReceived: selectedOR?.distribution.companyIncome || 0,
      marketReceived: selectedOR?.distribution.marketAmount || 0,
      detail: `配当種別: ${modeLabelMap[selectedOR?.mode] || '配当'}`,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-6">
        <SectionHeader size="page" className="text-center text-text-primary sm:text-left">
          サマリー
        </SectionHeader>
        <p className="mt-2 text-center text-sm text-text-secondary sm:text-left">
          受取額をスマホではカード、必要なら横断表で確認します。
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="表示対象"
          value={isTotalView ? '合計表示' : '個別表示'}
          hint={selectedLabel}
        />
        <MetricCard label="プレイヤー" value={`${playerEntries.length}名`} hint="受取一覧の件数" />
        <MetricCard label="企業" value={`${companyEntries.length}社`} hint="会社別集計の件数" />
        <MetricCard
          label="市場株配当"
          value={bankPoolDividendRecipient === 'company' ? '会社受取' : '市場受取'}
          hint="市場株の受取先"
        />
      </div>

      <div className="ui-panel mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="flex flex-col gap-2 text-sm text-text-secondary" htmlFor="summary-view">
            <span className="font-medium">表示対象</span>
            <select
              id="summary-view"
              value={selectedView.key}
              onChange={(e) => {
                const nextKey = e.target.value;
                const nextView = viewOptions.find((option) => option.key === nextKey);
                setSelectedViewKey(nextKey);
                if (nextView) {
                  handleSelectCycle(nextView.cycleNo);
                }
              }}
              className="ui-select min-w-[12rem]"
            >
              {viewOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-2xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm">
            <p className="text-text-secondary">現在表示</p>
            <div className="font-semibold text-text-primary">{selectedLabel}</div>
            <p className="mt-1 text-xs text-text-muted">
              市場株の配当受取先: {bankPoolDividendRecipient === 'company' ? '会社' : '市場'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Card>
          <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
            プレイヤー受取一覧
          </SectionHeader>
          {playerEntries.length === 0 ? (
            <p className="italic text-text-muted">プレイヤーがいません。</p>
          ) : (
            <ul className="space-y-3">
              {playerEntries.map((entry) => (
                <li
                  key={entry.player.id}
                  className="rounded-2xl border border-border-subtle bg-surface-muted p-4"
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
                    <span className="text-2xl font-semibold text-brand-primary">
                      {entry.totalReceived}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    配当 {entry.dividendReceived} / 定期 {entry.periodicIncomeReceived}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
            企業受取一覧
          </SectionHeader>
          {companyEntries.length === 0 ? (
            <p className="italic text-text-muted">企業がありません。</p>
          ) : (
            <ul className="space-y-3">
              {companyEntries.map((entry) => (
                <li
                  key={entry.company.id}
                  className="rounded-2xl border border-border-subtle bg-surface-muted p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                      <span
                        className={`text-base leading-none ${getColorTextClass(
                          getCompanyColor(entry.company)
                        )}`}
                        style={getColorTextStyle(getCompanyColor(entry.company))}
                      >
                        {getCompanySymbol(entry.company)}
                      </span>
                      <span>{getCompanyDisplayName(entry.company)}</span>
                    </span>
                    <span className="text-2xl font-semibold text-brand-primary">
                      {entry.companyReceived}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    営業収益 {entry.revenueAmount} / 定期 {entry.periodicIncomeReceived} / 市場受取{' '}
                    {entry.marketReceived}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">{entry.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SummaryView;
