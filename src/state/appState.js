import {
  getDefaultCompanyColor,
  getDefaultCompanySymbol,
  getDefaultPlayerColor,
  getDefaultPlayerSymbol,
  getSeatLabel,
  isKnownCompanyColor,
  isKnownPlayerColor,
  normalizeHexColor,
} from '../lib/labels';
import { calculateORRevenueDistribution } from '../lib/calc';
import { hasAnyStockInput, inferIsUnestablished } from '../lib/companyStatus';

export const DEFAULT_NUM_ORS = 2;
export const MAX_ORS = 5;
export const DEFAULT_DIVIDEND_MODE = 'full';
export const WORKSPACE_CONFIG = [
  { key: 'board', label: 'ボード' },
  { key: 'setup', label: '設定' },
  { key: 'history', label: '履歴' },
];

const COMPANY_TYPES = ['minor', 'major'];
const SESSION_MODES = ['stockRound', 'orRound', 'mergerRound'];
const COMPANY_STATUSES = ['active', 'available', 'retired'];

export const buildEmptyCompletedByOR = (numORs) =>
  Array.from({ length: numORs }, (_, idx) => idx + 1).reduce((acc, orNum) => {
    acc[orNum] = [];
    return acc;
  }, {});

export const parsePercent = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
};

const normalizeInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
};

const createFallbackId = (prefix, index) => {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `${prefix}-${index + 1}`;
};

const normalizeCompanyType = (companyType) =>
  COMPANY_TYPES.includes(companyType) ? companyType : 'minor';

const normalizeSessionMode = (mode) => (SESSION_MODES.includes(mode) ? mode : 'stockRound');

export const getDefaultCompanyStatus = (companyType, mergerRoundEnabled) => {
  if (!mergerRoundEnabled) return 'active';
  return companyType === 'major' ? 'available' : 'active';
};

const normalizeCompanyStatus = (companyStatus, companyType, mergerRoundEnabled) =>
  COMPANY_STATUSES.includes(companyStatus)
    ? companyStatus
    : getDefaultCompanyStatus(companyType, mergerRoundEnabled);

export const isCompanyActive = (companyState) => companyState?.companyStatus === 'active';

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

export const createCompany = (index) => ({
  id: createFallbackId('company', index),
  name: `Co${index + 1}`,
  displayName: '',
  genericIndex: index + 1,
  color: getDefaultCompanyColor(index),
  symbol: getDefaultCompanySymbol(index),
  companyType: 'minor',
});

export const createCompanyRoundState = ({
  companyType = 'minor',
  mergerRoundEnabled = false,
} = {}) => ({
  stockHoldings: [],
  presidentPlayerId: null,
  isUnestablished: true,
  treasuryStockPercentage: 0,
  bankPoolPercentage: 0,
  periodicIncome: 0,
  trains: [],
  companyStatus: getDefaultCompanyStatus(companyType, mergerRoundEnabled),
});

const createCompanyRoundStateForCompany = (company, mergerRoundEnabled) =>
  createCompanyRoundState({
    companyType: normalizeCompanyType(company?.companyType),
    mergerRoundEnabled,
  });

export const clonePlayers = (players) => players.map((player) => ({ ...player }));

export const cloneCompanies = (companies) => companies.map((company) => ({ ...company }));

export const cloneStockRoundState = (stockRoundState) => ({
  playerPeriodicIncomes: { ...(stockRoundState?.playerPeriodicIncomes || {}) },
  companyStates: Object.entries(stockRoundState?.companyStates || {}).reduce(
    (acc, [companyId, entry]) => {
      acc[companyId] = {
        stockHoldings: (entry?.stockHoldings || []).map((holding) => ({ ...holding })),
        presidentPlayerId:
          typeof entry?.presidentPlayerId === 'string' ? entry.presidentPlayerId : null,
        isUnestablished: Boolean(entry?.isUnestablished),
        treasuryStockPercentage: parsePercent(entry?.treasuryStockPercentage || 0),
        bankPoolPercentage: parsePercent(entry?.bankPoolPercentage || 0),
        periodicIncome: Math.max(0, normalizeInteger(entry?.periodicIncome, 0)),
        trains: (entry?.trains || []).map((train) => ({
          ...train,
          stops: [...(train?.stops || [])],
        })),
        companyStatus: COMPANY_STATUSES.includes(entry?.companyStatus)
          ? entry.companyStatus
          : 'active',
      };
      return acc;
    },
    {}
  ),
  validation: { ...(stockRoundState?.validation || {}) },
});

export const cloneOperatingResults = (operatingResults) =>
  Object.entries(operatingResults || {}).reduce((cycleAcc, [cycleNo, orEntries]) => {
    cycleAcc[cycleNo] = Object.entries(orEntries || {}).reduce((orAcc, [orNum, companyEntries]) => {
      orAcc[orNum] = Object.entries(companyEntries || {}).reduce(
        (companyAcc, [companyId, record]) => {
          companyAcc[companyId] = {
            ...record,
            playerPayouts: (record?.playerPayouts || []).map((entry) => ({ ...entry })),
          };
          return companyAcc;
        },
        {}
      );
      return orAcc;
    }, {});
    return cycleAcc;
  }, {});

export const syncCompanyOrder = (companyOrder, companyIds) => {
  const known = (companyOrder || []).filter((companyId) => companyIds.includes(companyId));
  const missing = companyIds.filter((companyId) => !known.includes(companyId));
  return [...known, ...missing];
};

const normalizeDividendMode = (mode) =>
  ['full', 'withhold', 'half'].includes(mode) ? mode : DEFAULT_DIVIDEND_MODE;

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

const normalizeCompany = (company, index) => {
  const genericIndex = Number.isInteger(company?.genericIndex) ? company.genericIndex : index + 1;
  const normalizedColor = normalizeHexColor(company?.color);

  return {
    ...company,
    id: company?.id || createFallbackId('company', index),
    genericIndex,
    name: company?.name || `Co${genericIndex}`,
    displayName: company?.displayName || '',
    color: isKnownCompanyColor(company?.color)
      ? normalizedColor || company.color
      : getDefaultCompanyColor(index),
    symbol: company?.symbol || getDefaultCompanySymbol(index),
    companyType: normalizeCompanyType(company?.companyType),
  };
};

const normalizeGameConfig = (gameConfig) => {
  const numORs = Number.isInteger(gameConfig?.numORs)
    ? Math.max(1, Math.min(MAX_ORS, gameConfig.numORs))
    : DEFAULT_NUM_ORS;

  return {
    players: Array.isArray(gameConfig?.players)
      ? gameConfig.players.map((player, index) => normalizePlayer(player, index))
      : [],
    companies: Array.isArray(gameConfig?.companies)
      ? gameConfig.companies.map((company, index) => normalizeCompany(company, index))
      : [],
    numORs,
    hasIpoShares: gameConfig?.hasIpoShares !== false,
    bankPoolDividendRecipient:
      gameConfig?.bankPoolDividendRecipient === 'company' ? 'company' : 'market',
    mergerRoundEnabled: Boolean(gameConfig?.mergerRoundEnabled),
    setupLocked: Boolean(gameConfig?.setupLocked),
  };
};

const normalizeCompanyRoundState = (entry, gameConfig, company) => {
  const fallback = createCompanyRoundStateForCompany(company, gameConfig?.mergerRoundEnabled);
  const normalized = {
    stockHoldings: Array.isArray(entry?.stockHoldings)
      ? entry.stockHoldings
          .map((holding) => ({
            playerId: holding?.playerId,
            percentage: parsePercent(holding?.percentage),
          }))
          .filter((holding) => typeof holding.playerId === 'string' && holding.percentage > 0)
      : fallback.stockHoldings,
    presidentPlayerId:
      typeof entry?.presidentPlayerId === 'string' ? entry.presidentPlayerId : null,
    isUnestablished:
      typeof entry?.isUnestablished === 'boolean'
        ? entry.isUnestablished
        : inferIsUnestablished(entry, gameConfig?.hasIpoShares !== false),
    treasuryStockPercentage: parsePercent(entry?.treasuryStockPercentage || 0),
    bankPoolPercentage: parsePercent(entry?.bankPoolPercentage || 0),
    periodicIncome: Math.max(0, normalizeInteger(entry?.periodicIncome, 0)),
    trains: Array.isArray(entry?.trains)
      ? entry.trains.map((train, index) => ({
          id: train?.id || createFallbackId('train', index),
          stops: Array.isArray(train?.stops)
            ? train.stops.map((stop) => Math.max(0, normalizeInteger(stop, 0)))
            : [],
        }))
      : [],
    companyStatus: normalizeCompanyStatus(
      entry?.companyStatus,
      company?.companyType,
      gameConfig?.mergerRoundEnabled
    ),
  };

  return {
    ...normalized,
    isUnestablished:
      normalized.companyStatus !== 'active'
        ? true
        : typeof entry?.isUnestablished === 'boolean'
          ? entry.isUnestablished
          : inferIsUnestablished(normalized, gameConfig?.hasIpoShares !== false),
  };
};

const normalizeOperatingState = (operatingState, numORs, companyIds) => {
  const companyOrder = syncCompanyOrder(operatingState?.companyOrder || [], companyIds);
  const currentOR = Number.isInteger(operatingState?.currentOR)
    ? Math.max(1, Math.min(numORs, operatingState.currentOR))
    : 1;

  const completedCompanyIdsByOR = Array.from({ length: numORs }, (_, idx) => idx + 1).reduce(
    (acc, orNum) => {
      const current = operatingState?.completedCompanyIdsByOR?.[orNum];
      acc[orNum] = Array.isArray(current)
        ? current.filter((companyId) => companyIds.includes(companyId))
        : [];
      return acc;
    },
    {}
  );

  const selectedCompanyId =
    typeof operatingState?.selectedCompanyId === 'string' &&
    companyIds.includes(operatingState.selectedCompanyId)
      ? operatingState.selectedCompanyId
      : companyOrder[0] || null;

  return {
    companyOrder,
    currentOR,
    completedCompanyIdsByOR,
    selectedCompanyId,
  };
};

const normalizeOperatingResults = (operatingResults, gameConfig, stockRoundState) =>
  Object.entries(operatingResults || {}).reduce((cycleAcc, [cycleNo, orEntries]) => {
    const normalizedCycleNo = Number.parseInt(cycleNo, 10);
    if (Number.isNaN(normalizedCycleNo) || normalizedCycleNo < 1) return cycleAcc;

    cycleAcc[normalizedCycleNo] = Object.entries(orEntries || {}).reduce(
      (orAcc, [orNum, entries]) => {
        const normalizedOrNum = Number.parseInt(orNum, 10);
        if (
          Number.isNaN(normalizedOrNum) ||
          normalizedOrNum < 1 ||
          normalizedOrNum > gameConfig.numORs
        ) {
          return orAcc;
        }

        orAcc[normalizedOrNum] = Object.entries(entries || {}).reduce(
          (companyAcc, [companyId, record]) => {
            if (!gameConfig.companies.some((company) => company.id === companyId)) {
              return companyAcc;
            }
            companyAcc[companyId] = buildOperatingResultRecord({
              cycleNo: normalizedCycleNo,
              orNum: normalizedOrNum,
              companyId,
              revenue: Math.max(0, normalizeInteger(record?.revenue, 0)),
              dividendMode: normalizeDividendMode(record?.dividendMode),
              isConfirmed: Boolean(record?.isConfirmed),
              gameConfig,
              stockRoundState,
            });
            return companyAcc;
          },
          {}
        );

        return orAcc;
      },
      {}
    );

    return cycleAcc;
  }, {});

const normalizeHistoryEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const gameConfigSnapshot = normalizeGameConfig(entry.gameConfigSnapshot);
  const stockRoundSnapshot = normalizeStockRoundState(entry.stockRoundSnapshot, gameConfigSnapshot);

  return {
    cycleNo: Number.isInteger(entry.cycleNo) ? entry.cycleNo : 1,
    completedAt: typeof entry.completedAt === 'string' ? entry.completedAt : null,
    gameConfigSnapshot,
    stockRoundSnapshot,
    operatingResultsSnapshot:
      normalizeOperatingResults(
        { [entry.cycleNo || 1]: entry.operatingResultsSnapshot || {} },
        gameConfigSnapshot,
        stockRoundSnapshot
      )[entry.cycleNo || 1] || {},
  };
};

export const createBaseState = () => ({
  gameConfig: {
    players: [],
    companies: [],
    numORs: DEFAULT_NUM_ORS,
    hasIpoShares: true,
    bankPoolDividendRecipient: 'market',
    mergerRoundEnabled: false,
    setupLocked: false,
  },
  session: {
    currentCycleNo: 1,
    mode: 'stockRound',
    greenTrainTriggered: false,
  },
  stockRoundState: {
    playerPeriodicIncomes: {},
    companyStates: {},
    validation: {},
  },
  operatingState: {
    companyOrder: [],
    currentOR: 1,
    completedCompanyIdsByOR: buildEmptyCompletedByOR(DEFAULT_NUM_ORS),
    selectedCompanyId: null,
  },
  operatingResults: {},
  history: [],
});

export const normalizeStockRoundState = (stockRoundState, gameConfig) => {
  const players = gameConfig?.players || [];
  const companies = gameConfig?.companies || [];
  const playerPeriodicIncomes = players.reduce((acc, player) => {
    acc[player.id] = Math.max(
      0,
      normalizeInteger(stockRoundState?.playerPeriodicIncomes?.[player.id], 0)
    );
    return acc;
  }, {});

  const companyStates = companies.reduce((acc, company) => {
    acc[company.id] = normalizeCompanyRoundState(
      stockRoundState?.companyStates?.[company.id],
      gameConfig,
      company
    );
    return acc;
  }, {});

  return {
    playerPeriodicIncomes,
    companyStates,
    validation:
      typeof stockRoundState?.validation === 'object' && stockRoundState.validation
        ? stockRoundState.validation
        : {},
  };
};

export const normalizeAppState = (saved) => {
  if (!saved || typeof saved !== 'object' || !saved.gameConfig || !saved.stockRoundState) {
    return createBaseState();
  }

  const gameConfig = normalizeGameConfig(saved.gameConfig);
  const stockRoundState = normalizeStockRoundState(saved.stockRoundState, gameConfig);
  const session = {
    currentCycleNo: Number.isInteger(saved?.session?.currentCycleNo)
      ? Math.max(1, saved.session.currentCycleNo)
      : 1,
    mode: normalizeSessionMode(saved?.session?.mode),
    greenTrainTriggered: Boolean(saved?.session?.greenTrainTriggered),
  };
  const companyIds = gameConfig.companies.map((company) => company.id);
  const operatingState = normalizeOperatingState(
    saved.operatingState,
    gameConfig.numORs,
    companyIds
  );
  const operatingResults = normalizeOperatingResults(
    saved.operatingResults,
    gameConfig,
    stockRoundState
  );
  const history = Array.isArray(saved.history)
    ? saved.history.map(normalizeHistoryEntry).filter(Boolean)
    : [];

  return {
    gameConfig,
    session: {
      ...session,
      mode: gameConfig.setupLocked ? session.mode : 'stockRound',
    },
    stockRoundState,
    operatingState: {
      ...operatingState,
      completedCompanyIdsByOR: buildEmptyCompletedByOR(gameConfig.numORs),
      ...operatingState,
    },
    operatingResults,
    history,
  };
};

export const resolveBankPoolPercentage = (companyState, hasIpoShares) => {
  if (hasIpoShares) {
    return parsePercent(companyState?.bankPoolPercentage || 0);
  }

  const playerTotal = (companyState?.stockHoldings || []).reduce(
    (sum, holding) => sum + parsePercent(holding.percentage),
    0
  );
  const treasury = parsePercent(companyState?.treasuryStockPercentage || 0);
  return Math.max(0, 100 - playerTotal - treasury);
};

export const evaluateStockValidation = (companyId, companyState, hasIpoShares) => {
  if (!isCompanyActive(companyState)) {
    return {
      companyId,
      invalid: false,
      message: 'OK',
    };
  }

  const playerTotal = (companyState?.stockHoldings || []).reduce(
    (sum, holding) => sum + parsePercent(holding.percentage),
    0
  );
  const treasury = parsePercent(companyState?.treasuryStockPercentage || 0);
  const bank = hasIpoShares
    ? parsePercent(companyState?.bankPoolPercentage || 0)
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
    companyId,
    invalid,
    message,
  };
};

export const buildStockValidationMap = (gameConfig, stockRoundState) =>
  (gameConfig?.companies || []).reduce((acc, company) => {
    acc[company.id] = evaluateStockValidation(
      company.id,
      stockRoundState?.companyStates?.[company.id],
      gameConfig?.hasIpoShares !== false
    );
    return acc;
  }, {});

export const buildOperatingResultRecord = ({
  cycleNo,
  orNum,
  companyId,
  revenue = 0,
  dividendMode = DEFAULT_DIVIDEND_MODE,
  isConfirmed = false,
  gameConfig,
  stockRoundState,
}) => {
  const companyState = stockRoundState?.companyStates?.[companyId] || createCompanyRoundState();
  const players = gameConfig?.players || [];
  const bankPoolDividendRecipient =
    gameConfig?.bankPoolDividendRecipient === 'company' ? 'company' : 'market';
  const distribution = calculateORRevenueDistribution({
    company: {
      stockHoldings: companyState.stockHoldings || [],
      treasuryStockPercentage: companyState.treasuryStockPercentage || 0,
      bankPoolPercentage: resolveBankPoolPercentage(
        companyState,
        gameConfig?.hasIpoShares !== false
      ),
    },
    players,
    totalRevenue: Math.max(0, normalizeInteger(revenue, 0)),
    companyIncome: Math.max(0, normalizeInteger(companyState.periodicIncome, 0)),
    mode: normalizeDividendMode(dividendMode),
    bankPoolDividendRecipient,
  });

  return {
    cycleNo,
    orNum,
    companyId,
    revenue: distribution.totalRevenue,
    dividendMode: distribution.mode,
    distributableRevenue: distribution.distributableRevenue,
    retainedRevenue: distribution.retainedRevenue,
    companyIncome: distribution.companyIncome,
    playerPayouts: distribution.playerPayouts.map((entry) => ({ ...entry })),
    treasuryPercentage: distribution.treasury.percentage,
    treasuryAmount: distribution.treasury.amount,
    bankPoolPercentage: distribution.bankPool.percentage,
    bankPoolAmount: distribution.bankPool.amount,
    bankPoolRecipient: distribution.bankPool.recipient,
    companyAmount: distribution.companyAmount,
    marketAmount: distribution.marketAmount,
    isConfirmed,
  };
};

export const splitCompanyOrderByEstablishment = (companyOrder, companyStates, companyIds) => {
  const normalizedOrder = syncCompanyOrder(companyOrder, companyIds).filter((companyId) =>
    isCompanyActive(companyStates?.[companyId])
  );
  const establishedIds = normalizedOrder.filter(
    (companyId) => !companyStates?.[companyId]?.isUnestablished
  );
  const unestablishedIds = normalizedOrder.filter(
    (companyId) => companyStates?.[companyId]?.isUnestablished
  );

  return {
    establishedIds,
    unestablishedIds,
    orderedIds: [...establishedIds, ...unestablishedIds],
  };
};

export const getEstablishedCompanyIds = (companyOrder, companyStates, companyIds) =>
  splitCompanyOrderByEstablishment(companyOrder, companyStates, companyIds).establishedIds;

export const getFirstEstablishedCompanyId = (companyOrder, companyStates, companyIds) =>
  getEstablishedCompanyIds(companyOrder, companyStates, companyIds)[0] || null;

export const ensureCompanyRoundStates = (companyStates, companies, mergerRoundEnabled) =>
  (companies || []).reduce((acc, company) => {
    acc[company.id] = normalizeCompanyRoundState(
      companyStates?.[company.id],
      { hasIpoShares: true, mergerRoundEnabled },
      company
    );
    return acc;
  }, {});

export const hasAnyStatefulData = (state) =>
  Array.isArray(state?.gameConfig?.players) ||
  Array.isArray(state?.gameConfig?.companies) ||
  Array.isArray(state?.history);

export const shouldAutoUnsetUnestablished = (companyState, hasIpoShares) =>
  isCompanyActive(companyState) && hasAnyStockInput(companyState, hasIpoShares);
