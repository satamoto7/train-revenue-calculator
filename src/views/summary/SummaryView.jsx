import React from 'react';
import { calculateCompanyTotalORRevenue, calculateDividend } from '../../lib/calc';
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

const SummaryView = ({ cycles, selectedCycleNo, handleSelectCycle, numORs }) => {
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

  const playerDividends = players.map((player) => {
    let totalDividend = 0;
    const periodicIncomeTotal = (player.periodicIncome || 0) * numORs;
    companies.forEach((company) => {
      const totalRevenue = calculateCompanyTotalORRevenue(company.orRevenues, numORs);
      const holding = (company.stockHoldings || []).find((stock) => stock.playerId === player.id);
      if (holding?.percentage) {
        totalDividend += calculateDividend(totalRevenue, holding.percentage);
      }
    });

    return {
      ...player,
      totalDividend,
      periodicIncomeTotal,
      totalIncome: totalDividend + periodicIncomeTotal,
    };
  });

  const sortedPlayerDividends = [...playerDividends].sort((a, b) => b.totalIncome - a.totalIncome);

  const companySummaries = companies
    .map((company) => {
      const totalRevenueAcrossORs =
        calculateCompanyTotalORRevenue(company.orRevenues, numORs) +
        (company.periodicIncome || 0) * numORs;
      const orDetails = Array.from({ length: numORs }, (_, idx) => {
        const orNum = idx + 1;
        const entry = (company.orRevenues || []).find((orRevenue) => orRevenue.orNum === orNum);
        return `OR${orNum}: ${entry?.revenue || 0}`;
      }).join(', ');

      return {
        ...company,
        totalRevenueAcrossORs,
        orDetails: `${orDetails} / 定期: ${company.periodicIncome || 0} x ${numORs}`,
      };
    })
    .sort((a, b) => b.totalRevenueAcrossORs - a.totalRevenueAcrossORs);

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
            {companySummaries.map((company) => (
              <li
                key={company.id}
                className="rounded-lg border border-border-subtle bg-surface-muted p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                    <span
                      className={`text-base leading-none ${getColorTextClass(getCompanyColor(company))}`}
                    >
                      {getCompanySymbol(company)}
                    </span>
                    <span className="text-ui-xs text-text-muted">({getCompanyColor(company)})</span>
                    <span>{getCompanyDisplayName(company)}</span>
                  </span>
                  <span className="text-lg font-semibold text-brand-primary">
                    {company.totalRevenueAcrossORs}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-muted">{company.orDetails}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default SummaryView;
