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
  getDefaultCompanyStatus,
  getEstablishedCompanyIds,
  getFirstEstablishedCompanyId,
  isCompanyActive,
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
  session: {
    ...state.session,
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

const getCompanyById = (state, companyId) =>
  state.gameConfig.companies.find((company) => company.id === companyId) || null;

const syncPlayerPeriodicIncomes = (playerPeriodicIncomes, players) =>
  players.reduce((acc, player) => {
    acc[player.id] = Number.isFinite(playerPeriodicIncomes?.[player.id])
      ? Math.max(0, Math.floor(playerPeriodicIncomes[player.id]))
      : 0;
    return acc;
  }, {});

const syncCompanyStates = (companyStates, companies, mergerRoundEnabled) =>
  companies.reduce((acc, company) => {
    const current = companyStates?.[company.id];
    const fallback = createCompanyRoundState({
      companyType: company.companyType,
      mergerRoundEnabled,
    });
    acc[company.id] = current
      ? {
          ...fallback,
          ...current,
          stockHoldings: (current.stockHoldings || []).map((holding) => ({ ...holding })),
          trains: (current.trains || []).map((train) => ({
            ...train,
            stops: [...(train.stops || [])],
          })),
          companyStatus:
            current.companyStatus ||
            getDefaultCompanyStatus(company.companyType, mergerRoundEnabled),
        }
      : fallback;
    return acc;
  }, {});

const applyDefaultCompanyStatuses = (next) => {
  next.stockRoundState.companyStates = next.gameConfig.companies.reduce((acc, company) => {
    const current =
      next.stockRoundState.companyStates?.[company.id] ||
      createCompanyRoundState({
        companyType: company.companyType,
        mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
      });
    const companyStatus = getDefaultCompanyStatus(
      company.companyType,
      next.gameConfig.mergerRoundEnabled
    );
    acc[company.id] = {
      ...current,
      companyStatus,
      isUnestablished: companyStatus === 'active' ? current.isUnestablished : true,
    };
    return acc;
  }, {});
};

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

const carryForwardFinalORResults = (state, fromCycleNo, toCycleNo) => {
  const fromCycleKey = toCycleKey(fromCycleNo);
  const toCycleKeyValue = toCycleKey(toCycleNo);
  const finalOrKey = toOrKey(state.gameConfig.numORs);
  const finalEntries = state.operatingResults?.[fromCycleKey]?.[finalOrKey];

  if (!finalEntries || Object.keys(finalEntries).length === 0) {
    return state;
  }

  const activeCompanyIds = new Set(
    Object.entries(state.stockRoundState.companyStates || {})
      .filter(([, companyState]) => isCompanyActive(companyState))
      .map(([companyId]) => companyId)
  );

  if (!state.operatingResults[toCycleKeyValue]) {
    state.operatingResults[toCycleKeyValue] = {};
  }

  state.operatingResults[toCycleKeyValue][toOrKey(1)] = Object.entries(finalEntries).reduce(
    (acc, [companyId, record]) => {
      if (!activeCompanyIds.has(companyId)) return acc;
      acc[companyId] = buildOperatingResultRecord({
        cycleNo: toCycleNo,
        orNum: 1,
        companyId,
        revenue: record.revenue,
        dividendMode: record.dividendMode,
        isConfirmed: false,
        gameConfig: state.gameConfig,
        stockRoundState: state.stockRoundState,
      });
      return acc;
    },
    {}
  );

  return state;
};

const syncOperatingState = (state) => {
  const next = cloneState(state);
  const companyIds = getCompanyIds(next);
  next.stockRoundState.companyStates = syncCompanyStates(
    next.stockRoundState.companyStates,
    next.gameConfig.companies,
    next.gameConfig.mergerRoundEnabled
  );
  next.gameConfig.players = clonePlayers(next.gameConfig.players);
  next.gameConfig.companies = cloneCompanies(next.gameConfig.companies);
  next.operatingState.companyOrder = syncCompanyOrder(next.operatingState.companyOrder, companyIds);
  next.operatingState.selectedCompanyId =
    next.operatingState.selectedCompanyId &&
    companyIds.includes(next.operatingState.selectedCompanyId)
      ? next.operatingState.selectedCompanyId
      : getFirstEstablishedCompanyId(
          next.operatingState.companyOrder,
          next.stockRoundState.companyStates,
          companyIds
        );

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

const trimCurrentCycleOperatingResults = (operatingResults, cycleNo, numORs) => {
  const cycleKey = toCycleKey(cycleNo);
  const cycleEntries = operatingResults?.[cycleKey];
  if (!cycleEntries) return;

  Object.keys(cycleEntries).forEach((orKey) => {
    if (Number.parseInt(orKey, 10) > numORs) {
      delete cycleEntries[orKey];
    }
  });
};

const completeCycleAndStartNextSR = (state, completedAt) => {
  const next = cloneState(state);
  const cycleNo = next.session.currentCycleNo;
  const cycleKey = toCycleKey(cycleNo);
  const nextCycleNo = cycleNo + 1;

  next.history = [
    ...next.history,
    {
      cycleNo,
      completedAt,
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
    currentCycleNo: nextCycleNo,
    mode: 'stockRound',
    greenTrainTriggered: next.session.greenTrainTriggered,
  };
  carryForwardFinalORResults(next, cycleNo, nextCycleNo);
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
  next.stockRoundState.validation = buildStockValidationMap(next.gameConfig, next.stockRoundState);
  return next;
};

const getMergedPresidentPlayerId = ({
  stockHoldings,
  sourceCompanyIds,
  targetCompanyId,
  state,
}) => {
  const highestPercentage = Math.max(
    0,
    ...(stockHoldings || []).map((holding) => parsePercent(holding.percentage))
  );
  const leaders = (stockHoldings || [])
    .filter(
      (holding) => parsePercent(holding.percentage) === highestPercentage && highestPercentage > 0
    )
    .map((holding) => holding.playerId);

  if (leaders.length === 1) {
    return leaders[0];
  }

  if (leaders.length > 1) {
    const orderedSources = (state.operatingState.companyOrder || [])
      .filter((companyId) => sourceCompanyIds.includes(companyId))
      .map((companyId) => state.stockRoundState.companyStates?.[companyId]?.presidentPlayerId)
      .filter(Boolean);
    const fallbackPresident = orderedSources.find((playerId) => leaders.includes(playerId));
    if (fallbackPresident) return fallbackPresident;
  }

  const currentPresident =
    state.stockRoundState.companyStates?.[targetCompanyId]?.presidentPlayerId;
  return currentPresident || null;
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
      next.stockRoundState.companyStates = syncCompanyStates(
        next.stockRoundState.companyStates,
        next.gameConfig.companies,
        next.gameConfig.mergerRoundEnabled
      );
      next.operatingState.companyOrder = syncCompanyOrder(
        next.operatingState.companyOrder,
        getCompanyIds(next)
      );
      next.operatingState.selectedCompanyId = getFirstEstablishedCompanyId(
        next.operatingState.companyOrder,
        next.stockRoundState.companyStates,
        getCompanyIds(next)
      );
      return recomputeResults(syncOperatingState(next));
    }

    case 'CONFIG_SET_NUM_ORS': {
      if (state.gameConfig.setupLocked && state.session.mode !== 'stockRound') return state;
      const next = cloneState(state);
      next.gameConfig.numORs = action.payload;
      next.operatingState.currentOR = Math.min(next.operatingState.currentOR, action.payload);
      next.operatingState.completedCompanyIdsByOR = buildEmptyCompletedByOR(action.payload);
      trimCurrentCycleOperatingResults(
        next.operatingResults,
        next.session.currentCycleNo,
        action.payload
      );
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

    case 'CONFIG_SET_MERGER_ROUND_ENABLED': {
      if (state.gameConfig.setupLocked) return state;
      const next = cloneState(state);
      next.gameConfig.mergerRoundEnabled = Boolean(action.payload);
      applyDefaultCompanyStatuses(next);
      next.stockRoundState.validation = buildStockValidationMap(
        next.gameConfig,
        next.stockRoundState
      );
      return next;
    }

    case 'CONFIG_SET_COMPANY_TYPE': {
      if (state.gameConfig.setupLocked) return state;
      const next = cloneState(state);
      const { companyId, companyType } = action.payload;
      next.gameConfig.companies = next.gameConfig.companies.map((company) =>
        company.id === companyId ? { ...company, companyType } : company
      );
      const company = getCompanyById(next, companyId);
      if (!company) return state;
      const current =
        next.stockRoundState.companyStates[companyId] ||
        createCompanyRoundState({
          companyType,
          mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
        });
      const companyStatus = getDefaultCompanyStatus(
        companyType,
        next.gameConfig.mergerRoundEnabled
      );
      next.stockRoundState.companyStates[companyId] = {
        ...current,
        companyStatus,
        isUnestablished: companyStatus === 'active' ? current.isUnestablished : true,
      };
      next.stockRoundState.validation = buildStockValidationMap(
        next.gameConfig,
        next.stockRoundState
      );
      return next;
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
      next.stockRoundState.companyStates = syncCompanyStates(
        next.stockRoundState.companyStates,
        next.gameConfig.companies,
        next.gameConfig.mergerRoundEnabled
      );
      if (next.gameConfig.setupLocked) {
        applyDefaultCompanyStatuses(next);
      }
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
      next.stockRoundState.validation = buildStockValidationMap(
        next.gameConfig,
        next.stockRoundState
      );
      return next;
    }

    case 'SR_STOCK_SET': {
      const { companyId, target, playerId, value } = action.payload;
      const next = cloneState(state);
      const company = getCompanyById(next, companyId);
      const companyState =
        next.stockRoundState.companyStates[companyId] ||
        createCompanyRoundState({
          companyType: company?.companyType,
          mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
        });
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
      const company = getCompanyById(next, companyId);
      next.stockRoundState.companyStates[companyId] = {
        ...(next.stockRoundState.companyStates[companyId] ||
          createCompanyRoundState({
            companyType: company?.companyType,
            mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
          })),
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
      const company = getCompanyById(next, companyId);
      next.stockRoundState.companyStates[companyId] = {
        ...(next.stockRoundState.companyStates[companyId] ||
          createCompanyRoundState({
            companyType: company?.companyType,
            mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
          })),
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

    case 'GREEN_TRAIN_TRIGGER_SET': {
      const next = cloneState(state);
      next.session.greenTrainTriggered = Boolean(action.payload);
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
      const company = getCompanyById(next, companyId);
      next.stockRoundState.companyStates[companyId] = {
        ...(next.stockRoundState.companyStates[companyId] ||
          createCompanyRoundState({
            companyType: company?.companyType,
            mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
          })),
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
      const company = getCompanyById(next, companyId);
      const current =
        next.stockRoundState.companyStates[companyId] ||
        createCompanyRoundState({
          companyType: company?.companyType,
          mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
        });
      next.stockRoundState.companyStates[companyId] = {
        ...current,
        trains: [...(current.trains || []), { id: trainId, stops: [] }],
      };
      return next;
    }

    case 'TRAIN_UPDATE_STOPS': {
      const next = cloneState(state);
      const { companyId, trainId, stops } = action.payload;
      const company = getCompanyById(next, companyId);
      const current =
        next.stockRoundState.companyStates[companyId] ||
        createCompanyRoundState({
          companyType: company?.companyType,
          mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
        });
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
      const company = getCompanyById(next, companyId);
      const current =
        next.stockRoundState.companyStates[companyId] ||
        createCompanyRoundState({
          companyType: company?.companyType,
          mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
        });
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
      const company = getCompanyById(next, companyId);
      const current =
        next.stockRoundState.companyStates[companyId] ||
        createCompanyRoundState({
          companyType: company?.companyType,
          mergerRoundEnabled: next.gameConfig.mergerRoundEnabled,
        });
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

    case 'OR_ENTER_MERGER_ROUND': {
      if (!state.gameConfig.mergerRoundEnabled || !state.session.greenTrainTriggered) return state;
      const next = cloneState(state);
      next.session.mode = 'mergerRound';
      return next;
    }

    case 'MR_MERGE_COMMIT': {
      const next = cloneState(state);
      const {
        sourceCompanyIds,
        targetCompanyId,
        stockHoldings,
        treasuryStockPercentage,
        bankPoolPercentage,
        periodicIncome,
        trains,
      } = action.payload;

      if (!Array.isArray(sourceCompanyIds) || sourceCompanyIds.length !== 2) return state;
      const uniqueSources = [...new Set(sourceCompanyIds)];
      if (uniqueSources.length !== 2) return state;

      const sourceCompanies = uniqueSources.map((companyId) => getCompanyById(next, companyId));
      const targetCompany = getCompanyById(next, targetCompanyId);
      if (sourceCompanies.some((company) => !company) || !targetCompany) return state;

      const sourceStates = uniqueSources.map(
        (companyId) => next.stockRoundState.companyStates?.[companyId]
      );
      const targetState = next.stockRoundState.companyStates?.[targetCompanyId];
      const areSourcesEligible = sourceCompanies.every(
        (company, index) =>
          company.companyType === 'minor' &&
          sourceStates[index] &&
          isCompanyActive(sourceStates[index])
      );
      const isTargetEligible =
        targetCompany.companyType === 'major' && targetState?.companyStatus === 'available';
      if (!areSourcesEligible || !isTargetEligible) return state;

      const mergedStockHoldings = (stockHoldings || [])
        .map((holding) => ({
          playerId: holding.playerId,
          percentage: parsePercent(holding.percentage),
        }))
        .filter((holding) => typeof holding.playerId === 'string' && holding.percentage > 0);
      const presidentPlayerId = getMergedPresidentPlayerId({
        stockHoldings: mergedStockHoldings,
        sourceCompanyIds: uniqueSources,
        targetCompanyId,
        state,
      });

      next.stockRoundState.companyStates[targetCompanyId] = {
        ...targetState,
        companyStatus: 'active',
        stockHoldings: mergedStockHoldings,
        presidentPlayerId,
        isUnestablished: false,
        treasuryStockPercentage: parsePercent(treasuryStockPercentage || 0),
        bankPoolPercentage: parsePercent(bankPoolPercentage || 0),
        periodicIncome: Math.max(0, Number.parseInt(periodicIncome, 10) || 0),
        trains: (trains || []).map((train) => ({
          ...train,
          stops: [...(train.stops || [])],
        })),
      };

      uniqueSources.forEach((companyId) => {
        next.stockRoundState.companyStates[companyId] = {
          ...next.stockRoundState.companyStates[companyId],
          companyStatus: 'retired',
          stockHoldings: [],
          presidentPlayerId: null,
          isUnestablished: true,
          treasuryStockPercentage: 0,
          bankPoolPercentage: 0,
          periodicIncome: 0,
          trains: [],
        };
      });

      const currentOrder = syncCompanyOrder(next.operatingState.companyOrder, getCompanyIds(next));
      const insertionIndex = Math.min(
        ...uniqueSources.map((companyId) => currentOrder.indexOf(companyId))
      );
      const filteredOrder = currentOrder.filter(
        (companyId) => !uniqueSources.includes(companyId) && companyId !== targetCompanyId
      );
      filteredOrder.splice(Math.max(0, insertionIndex), 0, targetCompanyId);
      next.operatingState.companyOrder = filteredOrder;
      next.operatingState.selectedCompanyId = getFirstEstablishedCompanyId(
        next.operatingState.companyOrder,
        next.stockRoundState.companyStates,
        getCompanyIds(next)
      );
      next.stockRoundState.validation = buildStockValidationMap(
        next.gameConfig,
        next.stockRoundState
      );
      return next;
    }

    case 'MR_COMPLETE_AND_START_NEXT_SR':
      return completeCycleAndStartNextSR(state, action.payload);

    case 'CYCLE_CLOSE_AND_START_NEXT_SR':
      return completeCycleAndStartNextSR(state, action.payload);

    case 'APP_LOAD':
      return normalizeAppState(action.payload);

    case 'APP_RESET':
      return createBaseState();

    default:
      return state;
  }
}
