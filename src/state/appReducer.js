import { inferIsUnestablished } from '../lib/companyStatus';
import {
  buildEmptyCompletedByOR,
  buildORRevenues,
  buildStockValidationMap,
  cloneCompanies,
  clonePlayers,
  createBaseState,
  getEstablishedCompanyIds,
  getFirstEstablishedCompanyId,
  normalizeAppState,
  parsePercent,
  resolveIsUnestablished,
  shouldAutoUnsetUnestablished,
  splitCompanyOrderByEstablishment,
  syncCompanyOrder,
} from './appState';

export function appReducer(state, action) {
  switch (action.type) {
    case 'PLAYER_SET_ALL':
      return { ...state, players: action.payload };

    case 'COMPANY_SET_ALL': {
      const companies = action.payload.map((company) => ({
        ...company,
        isUnestablished: resolveIsUnestablished(company, state.flow.hasIpoShares),
        orRevenues: buildORRevenues(state.flow.numORs, company.orRevenues || []),
      }));
      const companyOrder = syncCompanyOrder(state.activeCycle.companyOrder || [], companies);
      return {
        ...state,
        companies,
        activeCycle: {
          ...state.activeCycle,
          companyOrder,
          selectedCompanyId:
            state.activeCycle.selectedCompanyId &&
            companyOrder.includes(state.activeCycle.selectedCompanyId)
              ? state.activeCycle.selectedCompanyId
              : companyOrder[0] || null,
        },
      };
    }

    case 'COMPANY_SELECT':
      return {
        ...state,
        activeCycle: {
          ...state.activeCycle,
          selectedCompanyId: action.payload,
        },
      };

    case 'OR_SET_NUM': {
      if (state.flow.setupLocked) return state;
      const numORs = action.payload;
      return {
        ...state,
        flow: {
          ...state.flow,
          numORs,
        },
        companies: state.companies.map((company) => ({
          ...company,
          orRevenues: buildORRevenues(numORs, company.orRevenues || []),
        })),
        activeCycle: {
          ...state.activeCycle,
          currentOR: Math.min(state.activeCycle.currentOR, numORs),
          completedCompanyIdsByOR: buildEmptyCompletedByOR(numORs),
        },
      };
    }

    case 'IPO_MODE_SET': {
      if (state.flow.setupLocked) return state;
      return {
        ...state,
        flow: {
          ...state.flow,
          hasIpoShares: action.payload,
        },
      };
    }

    case 'FLOW_STEP_SET':
      return {
        ...state,
        flow: {
          ...state.flow,
          step: action.payload,
        },
      };

    case 'SETUP_LOCK': {
      if (!action.payload) {
        return {
          ...state,
          flow: {
            ...state.flow,
            setupLocked: false,
          },
        };
      }

      const normalizedCompanies = state.companies.map((company) => ({
        ...company,
        isUnestablished: resolveIsUnestablished(company, state.flow.hasIpoShares),
        orRevenues: buildORRevenues(state.flow.numORs, company.orRevenues || []),
      }));
      const companyOrder = normalizedCompanies.map((company) => company.id);
      return {
        ...state,
        companies: normalizedCompanies,
        flow: {
          ...state.flow,
          setupLocked: true,
          step: 'stockRound',
        },
        activeCycle: {
          ...state.activeCycle,
          companyOrder,
          currentOR: 1,
          completedCompanyIdsByOR: buildEmptyCompletedByOR(state.flow.numORs),
          selectedCompanyId: companyOrder[0] || null,
        },
      };
    }

    case 'SR_STOCK_SET': {
      const { companyId, target, playerId, value } = action.payload;
      const nextValue = parsePercent(value);

      return {
        ...state,
        companies: state.companies.map((company) => {
          if (company.id !== companyId) return company;

          let nextCompany = company;

          if (target === 'player') {
            const stockHoldings = [...(company.stockHoldings || [])];
            const existingIndex = stockHoldings.findIndex(
              (holding) => holding.playerId === playerId
            );

            if (nextValue === 0) {
              nextCompany = {
                ...company,
                stockHoldings: stockHoldings.filter((holding) => holding.playerId !== playerId),
              };
            } else if (existingIndex >= 0) {
              stockHoldings[existingIndex] = {
                ...stockHoldings[existingIndex],
                percentage: nextValue,
              };
              nextCompany = { ...company, stockHoldings };
            } else {
              stockHoldings.push({ playerId, percentage: nextValue });
              nextCompany = { ...company, stockHoldings };
            }
          } else if (target === 'treasury') {
            nextCompany = {
              ...company,
              treasuryStockPercentage: nextValue,
            };
          } else if (target === 'bank') {
            nextCompany = {
              ...company,
              bankPoolPercentage: nextValue,
            };
          }

          if (shouldAutoUnsetUnestablished(nextCompany, state.flow.hasIpoShares)) {
            return { ...nextCompany, isUnestablished: false };
          }

          return nextCompany;
        }),
      };
    }

    case 'SR_UNESTABLISHED_SET': {
      const { companyId, isUnestablished } = action.payload;
      return {
        ...state,
        companies: state.companies.map((company) =>
          company.id === companyId ? { ...company, isUnestablished } : company
        ),
      };
    }

    case 'SR_VALIDATE_RUN': {
      const validation =
        action.payload || buildStockValidationMap(state.companies, state.flow.hasIpoShares);
      return {
        ...state,
        srValidation: validation,
      };
    }

    case 'OR_ORDER_MOVE_UP': {
      const { establishedIds, unestablishedIds } = splitCompanyOrderByEstablishment(
        state.activeCycle.companyOrder,
        state.companies
      );
      const establishedSet = new Set(establishedIds);
      const completed = (
        state.activeCycle.completedCompanyIdsByOR?.[state.activeCycle.currentOR] || []
      ).filter((companyId) => establishedSet.has(companyId));
      if (completed.length > 0) return state;

      const companyId = action.payload;
      if (!establishedSet.has(companyId)) return state;
      const currentIndex = establishedIds.indexOf(companyId);
      if (currentIndex <= 0) return state;

      const nextEstablished = [...establishedIds];
      [nextEstablished[currentIndex - 1], nextEstablished[currentIndex]] = [
        nextEstablished[currentIndex],
        nextEstablished[currentIndex - 1],
      ];
      const nextOrder = [...nextEstablished, ...unestablishedIds];

      return {
        ...state,
        activeCycle: {
          ...state.activeCycle,
          companyOrder: nextOrder,
        },
      };
    }

    case 'OR_ORDER_MOVE_DOWN': {
      const { establishedIds, unestablishedIds } = splitCompanyOrderByEstablishment(
        state.activeCycle.companyOrder,
        state.companies
      );
      const establishedSet = new Set(establishedIds);
      const completed = (
        state.activeCycle.completedCompanyIdsByOR?.[state.activeCycle.currentOR] || []
      ).filter((companyId) => establishedSet.has(companyId));
      if (completed.length > 0) return state;

      const companyId = action.payload;
      if (!establishedSet.has(companyId)) return state;
      const currentIndex = establishedIds.indexOf(companyId);
      if (currentIndex < 0 || currentIndex >= establishedIds.length - 1) return state;

      const nextEstablished = [...establishedIds];
      [nextEstablished[currentIndex], nextEstablished[currentIndex + 1]] = [
        nextEstablished[currentIndex + 1],
        nextEstablished[currentIndex],
      ];
      const nextOrder = [...nextEstablished, ...unestablishedIds];

      return {
        ...state,
        activeCycle: {
          ...state.activeCycle,
          companyOrder: nextOrder,
        },
      };
    }

    case 'OR_ORDER_REBALANCE_REMAINING': {
      const { establishedIds, unestablishedIds } = splitCompanyOrderByEstablishment(
        state.activeCycle.companyOrder,
        state.companies
      );
      const establishedSet = new Set(establishedIds);
      const completed = (
        state.activeCycle.completedCompanyIdsByOR?.[state.activeCycle.currentOR] || []
      ).filter((companyId) => establishedSet.has(companyId));
      const remaining = establishedIds.filter((companyId) => !completed.includes(companyId));
      const draft = action.payload;

      if (remaining.length !== draft.length) return state;
      const remainingSet = new Set(remaining);
      if (!draft.every((companyId) => remainingSet.has(companyId))) return state;

      return {
        ...state,
        activeCycle: {
          ...state.activeCycle,
          companyOrder: [...completed, ...draft, ...unestablishedIds],
          selectedCompanyId:
            draft[0] || completed[completed.length - 1] || establishedIds[0] || null,
        },
      };
    }

    case 'OR_COMPANY_MARK_DONE': {
      const { establishedIds } = splitCompanyOrderByEstablishment(
        state.activeCycle.companyOrder,
        state.companies
      );
      const establishedSet = new Set(establishedIds);
      if (!establishedSet.has(action.payload)) return state;

      const currentOR = state.activeCycle.currentOR;
      const completed = (state.activeCycle.completedCompanyIdsByOR?.[currentOR] || []).filter(
        (companyId) => establishedSet.has(companyId)
      );
      if (completed.includes(action.payload)) return state;

      const nextCompleted = [...completed, action.payload];
      const completedCompanyIdsByOR = {
        ...state.activeCycle.completedCompanyIdsByOR,
        [currentOR]: nextCompleted,
      };

      const nextUncompleted = establishedIds.filter(
        (companyId) => !nextCompleted.includes(companyId)
      );

      return {
        ...state,
        activeCycle: {
          ...state.activeCycle,
          completedCompanyIdsByOR,
          selectedCompanyId: nextUncompleted[0] || action.payload,
        },
      };
    }

    case 'OR_NEXT_ROUND': {
      if (state.activeCycle.currentOR >= state.flow.numORs) return state;
      const nextOR = state.activeCycle.currentOR + 1;
      const establishedIds = getEstablishedCompanyIds(
        state.activeCycle.companyOrder,
        state.companies
      );
      const establishedSet = new Set(establishedIds);
      return {
        ...state,
        activeCycle: {
          ...state.activeCycle,
          currentOR: nextOR,
          selectedCompanyId: establishedIds[0] || null,
          completedCompanyIdsByOR: {
            ...state.activeCycle.completedCompanyIdsByOR,
            [nextOR]: (state.activeCycle.completedCompanyIdsByOR[nextOR] || []).filter(
              (companyId) => establishedSet.has(companyId)
            ),
          },
        },
      };
    }

    case 'OR_REVENUE_SET': {
      const { companyId, orNum, revenue } = action.payload;
      return {
        ...state,
        companies: state.companies.map((company) => {
          if (company.id !== companyId) return company;
          const nextRevenues = buildORRevenues(state.flow.numORs, company.orRevenues || []);
          const targetIndex = nextRevenues.findIndex((entry) => entry.orNum === orNum);
          if (targetIndex >= 0) {
            nextRevenues[targetIndex] = {
              ...nextRevenues[targetIndex],
              revenue,
            };
          }

          return {
            ...company,
            orRevenues: nextRevenues,
          };
        }),
      };
    }

    case 'TRAIN_ADD': {
      const { companyId, trainId } = action.payload;
      return {
        ...state,
        companies: state.companies.map((company) =>
          company.id === companyId
            ? {
                ...company,
                trains: [...(company.trains || []), { id: trainId, stops: [] }],
              }
            : company
        ),
      };
    }

    case 'TRAIN_UPDATE_STOPS': {
      const { companyId, trainId, stops } = action.payload;
      return {
        ...state,
        companies: state.companies.map((company) => {
          if (company.id !== companyId) return company;
          return {
            ...company,
            trains: (company.trains || []).map((train) =>
              train.id === trainId ? { ...train, stops } : train
            ),
          };
        }),
      };
    }

    case 'TRAIN_CLEAR': {
      const { companyId, trainId } = action.payload;
      return {
        ...state,
        companies: state.companies.map((company) => {
          if (company.id !== companyId) return company;
          return {
            ...company,
            trains: (company.trains || []).map((train) =>
              train.id === trainId ? { ...train, stops: [] } : train
            ),
          };
        }),
      };
    }

    case 'TRAIN_DELETE': {
      const { companyId, trainId } = action.payload;
      return {
        ...state,
        companies: state.companies.map((company) => {
          if (company.id !== companyId) return company;
          return {
            ...company,
            trains: (company.trains || []).filter((train) => train.id !== trainId),
          };
        }),
      };
    }

    case 'CYCLE_CLOSE_AND_START_NEXT_SR': {
      const completedAt = action.payload;
      const currentCycleNo = state.activeCycle.cycleNo;
      const completedCycle = {
        cycleNo: currentCycleNo,
        completedAt,
        playersSnapshot: clonePlayers(state.players),
        companiesSnapshot: cloneCompanies(state.companies),
      };

      const nextCompanies = state.companies.map((company) => ({
        ...company,
        isUnestablished: company.isUnestablished
          ? true
          : inferIsUnestablished(company, state.flow.hasIpoShares),
        orRevenues: buildORRevenues(state.flow.numORs),
      }));

      const companyOrder = syncCompanyOrder(state.activeCycle.companyOrder, nextCompanies);
      const nextSelectedCompanyId = getFirstEstablishedCompanyId(companyOrder, nextCompanies);
      const nextCycleNo = currentCycleNo + 1;

      return {
        ...state,
        companies: nextCompanies,
        flow: {
          ...state.flow,
          step: 'stockRound',
        },
        activeCycle: {
          ...state.activeCycle,
          cycleNo: nextCycleNo,
          currentOR: 1,
          companyOrder,
          completedCompanyIdsByOR: buildEmptyCompletedByOR(state.flow.numORs),
          selectedCompanyId: nextSelectedCompanyId,
        },
        cycleHistory: [...state.cycleHistory, completedCycle],
        summarySelectedCycleNo: currentCycleNo,
        srValidation: {},
      };
    }

    case 'SUMMARY_CYCLE_SELECT':
      return {
        ...state,
        summarySelectedCycleNo: action.payload,
      };

    case 'APP_LOAD':
      return normalizeAppState(action.payload);

    case 'APP_RESET':
      return createBaseState();

    default:
      return state;
  }
}
