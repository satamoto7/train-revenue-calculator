import {
  getDefaultCompanyColor,
  getDefaultCompanySymbol,
  getDefaultPlayerColor,
  getDefaultPlayerSymbol,
  getSeatLabel,
  isKnownCompanyColor,
  isKnownPlayerColor,
} from '../lib/labels';
import { inferIsUnestablished } from '../lib/companyStatus';

export const APP_STORAGE_KEY = 'trainRevenue_18xx_data';
export const APP_SCHEMA_VERSION = 4;

const DEFAULT_NUM_ORS = 2;

const buildEmptyCompletedByOR = (numORs) =>
  Array.from({ length: numORs }, (_, idx) => idx + 1).reduce((acc, orNum) => {
    acc[orNum] = [];
    return acc;
  }, {});

const createFallbackId = (prefix, index) => {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `${prefix}-${index + 1}`;
};

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
    orRevenues: Array.from({ length: numORs }, (_, idx) => {
      const orNum = idx + 1;
      const existing = Array.isArray(company?.orRevenues)
        ? company.orRevenues.find((entry) => Number(entry?.orNum) === orNum)
        : null;
      return {
        orNum,
        revenue: Number.isFinite(existing?.revenue) ? existing.revenue : 0,
      };
    }),
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

const defaultState = {
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
};

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

export function migrate(saved) {
  if (!saved || typeof saved !== 'object') {
    return { ...defaultState };
  }

  const numORs = Number.isInteger(saved?.flow?.numORs)
    ? Math.max(1, Math.min(5, saved.flow.numORs))
    : Number.isInteger(saved?.numORs)
      ? Math.max(1, Math.min(5, saved.numORs))
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
}

export function serialize(state) {
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    players: state.players || [],
    companies: state.companies || [],
    flow: state.flow || defaultState.flow,
    activeCycle: state.activeCycle || defaultState.activeCycle,
    cycleHistory: state.cycleHistory || [],
    summarySelectedCycleNo: state.summarySelectedCycleNo ?? null,
    srValidation: state.srValidation || {},
    lastUpdated: new Date().toISOString(),
  };
}
