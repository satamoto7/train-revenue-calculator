import React from 'react';
import { calculateCompanyTotalORRevenue, calculateDividend } from '../../lib/calc';
import Button from '../../components/ui/Button';
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

const SummaryView = ({ players, companies, numORs, onNavigateToManagement }) => {
  const setupSteps = [
    { label: 'プレイヤー追加', done: players.length > 0 },
    { label: '企業追加', done: companies.length > 0 },
  ];

  const playerDividends = players.map((player) => {
    let totalDividendFromAllORs = 0;
    companies.forEach((company) => {
      const companyTotalRevenueAcrossORs = calculateCompanyTotalORRevenue(
        company.orRevenues,
        numORs
      );

      const holding = (company.stockHoldings || []).find((sh) => sh.playerId === player.id);
      if (holding && holding.percentage > 0) {
        totalDividendFromAllORs += calculateDividend(
          companyTotalRevenueAcrossORs,
          holding.percentage
        );
      }
    });
    return { ...player, totalDividend: totalDividendFromAllORs };
  });

  const sortedPlayerDividends = [...playerDividends].sort(
    (a, b) => b.totalDividend - a.totalDividend
  );

  const companySummaries = companies
    .map((company) => {
      const totalRevenueAcrossORs = calculateCompanyTotalORRevenue(company.orRevenues, numORs);
      const orDetails = Array.from({ length: numORs }, (_, idx) => {
        const orNum = idx + 1;
        const orEntry = (company.orRevenues || []).find((or) => or.orNum === orNum);
        return `OR${orNum}: ${orEntry?.revenue || 0}`;
      }).join(', ');
      return {
        ...company,
        totalRevenueAcrossORs,
        orDetails,
      };
    })
    .sort((a, b) => b.totalRevenueAcrossORs - a.totalRevenueAcrossORs);

  if (players.length === 0 && companies.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <Card className="border-brand-soft text-center">
          <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
            はじめに
          </SectionHeader>
          <p className="text-base text-text-secondary mb-6">
            ゲームを開始するには、まず「全般管理」タブでプレイヤーと企業を登録してください。
          </p>
          <ul className="mb-6 space-y-2 text-left">
            {setupSteps.map((step) => (
              <li
                key={step.label}
                className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2"
              >
                <span className="text-sm text-text-primary">{step.label}</span>
                <span
                  className={`text-ui-xs font-semibold ${step.done ? 'text-status-success' : 'text-text-muted'}`}
                >
                  {step.done ? '完了' : '未完了'}
                </span>
              </li>
            ))}
          </ul>
          <Button onClick={onNavigateToManagement} size="lg">
            セットアップを始める
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <SectionHeader size="page" className="mb-8 text-center text-brand-primary">
        サマリー (全 {numORs} OR合計)
      </SectionHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
            プレイヤー別総配当
          </SectionHeader>
          {players.length === 0 && <p className="italic text-text-muted">プレイヤーがいません。</p>}
          <ul className="space-y-3">
            {sortedPlayerDividends.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-muted p-3 shadow-sm"
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
                  {player.totalDividend}
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
                className="rounded-md border border-border-subtle bg-surface-muted p-3 shadow-sm"
              >
                <div className="flex justify-between items-center">
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
