import {
  getDefaultCompanyColor,
  getDefaultCompanySymbol,
  getDefaultPlayerColor,
  getDefaultPlayerSymbol,
  getSeatLabel,
  isKnownCompanyColor,
  isKnownPlayerColor,
} from '../lib/labels';
import { hasAnyStockInput, inferIsUnestablished } from '../lib/companyStatus';

export const DEFAULT_NUM_ORS = 2;
export const MAX_ORS = 5;

export const STEP_CONFIG = [
  { key: 'setup', label: '設定' },
  { key: 'stockRound', label: 'SR株式' },
  { key: 'orRound', label: 'OR実行' },
  { key: 'summary', label: 'サマリー' },
];

export const buildEmptyCompletedByOR = (numORs) =>
  Array.from({ length: numORs }, (_, idx) => idx + 1).reduce((acc, orNum) => {
    acc[orNum] = [];
    return acc;
  }, {});

export const buildORRevenues = (numORs, currentOrRevenues = []) =>
  Array.from({ length: numORs }, (_, idx) => {
    const orNum = idx + 1;
    const existing = currentOrRevenues.find((orRevenue) => Number(orRevenue?.orNum) === orNum);
    return existing || { orNum, revenue: 0 };
  });

export const parsePercent = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
};

const createFallbackId = (prefix, index) => {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `${prefix}-${index + 1}`;
};

export const createPlayer = (index) => {
  const seatLabel = getSeatLabel(index);
  return {
    id: createFallbackId('player', index),
    seatLabel,
    displayName: `Player ${seatLabel}`,
    name: `Player ${seatLabel}`,
    color: getDefaultPlayerColor(index),
    symbol: getDefaultPlayerSymbol(index),
  };
};

export const createCompany = (index, numORs) => ({
  id: createFallbackId('company', index),
  name: `Co${index + 1}`,
  displayName: '',
  genericIndex: index + 1,
  color: getDefaultCompanyColor(index),
  symbol: getDefaultCompanySymbol(index),
  abbr: '',
  templateId: null,
  icon: null,
  trains: [],
  stockHoldings: [],
  isUnestablished: true,
  treasuryStockPercentage: 0,
  bankPoolPercentage: 0,
  ipoPercentage: 100,
  orRevenues: buildORRevenues(numORs),
});

export const cloneCompanies = (companies) =>
  companies.map((company) => ({
    ...company,
    trains: (company.trains || []).map((train) => ({
      ...train,
      stops: [...(train.stops || [])],
    })),
    stockHoldings: (company.stockHoldings || []).map((holding) => ({ ...holding })),
    orRevenues: (company.orRevenues || []).map((orRevenue) => ({ ...orRevenue })),
  }));

export const clonePlayers = (players) => players.map((player) => ({ ...player }));

export const evaluateStockValidation = (company, hasIpoShares) => {
  const playerTotal = (company.stockHoldings || []).reduce(
    (sum, holding) => sum + parsePercent(holding.percentage),
    0
  );
  const treasury = parsePercent(company.treasuryStockPercentage || 0);
  const bank = hasIpoShares
    ? parsePercent(company.bankPoolPercentage || 0)
    : 100 - playerTotal - treasury;
  const ipo = hasIpoShares ? 100 - playerTotal - treasury - bank : 0;

  const invalid = bank < 0 || ipo < 0 || playerTotal + treasury + bank > 100;
  let message = 'OK';
  if (invalid) {
    message =
      playerTotal + treasury + bank > 100
        ? '配分合計が100%を超えています。'
        : '自動計算値が負になっています。';
  }

  return {
    companyId: company.id,
    invalid,
    message,
  };
};

export const buildStockValidationMap = (companies, hasIpoShares) =>
  companies.reduce((acc, company) => {
    const result = evaluateStockValidation(company, hasIpoShares);
    acc[company.id] = result;
    return acc;
  }, {});

export const syncCompanyOrder = (companyOrder, companies) => {
  const companyIds = companies.map((company) => company.id);
  const known = (companyOrder || []).filter((companyId) => companyIds.includes(companyId));
  const missing = companyIds.filter((companyId) => !known.includes(companyId));
  return [...known, ...missing];
};

export const resolveIsUnestablished = (company, hasIpoShares) =>
  typeof company?.isUnestablished === 'boolean'
    ? company.isUnestablished
    : inferIsUnestablished(company, hasIpoShares);

export const splitCompanyOrderByEstablishment = (companyOrder, companies) => {
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const known = (companyOrder || []).filter((companyId) => companiesById.has(companyId));
  const missing = companies
    .map((company) => company.id)
    .filter((companyId) => !known.includes(companyId));
  const normalizedOrder = [...known, ...missing];

  const establishedIds = normalizedOrder.filter(
    (companyId) => !companiesById.get(companyId)?.isUnestablished
  );
  const unestablishedIds = normalizedOrder.filter(
    (companyId) => companiesById.get(companyId)?.isUnestablished
  );

  return {
    establishedIds,
    unestablishedIds,
    orderedIds: [...establishedIds, ...unestablishedIds],
  };
};

export const getFirstEstablishedCompanyId = (companyOrder, companies) =>
  splitCompanyOrderByEstablishment(companyOrder, companies).establishedIds[0] || null;

export const getEstablishedCompanyIds = (companyOrder, companies) =>
  splitCompanyOrderByEstablishment(companyOrder, companies).establishedIds;

export const createBaseState = () => ({
  players: [],
  companies: [],
  flow: {
    step: 'setup',
    setupLocked: false,
    hasIpoShares: true,
    numORs: DEFAULT_NUM_ORS,
  },
  activeCycle: {
    cycleNo: 1,
    companyOrder: [],
    currentOR: 1,
    completedCompanyIdsByOR: buildEmptyCompletedByOR(DEFAULT_NUM_ORS),
    selectedCompanyId: null,
  },
  cycleHistory: [],
  summarySelectedCycleNo: null,
  srValidation: {},
});

const normalizePlayer = (player, index) => {
  const seatLabel = player?.seatLabel || getSeatLabel(index);
  const displayName =
    player?.displayName || player?.name || (seatLabel ? `Player ${seatLabel}` : 'Player');

  return {
    ...player,
    id: player?.id || createFallbackId('player', index),
    seatLabel,
    displayName,
    name: player?.name || displayName,
    color: isKnownPlayerColor(player?.color) ? player.color : getDefaultPlayerColor(index),
    symbol: player?.symbol || getDefaultPlayerSymbol(index),
  };
};

const normalizeCompany = (company, index, numORs, hasIpoShares) => {
  const genericIndex = Number.isInteger(company?.genericIndex) ? company.genericIndex : index + 1;
  const normalized = {
    ...company,
    id: company?.id || createFallbackId('company', index),
    genericIndex,
    name: company?.name || `Co${genericIndex}`,
    displayName: company?.displayName || '',
    color: isKnownCompanyColor(company?.color) ? company.color : getDefaultCompanyColor(index),
    symbol: company?.symbol || getDefaultCompanySymbol(index),
    treasuryStockPercentage: Number.isFinite(company?.treasuryStockPercentage)
      ? company.treasuryStockPercentage
      : 0,
    bankPoolPercentage: Number.isFinite(company?.bankPoolPercentage)
      ? company.bankPoolPercentage
      : 0,
    ipoPercentage: Number.isFinite(company?.ipoPercentage) ? company.ipoPercentage : 0,
    trains: Array.isArray(company?.trains) ? company.trains : [],
    stockHoldings: Array.isArray(company?.stockHoldings) ? company.stockHoldings : [],
    orRevenues: buildORRevenues(
      numORs,
      Array.isArray(company?.orRevenues) ? company.orRevenues : []
    ),
  };

  return {
    ...normalized,
    isUnestablished:
      typeof company?.isUnestablished === 'boolean'
        ? company.isUnestablished
        : inferIsUnestablished(normalized, hasIpoShares),
  };
};

const normalizeFlow = (flow, numORs) => ({
  step: ['setup', 'stockRound', 'orRound', 'summary'].includes(flow?.step) ? flow.step : 'setup',
  setupLocked: Boolean(flow?.setupLocked),
  hasIpoShares: flow?.hasIpoShares !== false,
  numORs,
});

const normalizeCycleHistoryEntry = (entry, historyIndex, numORs, hasIpoShares) => ({
  cycleNo: Number.isInteger(entry?.cycleNo) ? entry.cycleNo : historyIndex + 1,
  completedAt: typeof entry?.completedAt === 'string' ? entry.completedAt : null,
  playersSnapshot: Array.isArray(entry?.playersSnapshot)
    ? entry.playersSnapshot.map((player, index) => normalizePlayer(player, index))
    : [],
  companiesSnapshot: Array.isArray(entry?.companiesSnapshot)
    ? entry.companiesSnapshot.map((company, index) =>
        normalizeCompany(company, index, numORs, hasIpoShares)
      )
    : [],
});

export const normalizeAppState = (saved) => {
  if (!saved || typeof saved !== 'object') {
    return createBaseState();
  }

  const numORs = Number.isInteger(saved?.flow?.numORs)
    ? Math.max(1, Math.min(MAX_ORS, saved.flow.numORs))
    : Number.isInteger(saved?.numORs)
      ? Math.max(1, Math.min(MAX_ORS, saved.numORs))
      : DEFAULT_NUM_ORS;

  const players = Array.isArray(saved.players)
    ? saved.players.map((player, index) => normalizePlayer(player, index))
    : [];
  const hasIpoShares = saved?.flow?.hasIpoShares !== false;
  const companies = Array.isArray(saved.companies)
    ? saved.companies.map((company, index) =>
        normalizeCompany(company, index, numORs, hasIpoShares)
      )
    : [];

  const fallbackOrder = companies.map((company) => company.id);
  const existingOrder = Array.isArray(saved?.activeCycle?.companyOrder)
    ? saved.activeCycle.companyOrder.filter((companyId) => fallbackOrder.includes(companyId))
    : [];
  const companyOrder = [
    ...existingOrder,
    ...fallbackOrder.filter((companyId) => !existingOrder.includes(companyId)),
  ];

  const cycleNo = Number.isInteger(saved?.activeCycle?.cycleNo)
    ? saved.activeCycle.cycleNo
    : Number.isInteger(saved?.cycleNo)
      ? saved.cycleNo
      : 1;

  const currentOR = Number.isInteger(saved?.activeCycle?.currentOR)
    ? Math.max(1, Math.min(numORs, saved.activeCycle.currentOR))
    : 1;

  const completedCompanyIdsByOR = Array.from({ length: numORs }, (_, idx) => idx + 1).reduce(
    (acc, orNum) => {
      const source = saved?.activeCycle?.completedCompanyIdsByOR?.[orNum];
      acc[orNum] = Array.isArray(source)
        ? source.filter((companyId) => companyOrder.includes(companyId))
        : [];
      return acc;
    },
    {}
  );

  const selectedCompanyId =
    saved?.activeCycle?.selectedCompanyId &&
    companyOrder.includes(saved.activeCycle.selectedCompanyId)
      ? saved.activeCycle.selectedCompanyId
      : companyOrder[0] || null;

  const flow = normalizeFlow(saved.flow, numORs);

  const cycleHistory = Array.isArray(saved.cycleHistory)
    ? saved.cycleHistory.map((entry, historyIndex) =>
        normalizeCycleHistoryEntry(entry, historyIndex, numORs, hasIpoShares)
      )
    : [];

  const summarySelectedCycleNo = Number.isInteger(saved.summarySelectedCycleNo)
    ? saved.summarySelectedCycleNo
    : null;

  return {
    players,
    companies,
    flow,
    activeCycle: {
      cycleNo,
      companyOrder,
      currentOR,
      completedCompanyIdsByOR,
      selectedCompanyId,
    },
    cycleHistory,
    summarySelectedCycleNo,
    srValidation:
      typeof saved.srValidation === 'object' && saved.srValidation ? saved.srValidation : {},
  };
};

export const hasAnyStatefulData = (state) =>
  Array.isArray(state?.players) ||
  Array.isArray(state?.companies) ||
  Array.isArray(state?.cycleHistory);

export const shouldAutoUnsetUnestablished = (company, hasIpoShares) =>
  hasAnyStockInput(company, hasIpoShares);
