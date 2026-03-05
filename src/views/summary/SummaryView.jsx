import React from 'react';
import { calculateCompanyTotalORRevenue, calculateORRevenueDistribution } from '../../lib/calc';
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

const getEntryRevenue = (company, orNum) =>
  (company.orRevenues || []).find((entry) => entry.orNum === orNum)?.revenue || 0;

const getEntryDividendMode = (company, orNum) => {
  const mode = (company.orDividendModes || []).find((entry) => entry.orNum === orNum)?.mode;
  if (mode === 'withhold' || mode === 'half') return mode;
  return 'full';
};

const modeLabelMap = {
  full: '配',
  withhold: '無',
  half: '半',
};

const SummaryView = ({ cycles, selectedCycleNo, handleSelectCycle, numORs, flow }) => {
  const selectedCycle = cycles.find((cycle) => cycle.cycleNo === selectedCycleNo) || cycles[0];

  if (!selectedCycle) {
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

    const companyReceivedTotal = perOR.reduce(
      (sum, item) => sum + item.distribution.companyAmount,
      0
    );
    const marketReceivedTotal = perOR.reduce(
      (sum, item) => sum + item.distribution.marketAmount,
      0
    );
    const totalRevenueAcrossORs =
      calculateCompanyTotalORRevenue(company.orRevenues, numORs) + periodicIncome * numORs;
    const orDetails = perOR
      .map((item) => `OR${item.orNum}: ${item.revenue}(${modeLabelMap[item.mode] || '配'})`)
      .join(', ');

    return {
      company,
      perOR,
      companyReceivedTotal,
      marketReceivedTotal,
      totalRevenueAcrossORs,
      orDetails: `${orDetails} / 定期: ${periodicIncome} x ${numORs}`,
    };
  });

  const playerDividends = players.map((player) => {
    const totalDividend = companyDistributionSummaries.reduce(
      (sum, companySummary) =>
        sum +
        companySummary.perOR.reduce((orSum, item) => {
          const payout = item.distribution.playerPayouts.find(
            (entry) => entry.playerId === player.id
          );
          return orSum + (payout?.amount || 0);
        }, 0),
      0
    );
    const periodicIncomeTotal = (player.periodicIncome || 0) * numORs;
    return {
      ...player,
      totalDividend,
      periodicIncomeTotal,
      totalIncome: totalDividend + periodicIncomeTotal,
    };
  });

  const sortedPlayerDividends = [...playerDividends].sort((a, b) => b.totalIncome - a.totalIncome);

  const companySummaries = [...companyDistributionSummaries].sort(
    (a, b) => b.totalRevenueAcrossORs - a.totalRevenueAcrossORs
  );

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <SectionHeader size="page" className="mb-8 text-center text-brand-primary">
        サマリー
      </SectionHeader>

      <div className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-5 shadow-ui">
        <label
          className="flex flex-wrap items-center gap-3 text-sm text-text-secondary"
          htmlFor="summary-cycle"
        >
          <span className="font-medium">表示サイクル</span>
          <select
            id="summary-cycle"
            value={selectedCycle.cycleNo}
            onChange={(e) => handleSelectCycle(Number.parseInt(e.target.value, 10))}
            className="ui-select"
          >
            {cycles.map((cycle) => (
              <option key={cycle.cycleNo} value={cycle.cycleNo}>
                サイクル {cycle.cycleNo} {cycle.isCompleted ? '(完了)' : '(進行中)'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card>
          <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
            プレイヤー別総収入
          </SectionHeader>
          {players.length === 0 && <p className="italic text-text-muted">プレイヤーがいません。</p>}
          <ul className="space-y-3">
            {sortedPlayerDividends.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-muted p-4"
              >
                <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                  <span
                    className={`text-base leading-none ${getColorTextClass(getPlayerColor(player))}`}
                  >
                    {getPlayerSymbol(player)}
                  </span>
                  <span className="text-ui-xs text-text-muted">({getPlayerColor(player)})</span>
                  <span>{getPlayerDisplayName(player)}</span>
                </span>
                <span className="text-lg font-semibold text-brand-primary">
                  {player.totalIncome}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
            企業別総収益
          </SectionHeader>
          {companies.length === 0 && <p className="italic text-text-muted">企業がありません。</p>}
          <ul className="space-y-3">
            {companySummaries.map((summary) => (
              <li
                key={summary.company.id}
                className="rounded-lg border border-border-subtle bg-surface-muted p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                    <span
                      className={`text-base leading-none ${getColorTextClass(
                        getCompanyColor(summary.company)
                      )}`}
                    >
                      {getCompanySymbol(summary.company)}
                    </span>
                    <span className="text-ui-xs text-text-muted">
                      ({getCompanyColor(summary.company)})
                    </span>
                    <span>{getCompanyDisplayName(summary.company)}</span>
                  </span>
                  <span className="text-lg font-semibold text-brand-primary">
                    {summary.totalRevenueAcrossORs}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-muted">{summary.orDetails}</p>
                <p className="mt-1 text-xs text-text-secondary">
                  会社受取 {summary.companyReceivedTotal} / 市場受取 {summary.marketReceivedTotal}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default SummaryView;
