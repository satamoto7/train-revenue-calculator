import React from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SectionHeader from '../../components/ui/SectionHeader';
import { getCompanyDisplayName, getPlayerDisplayName } from '../../lib/labels';

const getNumeric = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return parsed;
};

const StockRoundView = ({
  players,
  companies,
  hasIpoShares,
  validation,
  handleStockChange,
  handleUnestablishedChange,
  handleValidate,
  handleComplete,
}) => {
  const invalidCompanyIds = Object.values(validation || {})
    .filter((entry) => entry?.invalid)
    .map((entry) => entry.companyId);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <SectionHeader size="page" className="mb-6 text-center text-brand-primary">
        SR株式入力
      </SectionHeader>

      <p className="mb-4 rounded-md border border-border-subtle bg-surface-elevated p-3 text-sm text-text-secondary">
        企業ごとに株式配置を入力してください。合計が不自然な企業には <strong>!</strong>{' '}
        を表示します（警告のみ）。入力欄は 10
        刻み操作が基本ですが、直接入力で自由な値も設定できます。
      </p>

      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-elevated p-3 shadow-md sm:p-4">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-text-secondary">
              <th className="px-2 py-2">企業</th>
              {players.map((player) => (
                <th key={player.id} className="px-2 py-2">
                  {getPlayerDisplayName(player)}
                </th>
              ))}
              <th className="px-2 py-2">自社株</th>
              <th className="px-2 py-2">バンク</th>
              <th className="px-2 py-2">IPO</th>
              <th className="px-2 py-2">未設立</th>
              <th className="px-2 py-2">状態</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const rowValidation = validation?.[company.id];
              const bankInput = getNumeric(company.bankPoolPercentage || 0);
              const treasury = getNumeric(company.treasuryStockPercentage || 0);
              const playerTotal = players.reduce((sum, player) => {
                const percentage = (company.stockHoldings || []).find(
                  (s) => s.playerId === player.id
                )?.percentage;
                return sum + getNumeric(percentage);
              }, 0);
              const autoBank = hasIpoShares ? bankInput : 100 - playerTotal - treasury;
              const autoIpo = hasIpoShares ? 100 - playerTotal - treasury - bankInput : 0;

              return (
                <tr
                  key={company.id}
                  className={`border-b border-border-subtle ${rowValidation?.invalid ? 'bg-status-danger/10' : ''}`}
                >
                  <td className="px-2 py-2 font-medium text-text-primary">
                    {getCompanyDisplayName(company)}
                  </td>
                  {players.map((player) => {
                    const holding = (company.stockHoldings || []).find(
                      (s) => s.playerId === player.id
                    );
                    return (
                      <td key={player.id} className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="10"
                          value={holding?.percentage ?? 0}
                          onChange={(e) =>
                            handleStockChange(company.id, {
                              target: 'player',
                              playerId: player.id,
                              value: e.target.value,
                            })
                          }
                          className="w-20"
                          aria-label={`${getCompanyDisplayName(company)}の${getPlayerDisplayName(player)}保有率`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="10"
                      value={treasury}
                      onChange={(e) =>
                        handleStockChange(company.id, {
                          target: 'treasury',
                          value: e.target.value,
                        })
                      }
                      className="w-20"
                      aria-label={`${getCompanyDisplayName(company)}の自社株`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    {hasIpoShares ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="10"
                        value={bankInput}
                        onChange={(e) =>
                          handleStockChange(company.id, {
                            target: 'bank',
                            value: e.target.value,
                          })
                        }
                        className="w-20"
                        aria-label={`${getCompanyDisplayName(company)}のバンクプール`}
                      />
                    ) : (
                      <span className="inline-block rounded bg-surface-muted px-2 py-1 font-semibold text-text-secondary">
                        {autoBank}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-block rounded px-2 py-1 font-semibold ${autoIpo < 0 ? 'bg-status-danger text-white' : 'bg-surface-muted text-text-secondary'}`}
                    >
                      {autoIpo}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={Boolean(company.isUnestablished)}
                        onChange={(e) => handleUnestablishedChange(company.id, e.target.checked)}
                        aria-label={`${getCompanyDisplayName(company)}を未設立として扱う`}
                        className="h-4 w-4 rounded border-border-subtle text-brand-primary focus:ring-brand-accent"
                      />
                      未設立
                    </label>
                  </td>
                  <td className="px-2 py-2">
                    {rowValidation?.invalid ? (
                      <span className="font-bold text-status-danger" title={rowValidation.message}>
                        !
                      </span>
                    ) : (
                      <span className="font-bold text-status-success" title="正常">
                        ✓
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          警告企業数:{' '}
          <span className="font-semibold text-status-danger">{invalidCompanyIds.length}</span>
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleValidate}>
            妥当性チェック
          </Button>
          <Button type="button" onClick={handleComplete}>
            SR完了してORへ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StockRoundView;
