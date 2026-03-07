import {
  buildEmptyCompletedByOR,
  buildOperatingResultRecord,
  buildStockValidationMap,
  cloneCompanies,
  cloneOperatingResults,
  clonePlayers,
  cloneStockRoundState,
  createBaseState,
  createCompanyRoundState,
  getEstablishedCompanyIds,
  getFirstEstablishedCompanyId,
  normalizeAppState,
  parsePercent,
  shouldAutoUnsetUnestablished,
  splitCompanyOrderByEstablishment,
  syncCompanyOrder,
} from './appState';

const cloneState = (state) => ({
  ...state,
  gameConfig: {
    ...state.gameConfig,
    players: clonePlayers(state.gameConfig.players),
    companies: cloneCompanies(state.gameConfig.companies),
  },
  stockRoundState: cloneStockRoundState(state.stockRoundState),
  operatingState: {
    ...state.operatingState,
    completedCompanyIdsByOR: Object.entries(
      state.operatingState.completedCompanyIdsByOR || {}
    ).reduce((acc, [orNum, companyIds]) => {
      acc[orNum] = [...companyIds];
      return acc;
    }, {}),
  },
  operatingResults: cloneOperatingResults(state.operatingResults),
  history: [...(state.history || [])],
});

const toCycleKey = (cycleNo) => `${cycleNo}`;
const toOrKey = (orNum) => `${orNum}`;

const getCompanyIds = (state) => state.gameConfig.companies.map((company) => company.id);

const syncPlayerPeriodicIncomes = (playerPeriodicIncomes, players) =>
  players.reduce((acc, player) => {
    acc[player.id] = Number.isFinite(playerPeriodicIncomes?.[player.id])
      ? Math.max(0, Math.floor(playerPeriodicIncomes[player.id]))
      : 0;
    return acc;
  }, {});

const syncCompanyStates = (companyStates, companyIds) =>
  companyIds.reduce((acc, companyId) => {
    const current = companyStates?.[companyId];
    acc[companyId] = current
      ? {
          ...createCompanyRoundState(),
          ...current,
          stockHoldings: (current.stockHoldings || []).map((holding) => ({ ...holding })),
          trains: (current.trains || []).map((train) => ({
            ...train,
            stops: [...(train.stops || [])],
          })),
        }
      : createCompanyRoundState();
    return acc;
  }, {});

const cleanupCompanyStateForPlayers = (companyState, playerIds) => {
  const playerIdSet = new Set(playerIds);
  return {
    ...companyState,
    stockHoldings: (companyState.stockHoldings || []).filter((holding) =>
      playerIdSet.has(holding.playerId)
    ),
    presidentPlayerId: playerIdSet.has(companyState.presidentPlayerId)
      ? companyState.presidentPlayerId
      : null,
  };
};

const recomputeResults = (state, companyIds = null) => {
  const next = cloneState(state);
  const targetIds = companyIds ? new Set(companyIds) : null;

  Object.entries(next.operatingResults || {}).forEach(([cycleNo, cycleEntries]) => {
    Object.entries(cycleEntries || {}).forEach(([orNum, companyEntries]) => {
      Object.keys(companyEntries || {}).forEach((companyId) => {
        if (targetIds && !targetIds.has(companyId)) return;
        const current = next.operatingResults[cycleNo][orNum][companyId];
        next.operatingResults[cycleNo][orNum][companyId] = buildOperatingResultRecord({
          cycleNo: Number(cycleNo),
          orNum: Number(orNum),
          companyId,
          revenue: current.revenue,
          dividendMode: current.dividendMode,
          isConfirmed: current.isConfirmed,
          gameConfig: next.gameConfig,
          stockRoundState: next.stockRoundState,
        });
      });
    });
  });

  return next;
};

const upsertOperatingResult = (state, { companyId, orNum, revenue, dividendMode, isConfirmed }) => {
  const next = cloneState(state);
  const cycleNo = next.session.currentCycleNo;
  const cycleKey = toCycleKey(cycleNo);
  const orKey = toOrKey(orNum);
  const existing = next.operatingResults?.[cycleKey]?.[orKey]?.[companyId];

  const record = buildOperatingResultRecord({
    cycleNo,
    orNum,
    companyId,
    revenue: revenue ?? existing?.revenue ?? 0,
    dividendMode: dividendMode ?? existing?.dividendMode ?? 'full',
    isConfirmed: isConfirmed ?? existing?.isConfirmed ?? false,
    gameConfig: next.gameConfig,
    stockRoundState: next.stockRoundState,
  });

  if (!next.operatingResults[cycleKey]) next.operatingResults[cycleKey] = {};
  if (!next.operatingResults[cycleKey][orKey]) next.operatingResults[cycleKey][orKey] = {};
  next.operatingResults[cycleKey][orKey][companyId] = record;
  return next;
};

const syncOperatingState = (state) => {
  const next = cloneState(state);
  const companyIds = getCompanyIds(next);
  next.stockRoundState.companyStates = syncCompanyStates(
    next.stockRoundState.companyStates,
    companyIds
  );
  next.gameConfig.players = clonePlayers(next.gameConfig.players);
  next.gameConfig.companies = cloneCompanies(next.gameConfig.companies);
  next.operatingState.companyOrder = syncCompanyOrder(next.operatingState.companyOrder, companyIds);
  next.operatingState.selectedCompanyId =
    next.operatingState.selectedCompanyId &&
    companyIds.includes(next.operatingState.selectedCompanyId)
      ? next.operatingState.selectedCompanyId
      : next.operatingState.companyOrder[0] || null;

  Object.keys(next.operatingResults || {}).forEach((cycleNo) => {
    Object.keys(next.operatingResults[cycleNo] || {}).forEach((orNum) => {
      Object.keys(next.operatingResults[cycleNo][orNum] || {}).forEach((companyId) => {
        if (!companyIds.includes(companyId)) {
          delete next.operatingResults[cycleNo][orNum][companyId];
        }
      });
    });
  });

  next.stockRoundState.validation = buildStockValidationMap(next.gameConfig, next.stockRoundState);
  return next;
};

export function appReducer(state, action) {
  switch (action.type) {
    case 'CONFIG_SET_PLAYERS': {
      const next = cloneState(state);
      next.gameConfig.players = action.payload;
      const playerIds = next.gameConfig.players.map((player) => player.id);
      next.stockRoundState.playerPeriodicIncomes = syncPlayerPeriodicIncomes(
        next.stockRoundState.playerPeriodicIncomes,
        next.gameConfig.players
      );
      next.stockRoundState.companyStates = Object.entries(
        next.stockRoundState.companyStates
      ).reduce((acc, [companyId, companyState]) => {
        acc[companyId] = cleanupCompanyStateForPlayers(companyState, playerIds);
        return acc;
      }, {});
      return recomputeResults(syncOperatingState(next));
    }

    case 'CONFIG_SET_COMPANIES': {
      const next = cloneState(state);
      next.gameConfig.companies = action.payload;
      const companyIds = getCompanyIds(next);
      next.stockRoundState.companyStates = syncCompanyStates(
        next.stockRoundState.companyStates,
        companyIds
      );
      next.operatingState.companyOrder = syncCompanyOrder(
        next.operatingState.companyOrder,
        companyIds
      );
      next.operatingState.selectedCompanyId =
        next.operatingState.selectedCompanyId &&
        companyIds.includes(next.operatingState.selectedCompanyId)
          ? next.operatingState.selectedCompanyId
          : next.operatingState.companyOrder[0] || null;
      return recomputeResults(syncOperatingState(next));
    }

    case 'CONFIG_SET_NUM_ORS': {
      if (state.gameConfig.setupLocked) return state;
      const next = cloneState(state);
      next.gameConfig.numORs = action.payload;
      next.operatingState.currentOR = Math.min(next.operatingState.currentOR, action.payload);
      next.operatingState.completedCompanyIdsByOR = buildEmptyCompletedByOR(action.payload);
      return next;
    }

    case 'CONFIG_SET_HAS_IPO_SHARES': {
      if (state.gameConfig.setupLocked) return state;
      const next = cloneState(state);
      next.gameConfig.hasIpoShares = action.payload;
      next.stockRoundState.validation = buildStockValidationMap(
        next.gameConfig,
        next.stockRoundState
      );
      return recomputeResults(next);
    }

    case 'BANK_POOL_DIVIDEND_RECIPIENT_SET': {
      if (state.gameConfig.setupLocked) return state;
      const next = cloneState(state);
      next.gameConfig.bankPoolDividendRecipient =
        action.payload === 'company' ? 'company' : 'market';
      return recomputeResults(next);
    }

    case 'SETUP_LOCK': {
      const next = cloneState(state);
      next.gameConfig.setupLocked = Boolean(action.payload);
      next.session.mode = 'stockRound';
      next.operatingState.currentOR = 1;
      next.operatingState.completedCompanyIdsByOR = buildEmptyCompletedByOR(next.gameConfig.numORs);
      next.operatingState.companyOrder = syncCompanyOrder(
        next.operatingState.companyOrder,
        getCompanyIds(next)
      );
      next.operatingState.selectedCompanyId = getFirstEstablishedCompanyId(
        next.operatingState.companyOrder,
        next.stockRoundState.companyStates,
        getCompanyIds(next)
      );
      return next;
    }

    case 'SR_STOCK_SET': {
      const { companyId, target, playerId, value } = action.payload;
      const next = cloneState(state);
      const companyState =
        next.stockRoundState.companyStates[companyId] || createCompanyRoundState();
      const nextValue = parsePercent(value);
      let nextCompanyState = companyState;

      if (target === 'player') {
        const stockHoldings = [...(companyState.stockHoldings || [])];
        const existingIndex = stockHoldings.findIndex((holding) => holding.playerId === playerId);
        if (nextValue === 0) {
          nextCompanyState = {
            ...companyState,
            stockHoldings: stockHoldings.filter((holding) => holding.playerId !== playerId),
          };
        } else if (existingIndex >= 0) {
          stockHoldings[existingIndex] = {
            ...stockHoldings[existingIndex],
            percentage: nextValue,
          };
          nextCompanyState = { ...companyState, stockHoldings };
        } else {
          stockHoldings.push({ playerId, percentage: nextValue });
          nextCompanyState = { ...companyState, stockHoldings };
        }
      } else if (target === 'treasury') {
        nextCompanyState = {
          ...companyState,
          treasuryStockPercentage: nextValue,
        };
      } else if (target === 'bank') {
        nextCompanyState = {
          ...companyState,
          bankPoolPercentage: nextValue,
        };
      }

      if (shouldAutoUnsetUnestablished(nextCompanyState, next.gameConfig.hasIpoShares)) {
        nextCompanyState = { ...nextCompanyState, isUnestablished: false };
      }

      next.stockRoundState.companyStates[companyId] = nextCompanyState;
      next.stockRoundState.validation = buildStockValidationMap(
        next.gameConfig,
        next.stockRoundState
      );
      return recomputeResults(next, [companyId]);
    }

    case 'SR_UNESTABLISHED_SET': {
      const next = cloneState(state);
      const { companyId, isUnestablished } = action.payload;
      next.stockRoundState.companyStates[companyId] = {
        ...(next.stockRoundState.companyStates[companyId] || createCompanyRoundState()),
        isUnestablished,
      };
      next.stockRoundState.validation = buildStockValidationMap(
        next.gameConfig,
        next.stockRoundState
      );
      return next;
    }

    case 'SR_PRESIDENT_SET': {
      const next = cloneState(state);
      const { companyId, presidentPlayerId } = action.payload;
      next.stockRoundState.companyStates[companyId] = {
        ...(next.stockRoundState.companyStates[companyId] || createCompanyRoundState()),
        presidentPlayerId:
          typeof presidentPlayerId === 'string' && presidentPlayerId.trim()
            ? presidentPlayerId
            : null,
      };
      return next;
    }

    case 'SR_VALIDATE_RUN': {
      const next = cloneState(state);
      next.stockRoundState.validation =
        action.payload || buildStockValidationMap(next.gameConfig, next.stockRoundState);
      return next;
    }

    case 'SR_COMPLETE': {
      const next = cloneState(state);
      next.session.mode = 'orRound';
      next.operatingState.currentOR = 1;
      next.operatingState.completedCompanyIdsByOR = buildEmptyCompletedByOR(next.gameConfig.numORs);
      next.operatingState.selectedCompanyId = getFirstEstablishedCompanyId(
        next.operatingState.companyOrder,
        next.stockRoundState.companyStates,
        getCompanyIds(next)
      );
      return next;
    }

    case 'PLAYER_PERIODIC_INCOME_SET': {
      const next = cloneState(state);
      const { playerId, periodicIncome } = action.payload;
      next.stockRoundState.playerPeriodicIncomes[playerId] = periodicIncome;
      return next;
    }

    case 'COMPANY_PERIODIC_INCOME_SET': {
      const next = cloneState(state);
      const { companyId, periodicIncome } = action.payload;
      next.stockRoundState.companyStates[companyId] = {
        ...(next.stockRoundState.companyStates[companyId] || createCompanyRoundState()),
        periodicIncome,
      };
      return recomputeResults(next, [companyId]);
    }

    case 'OR_ORDER_MOVE_UP': {
      const next = cloneState(state);
      const companyIds = getCompanyIds(next);
      const { establishedIds, unestablishedIds } = splitCompanyOrderByEstablishment(
        next.operatingState.companyOrder,
        next.stockRoundState.companyStates,
        companyIds
      );
      const establishedSet = new Set(establishedIds);
      const completed = (
        next.operatingState.completedCompanyIdsByOR?.[next.operatingState.currentOR] || []
      ).filter((companyId) => establishedSet.has(companyId));
      if (completed.length > 0) return state;

      const companyId = action.payload;
      if (!establishedSet.has(companyId)) return state;
      const currentIndex = establishedIds.indexOf(companyId);
      if (currentIndex <= 0) return state;

      const reordered = [...establishedIds];
      [reordered[currentIndex - 1], reordered[currentIndex]] = [
        reordered[currentIndex],
        reordered[currentIndex - 1],
      ];
      next.operatingState.companyOrder = [...reordered, ...unestablishedIds];
      return next;
    }

    case 'OR_ORDER_MOVE_DOWN': {
      const next = cloneState(state);
      const companyIds = getCompanyIds(next);
      const { establishedIds, unestablishedIds } = splitCompanyOrderByEstablishment(
        next.operatingState.companyOrder,
        next.stockRoundState.companyStates,
        companyIds
      );
      const establishedSet = new Set(establishedIds);
      const completed = (
        next.operatingState.completedCompanyIdsByOR?.[next.operatingState.currentOR] || []
      ).filter((companyId) => establishedSet.has(companyId));
      if (completed.length > 0) return state;

      const companyId = action.payload;
      if (!establishedSet.has(companyId)) return state;
      const currentIndex = establishedIds.indexOf(companyId);
      if (currentIndex < 0 || currentIndex >= establishedIds.length - 1) return state;

      const reordered = [...establishedIds];
      [reordered[currentIndex], reordered[currentIndex + 1]] = [
        reordered[currentIndex + 1],
        reordered[currentIndex],
      ];
      next.operatingState.companyOrder = [...reordered, ...unestablishedIds];
      return next;
    }

    case 'OR_ORDER_REBALANCE_REMAINING': {
      const next = cloneState(state);
      const companyIds = getCompanyIds(next);
      const { establishedIds, unestablishedIds } = splitCompanyOrderByEstablishment(
        next.operatingState.companyOrder,
        next.stockRoundState.companyStates,
        companyIds
      );
      const establishedSet = new Set(establishedIds);
      const completed = (
        next.operatingState.completedCompanyIdsByOR?.[next.operatingState.currentOR] || []
      ).filter((companyId) => establishedSet.has(companyId));
      const remaining = establishedIds.filter((companyId) => !completed.includes(companyId));
      const draft = action.payload;
      if (remaining.length !== draft.length) return state;
      const draftSet = new Set(draft);
      if (!remaining.every((companyId) => draftSet.has(companyId))) return state;

      next.operatingState.companyOrder = [...completed, ...draft, ...unestablishedIds];
      next.operatingState.selectedCompanyId =
        draft[0] || completed[completed.length - 1] || establishedIds[0] || null;
      return next;
    }

    case 'OR_REVENUE_SET':
      return upsertOperatingResult(state, {
        companyId: action.payload.companyId,
        orNum: action.payload.orNum,
        revenue: action.payload.revenue,
      });

    case 'OR_DIVIDEND_MODE_SET':
      return upsertOperatingResult(state, {
        companyId: action.payload.companyId,
        orNum: action.payload.orNum,
        dividendMode: action.payload.mode,
      });

    case 'OR_COMPANY_SELECT': {
      const next = cloneState(state);
      next.operatingState.selectedCompanyId = action.payload;
      return next;
    }

    case 'TRAIN_ADD': {
      const next = cloneState(state);
      const { companyId, trainId } = action.payload;
      const current = next.stockRoundState.companyStates[companyId] || createCompanyRoundState();
      next.stockRoundState.companyStates[companyId] = {
        ...current,
        trains: [...(current.trains || []), { id: trainId, stops: [] }],
      };
      return next;
    }

    case 'TRAIN_UPDATE_STOPS': {
      const next = cloneState(state);
      const { companyId, trainId, stops } = action.payload;
      const current = next.stockRoundState.companyStates[companyId] || createCompanyRoundState();
      next.stockRoundState.companyStates[companyId] = {
        ...current,
        trains: (current.trains || []).map((train) =>
          train.id === trainId ? { ...train, stops } : train
        ),
      };
      return next;
    }

    case 'TRAIN_CLEAR': {
      const next = cloneState(state);
      const { companyId, trainId } = action.payload;
      const current = next.stockRoundState.companyStates[companyId] || createCompanyRoundState();
      next.stockRoundState.companyStates[companyId] = {
        ...current,
        trains: (current.trains || []).map((train) =>
          train.id === trainId ? { ...train, stops: [] } : train
        ),
      };
      return next;
    }

    case 'TRAIN_DELETE': {
      const next = cloneState(state);
      const { companyId, trainId } = action.payload;
      const current = next.stockRoundState.companyStates[companyId] || createCompanyRoundState();
      next.stockRoundState.companyStates[companyId] = {
        ...current,
        trains: (current.trains || []).filter((train) => train.id !== trainId),
      };
      return next;
    }

    case 'OR_COMPANY_MARK_DONE': {
      const next = upsertOperatingResult(state, {
        companyId: action.payload,
        orNum: state.operatingState.currentOR,
        isConfirmed: true,
      });
      const companyIds = getCompanyIds(next);
      const establishedIds = getEstablishedCompanyIds(
        next.operatingState.companyOrder,
        next.stockRoundState.companyStates,
        companyIds
      );
      const establishedSet = new Set(establishedIds);
      if (!establishedSet.has(action.payload)) return state;

      const currentOR = next.operatingState.currentOR;
      const completed = (next.operatingState.completedCompanyIdsByOR?.[currentOR] || []).filter(
        (companyId) => establishedSet.has(companyId)
      );
      if (!completed.includes(action.payload)) {
        next.operatingState.completedCompanyIdsByOR[currentOR] = [...completed, action.payload];
      }
      const remaining = establishedIds.filter(
        (companyId) => !next.operatingState.completedCompanyIdsByOR[currentOR].includes(companyId)
      );
      next.operatingState.selectedCompanyId = remaining[0] || action.payload;
      return next;
    }

    case 'OR_NEXT_ROUND': {
      if (state.operatingState.currentOR >= state.gameConfig.numORs) return state;
      const next = cloneState(state);
      const nextOR = next.operatingState.currentOR + 1;
      const companyIds = getCompanyIds(next);
      const establishedIds = getEstablishedCompanyIds(
        next.operatingState.companyOrder,
        next.stockRoundState.companyStates,
        companyIds
      );
      next.operatingState.currentOR = nextOR;
      next.operatingState.selectedCompanyId = establishedIds[0] || null;
      next.operatingState.completedCompanyIdsByOR[nextOR] =
        next.operatingState.completedCompanyIdsByOR[nextOR] || [];
      return next;
    }

    case 'CYCLE_CLOSE_AND_START_NEXT_SR': {
      const next = cloneState(state);
      const cycleNo = next.session.currentCycleNo;
      const cycleKey = toCycleKey(cycleNo);

      next.history = [
        ...next.history,
        {
          cycleNo,
          completedAt: action.payload,
          gameConfigSnapshot: {
            ...next.gameConfig,
            players: clonePlayers(next.gameConfig.players),
            companies: cloneCompanies(next.gameConfig.companies),
          },
          stockRoundSnapshot: cloneStockRoundState(next.stockRoundState),
          operatingResultsSnapshot:
            cloneOperatingResults({
              [cycleKey]: next.operatingResults[cycleKey] || {},
            })[cycleKey] || {},
        },
      ];
      next.session = {
        currentCycleNo: cycleNo + 1,
        mode: 'stockRound',
      };
      next.operatingState = {
        companyOrder: syncCompanyOrder(next.operatingState.companyOrder, getCompanyIds(next)),
        currentOR: 1,
        completedCompanyIdsByOR: buildEmptyCompletedByOR(next.gameConfig.numORs),
        selectedCompanyId: getFirstEstablishedCompanyId(
          next.operatingState.companyOrder,
          next.stockRoundState.companyStates,
          getCompanyIds(next)
        ),
      };
      next.stockRoundState.validation = {};
      return next;
    }

    case 'APP_LOAD':
      return normalizeAppState(action.payload);

    case 'APP_RESET':
      return createBaseState();

    default:
      return state;
  }
}
