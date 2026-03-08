import React from 'react';
import { calculateCompanyTotalORRevenue } from '../../lib/calc';
import Button from '../../components/ui/Button';
import {
  getCompanyAccentEdgeClass,
  getCompanyAccentEdgeStyle,
  getColorTextClass,
  getColorTextStyle,
  getCompanyColor,
  getCompanyDisplayName,
  getCompanySymbol,
} from '../../lib/labels';
import { getDividendLabel, getEntryDividendMode, getEntryRevenue } from './orRoundShared';

const StatusBadge = ({ className, children }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
  >
    {children}
  </span>
);

const OrRoundQueueCard = ({
  company,
  currentOR,
  flow,
  isActive,
  isDone,
  isUnestablished,
  orderLocked,
  finalORCompleted,
  establishedIndex,
  establishedCompanyOrder,
  handleMoveOrderUp,
  handleMoveOrderDown,
  onSelect,
}) => {
  const companyName = getCompanyDisplayName(company);
  const currentRevenue = getEntryRevenue(company, currentOR);
  const currentDividendMode = getEntryDividendMode(company, currentOR);
  const totalRevenue =
    calculateCompanyTotalORRevenue(company.orRevenues, flow.numORs) +
    (company.periodicIncome ?? 0) * flow.numORs;
  const canOpen = !isUnestablished;
  const openLabel = isUnestablished
    ? '未設立'
    : isDone || finalORCompleted
      ? '完了済みを開く'
      : 'この会社を開く';

  return (
    <article
      className={`rounded-xl border p-4 shadow-ui ${
        isUnestablished
          ? 'border-border-subtle bg-surface-muted opacity-80'
          : isDone
            ? 'border-status-success/20 bg-status-success/5'
            : isActive
              ? 'border-brand-accent/30 bg-brand-accent-soft/50'
              : 'border-border-subtle bg-surface-elevated'
      } border-l-4 ${getCompanyAccentEdgeClass(getCompanyColor(company))}`}
      style={getCompanyAccentEdgeStyle(getCompanyColor(company))}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-lg ${getColorTextClass(getCompanyColor(company))}`}
              style={getColorTextStyle(getCompanyColor(company))}
            >
              {getCompanySymbol(company)}
            </span>
            <h3 className="text-lg font-semibold text-text-primary">{companyName}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {isUnestablished ? (
              <StatusBadge className="border-border-subtle bg-surface-elevated text-text-secondary">
                未設立
              </StatusBadge>
            ) : null}
            {isDone ? (
              <StatusBadge className="border-status-success/20 bg-status-success/10 text-status-success">
                完了
              </StatusBadge>
            ) : isActive ? (
              <StatusBadge className="border-brand-accent/20 bg-brand-accent-soft text-brand-primary">
                操作中
              </StatusBadge>
            ) : (
              <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
                待機中
              </StatusBadge>
            )}
            <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
              OR{currentOR} 収益 {currentRevenue}
            </StatusBadge>
            <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
              {getDividendLabel(currentDividendMode)}
            </StatusBadge>
            <StatusBadge className="border-border-subtle bg-surface-muted text-text-secondary">
              総収益 {totalRevenue}
            </StatusBadge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            disabled={orderLocked || isUnestablished || establishedIndex === 0}
            onClick={() => handleMoveOrderUp(company.id)}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-2 py-1 text-xs"
            disabled={
              orderLocked ||
              isUnestablished ||
              establishedIndex === establishedCompanyOrder.length - 1
            }
            onClick={() => handleMoveOrderDown(company.id)}
          >
            ↓
          </Button>

          {isActive ? (
            <Button type="button" variant="secondary" className="min-h-11 px-4" disabled>
              操作中
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 px-4"
              disabled={!canOpen}
              onClick={onSelect}
            >
              {openLabel}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default OrRoundQueueCard;
