import {
  DEFAULT_DIVIDEND_MODE,
  buildEmptyCompletedByOR,
  createCompanyRoundState,
  getEstablishedCompanyIds,
  resolveBankPoolPercentage,
  splitCompanyOrderByEstablishment,
} from './appState';

const getCycleEntries = (operatingResults, cycleNo) => operatingResults?.[`${cycleNo}`] || {};

const getCompanyResultForOR = (cycleEntries, orNum, companyId) =>
  cycleEntries?.[`${orNum}`]?.[companyId] || null;

export const selectMaterializedPlayers = (state) =>
  state.gameConfig.players.map((player) => ({
    ...player,
    periodicIncome: state.stockRoundState.playerPeriodicIncomes?.[player.id] || 0,
  }));

export const selectMaterializedCompanies = (state, cycleNo = state.session.currentCycleNo) => {
  const cycleEntries = getCycleEntries(state.operatingResults, cycleNo);
  return state.gameConfig.companies.map((company) => {
    const companyState =
      state.stockRoundState.companyStates?.[company.id] || createCompanyRoundState();

    return {
      ...company,
      stockHoldings: (companyState.stockHoldings || []).map((holding) => ({ ...holding })),
      presidentPlayerId: companyState.presidentPlayerId,
      isUnestablished: Boolean(companyState.isUnestablished),
      treasuryStockPercentage: companyState.treasuryStockPercentage || 0,
      bankPoolPercentage: resolveBankPoolPercentage(companyState, state.gameConfig.hasIpoShares),
      periodicIncome: companyState.periodicIncome || 0,
      trains: (companyState.trains || []).map((train) => ({
        ...train,
        stops: [...(train.stops || [])],
      })),
      orRevenues: Array.from({ length: state.gameConfig.numORs }, (_, index) => {
        const orNum = index + 1;
        const result = getCompanyResultForOR(cycleEntries, orNum, company.id);
        return {
          orNum,
          revenue: result?.revenue || 0,
        };
      }),
      orDividendModes: Array.from({ length: state.gameConfig.numORs }, (_, index) => {
        const orNum = index + 1;
        const result = getCompanyResultForOR(cycleEntries, orNum, company.id);
        return {
          orNum,
          mode: result?.dividendMode || DEFAULT_DIVIDEND_MODE,
        };
      }),
    };
  });
};

export const selectBoardViewModel = (state) => {
  const players = selectMaterializedPlayers(state);
  const companies = selectMaterializedCompanies(state);
  const companyIds = companies.map((company) => company.id);
  const companyStates = state.stockRoundState.companyStates || {};
  const operatingState = state.operatingState || {
    companyOrder: companyIds,
    currentOR: 1,
    completedCompanyIdsByOR: buildEmptyCompletedByOR(state.gameConfig.numORs),
    selectedCompanyId: null,
  };
  const { establishedIds } = splitCompanyOrderByEstablishment(
    operatingState.companyOrder,
    companyStates,
    companyIds
  );
  const completedForCurrentOR = (
    operatingState.completedCompanyIdsByOR?.[operatingState.currentOR] || []
  ).filter((companyId) => establishedIds.includes(companyId));

  return {
    players,
    companies,
    validation: state.stockRoundState.validation || {},
    flow: {
      numORs: state.gameConfig.numORs,
      hasIpoShares: state.gameConfig.hasIpoShares,
      bankPoolDividendRecipient: state.gameConfig.bankPoolDividendRecipient,
      setupLocked: state.gameConfig.setupLocked,
    },
    activeCycle: {
      cycleNo: state.session.currentCycleNo,
      companyOrder: operatingState.companyOrder,
      currentOR: operatingState.currentOR,
      selectedCompanyId:
        operatingState.selectedCompanyId ||
        getEstablishedCompanyIds(operatingState.companyOrder, companyStates, companyIds)[0] ||
        null,
      completedCompanyIdsByOR: operatingState.completedCompanyIdsByOR,
    },
    status: {
      mode: state.session.mode,
      cycleNo: state.session.currentCycleNo,
      establishedCount: establishedIds.length,
      completedCount: completedForCurrentOR.length,
      remainingCount: Math.max(0, establishedIds.length - completedForCurrentOR.length),
      invalidCount: Object.values(state.stockRoundState.validation || {}).filter(
        (entry) => entry?.invalid
      ).length,
    },
  };
};

export const selectHistoryCycles = (state) => {
  const currentCycle = {
    cycleNo: state.session.currentCycleNo,
    completedAt: null,
    isCompleted: false,
    gameConfigSnapshot: {
      ...state.gameConfig,
      players: selectMaterializedPlayers(state),
      companies: selectMaterializedCompanies(state),
    },
    stockRoundSnapshot: state.stockRoundState,
    operatingResultsSnapshot: getCycleEntries(state.operatingResults, state.session.currentCycleNo),
  };

  const pastCycles = (state.history || []).map((entry) => ({
    ...entry,
    isCompleted: true,
    gameConfigSnapshot: {
      ...entry.gameConfigSnapshot,
      players: entry.gameConfigSnapshot.players.map((player) => ({
        ...player,
        periodicIncome: entry.stockRoundSnapshot.playerPeriodicIncomes?.[player.id] || 0,
      })),
      companies: entry.gameConfigSnapshot.companies.map((company) => {
        const companyState =
          entry.stockRoundSnapshot.companyStates?.[company.id] || createCompanyRoundState();
        return {
          ...company,
          stockHoldings: (companyState.stockHoldings || []).map((holding) => ({ ...holding })),
          presidentPlayerId: companyState.presidentPlayerId,
          isUnestablished: companyState.isUnestablished,
          treasuryStockPercentage: companyState.treasuryStockPercentage,
          bankPoolPercentage: resolveBankPoolPercentage(
            companyState,
            entry.gameConfigSnapshot.hasIpoShares
          ),
          periodicIncome: companyState.periodicIncome || 0,
          trains: (companyState.trains || []).map((train) => ({
            ...train,
            stops: [...(train.stops || [])],
          })),
        };
      }),
    },
  }));

  return [...pastCycles, currentCycle];
};
