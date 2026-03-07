import React, { useEffect, useMemo, useState } from 'react';
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

const modeLabelMap = {
  full: '配当',
  withhold: '無配',
  half: '半配当',
};

const getPlayerPayoutTotal = (result) =>
  (result?.playerPayouts || []).reduce((sum, entry) => sum + (entry.amount || 0), 0);

const getPlayerPayoutEntries = (result, players) =>
  (result?.playerPayouts || [])
    .filter((entry) => (entry.amount || 0) > 0)
    .map((entry) => {
      const player = (players || []).find((candidate) => candidate.id === entry.playerId);
      return {
        playerId: entry.playerId,
        label: player ? getPlayerDisplayName(player) : entry.playerId,
        amount: entry.amount || 0,
      };
    });

const getRetainedRevenue = (result) => {
  if (Number.isFinite(result?.retainedRevenue)) {
    return result.retainedRevenue;
  }

  const revenue = Number.isFinite(result?.revenue) ? result.revenue : 0;
  const distributableRevenue = Number.isFinite(result?.distributableRevenue)
    ? result.distributableRevenue
    : 0;

  if (result?.dividendMode === 'withhold') {
    return revenue;
  }

  if (result?.dividendMode === 'half') {
    return Math.max(0, revenue - distributableRevenue);
  }

  return 0;
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

const buildSheetColumns = (cycles, numORs) =>
  cycles.flatMap((cycle) =>
    Array.from({ length: numORs }, (_, index) => ({
      key: `${cycle.cycleNo}-${index + 1}`,
      cycleNo: cycle.cycleNo,
      orNum: index + 1,
      label: `${cycle.cycleNo}.${index + 1}`,
    }))
  );

const getRelevantResults = (selectedCycle, company, numORs, isTotalView, selectedOrNum) =>
  Array.from({ length: numORs }, (_, index) => {
    const orNum = index + 1;
    if (!isTotalView && selectedOrNum !== orNum) return null;
    return selectedCycle.operatingResultsSnapshot?.[`${orNum}`]?.[company.id] || null;
  }).filter(Boolean);

const buildPlayerEntries = (
  players,
  companies,
  selectedCycle,
  numORs,
  isTotalView,
  selectedOrNum
) =>
  players.map((player) => {
    const periodicIncome = player.periodicIncome || 0;
    const relevantResults = companies.flatMap((company) =>
      getRelevantResults(selectedCycle, company, numORs, isTotalView, selectedOrNum)
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

const buildCompanyEntries = (companies, selectedCycle, numORs, isTotalView, selectedOrNum) =>
  companies.map((company) => {
    const relevantResults = getRelevantResults(
      selectedCycle,
      company,
      numORs,
      isTotalView,
      selectedOrNum
    );

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

const buildSheetRows = (companies, cycles, numORs) =>
  companies.map((company) => ({
    company,
    cells: cycles.flatMap((cycle) =>
      Array.from({ length: numORs }, (_, index) => {
        const orNum = index + 1;
        return {
          key: `${cycle.cycleNo}-${orNum}-${company.id}`,
          cycleNo: cycle.cycleNo,
          orNum,
          result: cycle.operatingResultsSnapshot?.[`${orNum}`]?.[company.id] || null,
        };
      })
    ),
  }));

const SpreadsheetView = ({
  companies,
  cycles,
  numORs,
  selectedView,
  selectedCycle,
  playerEntries,
  companyEntries,
}) => {
  const columns = useMemo(() => buildSheetColumns(cycles, numORs), [cycles, numORs]);
  const rows = useMemo(
    () => buildSheetRows(companies, cycles, numORs),
    [companies, cycles, numORs]
  );
  const playersByCycle = useMemo(
    () => new Map(cycles.map((cycle) => [cycle.cycleNo, cycle.gameConfigSnapshot?.players || []])),
    [cycles]
  );

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border-subtle px-6 py-4">
          <SectionHeader size="section" as="h3" className="text-brand-primary">
            スプレッドシート表示
          </SectionHeader>
          <p className="mt-1 text-sm text-text-secondary">
            全サイクルの各 OR
            を企業行で横並び表示します。各セルに収益、配当種別、配分内訳を表示します。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-muted text-left">
                <th className="sticky left-0 z-10 border-b border-r border-border-subtle bg-surface-muted px-4 py-3 font-semibold text-text-primary">
                  企業
                </th>
                {columns.map((column) => {
                  const isSelectedColumn =
                    selectedView.orNum !== null &&
                    selectedView.cycleNo === column.cycleNo &&
                    selectedView.orNum === column.orNum;
                  const isCurrentCycleColumn =
                    selectedView.orNum === null && selectedCycle.cycleNo === column.cycleNo;

                  return (
                    <th
                      key={column.key}
                      className={`border-b border-border-subtle px-4 py-3 text-center font-semibold text-text-primary ${
                        isSelectedColumn || isCurrentCycleColumn
                          ? 'bg-brand-accent-soft/70'
                          : 'bg-surface-muted'
                      }`}
                      scope="col"
                    >
                      {column.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.company.id} className="align-top">
                  <th
                    className="sticky left-0 z-10 border-b border-r border-border-subtle bg-surface-elevated px-4 py-3 text-left"
                    scope="row"
                  >
                    <span className="inline-flex items-center gap-2 font-medium text-text-primary">
                      <span
                        className={`text-base leading-none ${getColorTextClass(
                          getCompanyColor(row.company)
                        )}`}
                      >
                        {getCompanySymbol(row.company)}
                      </span>
                      <span>{getCompanyDisplayName(row.company)}</span>
                    </span>
                  </th>
                  {row.cells.map((cell) => {
                    const isSelectedCell =
                      selectedView.orNum !== null &&
                      selectedView.cycleNo === cell.cycleNo &&
                      selectedView.orNum === cell.orNum;
                    const isSelectedCycle =
                      selectedView.orNum === null && selectedCycle.cycleNo === cell.cycleNo;
                    const playerPayoutEntries = getPlayerPayoutEntries(
                      cell.result,
                      playersByCycle.get(cell.cycleNo)
                    );

                    return (
                      <td
                        key={cell.key}
                        className={`border-b border-border-subtle px-4 py-3 align-top ${
                          isSelectedCell || isSelectedCycle
                            ? 'bg-brand-soft/30'
                            : 'bg-surface-elevated'
                        }`}
                      >
                        {cell.result ? (
                          <div className="min-w-[10rem] text-left">
                            <p className="font-semibold text-text-primary">{cell.result.revenue}</p>
                            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-text-muted">
                              <p>{modeLabelMap[cell.result.dividendMode] || '配当'}</p>
                              <p>
                                原 {cell.result.distributableRevenue || 0} / 留{' '}
                                {getRetainedRevenue(cell.result)}
                              </p>
                            </div>
                            <p className="mt-2 text-xs text-text-secondary">
                              人 {getPlayerPayoutTotal(cell.result)} / 会{' '}
                              {cell.result.companyAmount || 0} / 市 {cell.result.marketAmount || 0}
                            </p>
                            <div className="mt-2 space-y-1 text-xs text-text-secondary">
                              {playerPayoutEntries.length > 0 ? (
                                playerPayoutEntries.map((entry) => (
                                  <p key={`${cell.key}-${entry.playerId}`}>
                                    {entry.label} {entry.amount}
                                  </p>
                                ))
                              ) : (
                                <p>プレイヤー配当なし</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Card>
          <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
            プレイヤー受取詳細
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
            企業受取詳細
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

const SummaryView = ({ playerEntries, companyEntries }) => (
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
);

const HistoryView = ({ cycles, numORs }) => {
  const viewOptions = useMemo(() => buildViewOptions(cycles, numORs), [cycles, numORs]);
  const [selectedViewKey, setSelectedViewKey] = useState(viewOptions[0]?.key || '');
  const [displayMode, setDisplayMode] = useState('summary');

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
  const playerEntries = buildPlayerEntries(
    players,
    companies,
    selectedCycle,
    numORs,
    isTotalView,
    selectedView.orNum
  );
  const companyEntries = buildCompanyEntries(
    companies,
    selectedCycle,
    numORs,
    isTotalView,
    selectedView.orNum
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <SectionHeader size="page" className="mb-8 text-center text-brand-primary">
        履歴
      </SectionHeader>

      <div className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-5 shadow-ui">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label
              className="flex flex-col gap-2 text-sm text-text-secondary"
              htmlFor="history-view"
            >
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

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={displayMode === 'summary' ? 'primary' : 'secondary'}
                onClick={() => setDisplayMode('summary')}
              >
                通常表示
              </Button>
              <Button
                type="button"
                variant={displayMode === 'sheet' ? 'primary' : 'secondary'}
                onClick={() => setDisplayMode('sheet')}
              >
                スプレッドシート表示
              </Button>
            </div>
          </div>

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

      {displayMode === 'sheet' ? (
        <SpreadsheetView
          companies={companies}
          cycles={cycles}
          numORs={numORs}
          selectedView={selectedView}
          selectedCycle={selectedCycle}
          playerEntries={playerEntries}
          companyEntries={companyEntries}
        />
      ) : (
        <SummaryView playerEntries={playerEntries} companyEntries={companyEntries} />
      )}
    </div>
  );
};

export default HistoryView;
