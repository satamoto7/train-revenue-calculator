import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { load as loadAppState, save as saveAppState } from './storage/appStorage';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';
import SetupView from './views/setup/SetupView';
import StockRoundView from './views/stock-round/StockRoundView';
import OrRoundView from './views/or-round/OrRoundView';
import SummaryView from './views/summary/SummaryView';
import {
  getDefaultCompanyColor,
  getDefaultCompanySymbol,
  getDefaultPlayerColor,
  getDefaultPlayerSymbol,
  getPlayerDisplayName,
  getSeatLabel,
} from './lib/labels';
import { calculateCompanyTrainRevenue } from './lib/calc';
import { hasAnyStockInput, inferIsUnestablished } from './lib/companyStatus';

const STEP_CONFIG = [
  { key: 'setup', label: '設定' },
  { key: 'stockRound', label: 'SR株式' },
  { key: 'orRound', label: 'OR実行' },
  { key: 'summary', label: 'サマリー' },
];

const createPlayer = (index) => {
  const seatLabel = getSeatLabel(index);
  return {
    id: crypto.randomUUID(),
    seatLabel,
    displayName: `Player ${seatLabel}`,
    name: `Player ${seatLabel}`,
    color: getDefaultPlayerColor(index),
    symbol: getDefaultPlayerSymbol(index),
  };
};

const buildORRevenues = (numORs, currentOrRevenues = []) =>
  Array.from({ length: numORs }, (_, idx) => {
    const orNum = idx + 1;
    const existing = currentOrRevenues.find((orRevenue) => orRevenue.orNum === orNum);
    return existing || { orNum, revenue: 0 };
  });

const createCompany = (index, numORs) => ({
  id: crypto.randomUUID(),
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

const buildEmptyCompletedByOR = (numORs) =>
  Array.from({ length: numORs }, (_, idx) => idx + 1).reduce((acc, orNum) => {
    acc[orNum] = [];
    return acc;
  }, {});

const parsePercent = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
};

const cloneCompanies = (companies) =>
  companies.map((company) => ({
    ...company,
    trains: (company.trains || []).map((train) => ({
      ...train,
      stops: [...(train.stops || [])],
    })),
    stockHoldings: (company.stockHoldings || []).map((holding) => ({ ...holding })),
    orRevenues: (company.orRevenues || []).map((orRevenue) => ({ ...orRevenue })),
  }));

const clonePlayers = (players) => players.map((player) => ({ ...player }));

const evaluateStockValidation = (company, hasIpoShares) => {
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

const buildStockValidationMap = (companies, hasIpoShares) =>
  companies.reduce((acc, company) => {
    const result = evaluateStockValidation(company, hasIpoShares);
    acc[company.id] = result;
    return acc;
  }, {});

const syncCompanyOrder = (companyOrder, companies) => {
  const companyIds = companies.map((company) => company.id);
  const known = companyOrder.filter((companyId) => companyIds.includes(companyId));
  const missing = companyIds.filter((companyId) => !known.includes(companyId));
  return [...known, ...missing];
};

const resolveIsUnestablished = (company, hasIpoShares) =>
  typeof company?.isUnestablished === 'boolean'
    ? company.isUnestablished
    : inferIsUnestablished(company, hasIpoShares);

const splitCompanyOrderByEstablishment = (companyOrder, companies) => {
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const known = companyOrder.filter((companyId) => companiesById.has(companyId));
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

const getFirstEstablishedCompanyId = (companyOrder, companies) =>
  splitCompanyOrderByEstablishment(companyOrder, companies).establishedIds[0] || null;

const getEstablishedCompanyIds = (companyOrder, companies) =>
  splitCompanyOrderByEstablishment(companyOrder, companies).establishedIds;

const createBaseState = () => ({
  players: [],
  companies: [],
  flow: {
    step: 'setup',
    setupLocked: false,
    hasIpoShares: true,
    numORs: 2,
  },
  activeCycle: {
    cycleNo: 1,
    companyOrder: [],
    currentOR: 1,
    completedCompanyIdsByOR: buildEmptyCompletedByOR(2),
    selectedCompanyId: null,
  },
  cycleHistory: [],
  summarySelectedCycleNo: null,
  srValidation: {},
});

const initAppState = () => {
  try {
    return loadAppState() || createBaseState();
  } catch (_error) {
    return createBaseState();
  }
};

function appReducer(state, action) {
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

          if (hasAnyStockInput(nextCompany, state.flow.hasIpoShares)) {
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
      return action.payload;

    case 'APP_RESET':
      return createBaseState();

    default:
      return state;
  }
}

const StepButton = ({ stepKey, label, currentStep, onClick }) => {
  const isActive = currentStep === stepKey;
  return (
    <Button
      type="button"
      onClick={() => onClick(stepKey)}
      variant={isActive ? 'primary' : 'secondary'}
      className="min-w-[120px] rounded-full px-4 py-2 text-sm"
    >
      {label}
    </Button>
  );
};

function App() {
  const [appState, dispatch] = useReducer(appReducer, null, initAppState);
  const [modalMessage, setModalMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const {
    players,
    companies,
    flow,
    activeCycle,
    cycleHistory,
    summarySelectedCycleNo,
    srValidation,
  } = appState;

  useEffect(() => {
    try {
      saveAppState(appState);
    } catch (_error) {
      setModalMessage('データの保存に失敗しました。');
    }
  }, [appState]);

  const setPlayers = useCallback((nextPlayers) => {
    dispatch({ type: 'PLAYER_SET_ALL', payload: nextPlayers });
  }, []);

  const setCompanies = useCallback((nextCompanies) => {
    dispatch({ type: 'COMPANY_SET_ALL', payload: nextCompanies });
  }, []);

  const handleAddMultiplePlayers = (count) => {
    const newPlayers = Array.from({ length: count }, (_, index) =>
      createPlayer(players.length + index)
    );
    setPlayers([...players, ...newPlayers]);
  };

  const handleDeletePlayer = (playerId) => {
    const playerName = getPlayerDisplayName(players.find((player) => player.id === playerId));
    setConfirmAction(() => () => {
      const nextPlayers = players.filter((player) => player.id !== playerId);
      const nextCompanies = companies.map((company) => ({
        ...company,
        stockHoldings: (company.stockHoldings || []).filter(
          (holding) => holding.playerId !== playerId
        ),
      }));
      setPlayers(nextPlayers);
      setCompanies(nextCompanies);
      setModalMessage('');
      setConfirmAction(null);
    });
    setModalMessage(`プレイヤー「${playerName}」を削除しますか？`);
  };

  const handleEditPlayerName = (playerId, name) => {
    const nextPlayers = players.map((player) =>
      player.id === playerId ? { ...player, displayName: name, name } : player
    );
    setPlayers(nextPlayers);
  };

  const handleEditPlayerSymbol = (playerId, symbol) => {
    const nextPlayers = players.map((player) =>
      player.id === playerId ? { ...player, symbol } : player
    );
    setPlayers(nextPlayers);
  };

  const handleEditPlayerColor = (playerId, color) => {
    const nextPlayers = players.map((player) =>
      player.id === playerId ? { ...player, color } : player
    );
    setPlayers(nextPlayers);
  };

  const handleAddMultipleCompanies = (count) => {
    const newCompanies = Array.from({ length: count }, (_, index) =>
      createCompany(companies.length + index, flow.numORs)
    );
    setCompanies([...companies, ...newCompanies]);
  };

  const handleDeleteCompany = (companyId) => {
    setConfirmAction(() => () => {
      const nextCompanies = companies.filter((company) => company.id !== companyId);
      setCompanies(nextCompanies);
      setModalMessage('');
      setConfirmAction(null);
    });
    setModalMessage('企業を削除しますか？関連入力も消えます。');
  };

  const handleEditCompanyName = (companyId, displayName) => {
    const nextCompanies = companies.map((company) =>
      company.id === companyId ? { ...company, displayName } : company
    );
    setCompanies(nextCompanies);
  };

  const handleEditCompanySymbol = (companyId, symbol) => {
    const nextCompanies = companies.map((company) =>
      company.id === companyId ? { ...company, symbol } : company
    );
    setCompanies(nextCompanies);
  };

  const handleEditCompanyColor = (companyId, color) => {
    const nextCompanies = companies.map((company) =>
      company.id === companyId ? { ...company, color } : company
    );
    setCompanies(nextCompanies);
  };

  const handleSetNumORs = (numORs) => {
    dispatch({ type: 'OR_SET_NUM', payload: numORs });
  };

  const handleSetHasIpoShares = (hasIpoShares) => {
    dispatch({ type: 'IPO_MODE_SET', payload: hasIpoShares });
  };

  const handleStartGame = () => {
    if (players.length === 0 || companies.length === 0) {
      setModalMessage('ゲーム開始にはプレイヤーと企業の登録が必要です。');
      return;
    }
    dispatch({ type: 'SETUP_LOCK', payload: true });
  };

  const handleStockChange = (companyId, payload) => {
    dispatch({
      type: 'SR_STOCK_SET',
      payload: {
        companyId,
        ...payload,
      },
    });
  };

  const handleUnestablishedChange = (companyId, checked) => {
    dispatch({
      type: 'SR_UNESTABLISHED_SET',
      payload: {
        companyId,
        isUnestablished: checked,
      },
    });
  };

  const runStockValidation = () => {
    const validation = buildStockValidationMap(companies, flow.hasIpoShares);
    dispatch({ type: 'SR_VALIDATE_RUN', payload: validation });
    return validation;
  };

  const handleCompleteStockRound = () => {
    const validation = runStockValidation();
    const invalidCount = Object.values(validation).filter((entry) => entry.invalid).length;
    if (invalidCount > 0) {
      setModalMessage(
        `${invalidCount}社で株式配分に警告があります。警告を残したままORへ進行します。`
      );
    }
    const establishedIds = getEstablishedCompanyIds(activeCycle.companyOrder, companies);
    dispatch({ type: 'FLOW_STEP_SET', payload: 'orRound' });
    dispatch({ type: 'COMPANY_SELECT', payload: establishedIds[0] || null });
  };

  const handleSelectCompany = (companyId) => {
    if (flow.step === 'orRound') {
      const targetCompany = companies.find((company) => company.id === companyId);
      if (!targetCompany || targetCompany.isUnestablished) return;
    }
    dispatch({ type: 'COMPANY_SELECT', payload: companyId });
  };

  const handleMoveOrderUp = (companyId) => {
    dispatch({ type: 'OR_ORDER_MOVE_UP', payload: companyId });
  };

  const handleMoveOrderDown = (companyId) => {
    dispatch({ type: 'OR_ORDER_MOVE_DOWN', payload: companyId });
  };

  const handleRebalanceRemaining = (newRemainingOrder) => {
    setConfirmAction(() => () => {
      dispatch({ type: 'OR_ORDER_REBALANCE_REMAINING', payload: newRemainingOrder });
      setModalMessage('');
      setConfirmAction(null);
    });
    setModalMessage('未処理企業の順番を再調整しますか？');
  };

  const handleMarkCompanyDone = (companyId) => {
    const establishedCompanyIds = getEstablishedCompanyIds(activeCycle.companyOrder, companies);
    if (establishedCompanyIds.length === 0) return;
    if (!establishedCompanyIds.includes(companyId)) return;

    const establishedSet = new Set(establishedCompanyIds);
    const currentOR = activeCycle.currentOR;
    const completed = (activeCycle.completedCompanyIdsByOR?.[currentOR] || []).filter((id) =>
      establishedSet.has(id)
    );
    if (completed.includes(companyId)) return;

    const nextCount = completed.length + 1;
    dispatch({ type: 'OR_COMPANY_MARK_DONE', payload: companyId });

    if (nextCount >= establishedCompanyIds.length && currentOR < flow.numORs) {
      dispatch({ type: 'OR_NEXT_ROUND' });
      setModalMessage(`OR${currentOR}が完了しました。OR${currentOR + 1}に進みます。`);
      return;
    }

    if (nextCount >= establishedCompanyIds.length && currentOR === flow.numORs) {
      setModalMessage('最終ORが完了しました。「次SR開始」で次サイクルへ進めます。');
    }
  };

  const handleORRevenueChange = (companyId, orNum, value) => {
    const trimmed = `${value}`.trim();
    if (trimmed === '') {
      dispatch({
        type: 'OR_REVENUE_SET',
        payload: {
          companyId,
          orNum,
          revenue: 0,
        },
      });
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setModalMessage('OR収益には数値を入力してください。');
      return;
    }

    dispatch({
      type: 'OR_REVENUE_SET',
      payload: {
        companyId,
        orNum,
        revenue: Math.max(0, parsed),
      },
    });
  };

  const handleAddTrain = (companyId) => {
    dispatch({ type: 'TRAIN_ADD', payload: { companyId, trainId: crypto.randomUUID() } });
  };

  const handleUpdateTrainStops = (companyId, trainId, stops) => {
    dispatch({
      type: 'TRAIN_UPDATE_STOPS',
      payload: {
        companyId,
        trainId,
        stops,
      },
    });
  };

  const handleClearTrain = (companyId, trainId) => {
    dispatch({
      type: 'TRAIN_CLEAR',
      payload: {
        companyId,
        trainId,
      },
    });
  };

  const handleDeleteTrain = (companyId, trainId) => {
    dispatch({
      type: 'TRAIN_DELETE',
      payload: {
        companyId,
        trainId,
      },
    });
  };

  const handleSetTrainRevenueToCurrentOR = (companyId) => {
    const company = companies.find((item) => item.id === companyId);
    if (!company) return;
    const currentOR = activeCycle.currentOR;
    const revenue = calculateCompanyTrainRevenue(company.trains || []);
    dispatch({
      type: 'OR_REVENUE_SET',
      payload: {
        companyId,
        orNum: currentOR,
        revenue,
      },
    });
    setModalMessage(`列車計算収益 ${revenue} を OR${currentOR} に反映しました。`);
  };

  const handleStartNextCycle = () => {
    setConfirmAction(() => () => {
      dispatch({ type: 'CYCLE_CLOSE_AND_START_NEXT_SR', payload: new Date().toISOString() });
      setModalMessage('');
      setConfirmAction(null);
    });
    setModalMessage('現在サイクルを確定し、次SRへ進みますか？');
  };

  const handleStepChange = (stepKey) => {
    dispatch({ type: 'FLOW_STEP_SET', payload: stepKey });
  };

  const handleResetApp = () => {
    setConfirmAction(() => () => {
      dispatch({ type: 'APP_RESET' });
      setModalMessage('');
      setConfirmAction(null);
    });
    setModalMessage('全データをリセットしますか？この操作は取り消せません。');
  };

  const summaryCycles = useMemo(() => {
    const historyCycles = cycleHistory.map((cycle) => ({
      ...cycle,
      isCompleted: true,
    }));
    const active = {
      cycleNo: activeCycle.cycleNo,
      completedAt: null,
      playersSnapshot: clonePlayers(players),
      companiesSnapshot: cloneCompanies(companies),
      isCompleted: false,
    };
    return [...historyCycles, active];
  }, [cycleHistory, activeCycle.cycleNo, players, companies]);

  const resolvedSummaryCycleNo = useMemo(() => {
    if (summarySelectedCycleNo !== null) return summarySelectedCycleNo;
    if (cycleHistory.length > 0) {
      return cycleHistory[cycleHistory.length - 1].cycleNo;
    }
    return activeCycle.cycleNo;
  }, [summarySelectedCycleNo, cycleHistory, activeCycle.cycleNo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-base via-brand-accent-soft to-surface-muted p-4 text-text-primary sm:p-8">
      <Modal
        message={modalMessage}
        onClose={() => {
          setModalMessage('');
          setConfirmAction(null);
        }}
        showConfirm={!!confirmAction}
        onConfirm={() => {
          if (confirmAction) confirmAction();
        }}
      />

      <header className="mb-6 text-center">
        <h1 className="font-serif text-3xl font-bold text-brand-primary sm:text-4xl">
          18xx 収益計算補助
        </h1>
      </header>

      <nav
        className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-center gap-2"
        role="navigation"
      >
        {STEP_CONFIG.map((step) => (
          <StepButton
            key={step.key}
            stepKey={step.key}
            label={step.label}
            currentStep={flow.step}
            onClick={handleStepChange}
          />
        ))}
      </nav>

      <div className="mx-auto mb-6 flex max-w-5xl justify-end">
        <Button type="button" variant="danger" onClick={handleResetApp}>
          全体リセット
        </Button>
      </div>

      {flow.step === 'setup' && (
        <SetupView
          players={players}
          companies={companies}
          numORs={flow.numORs}
          hasIpoShares={flow.hasIpoShares}
          setupLocked={flow.setupLocked}
          handleAddMultiplePlayers={handleAddMultiplePlayers}
          handleDeletePlayer={handleDeletePlayer}
          handleEditPlayerName={handleEditPlayerName}
          handleEditPlayerSymbol={handleEditPlayerSymbol}
          handleEditPlayerColor={handleEditPlayerColor}
          handleAddMultipleCompanies={handleAddMultipleCompanies}
          handleDeleteCompany={handleDeleteCompany}
          handleEditCompanyName={handleEditCompanyName}
          handleEditCompanySymbol={handleEditCompanySymbol}
          handleEditCompanyColor={handleEditCompanyColor}
          handleSetNumORs={handleSetNumORs}
          handleSetHasIpoShares={handleSetHasIpoShares}
          handleStartGame={handleStartGame}
        />
      )}

      {flow.step === 'stockRound' && (
        <StockRoundView
          players={players}
          companies={companies}
          hasIpoShares={flow.hasIpoShares}
          validation={srValidation}
          handleStockChange={handleStockChange}
          handleUnestablishedChange={handleUnestablishedChange}
          handleValidate={runStockValidation}
          handleComplete={handleCompleteStockRound}
        />
      )}

      {flow.step === 'orRound' && (
        <OrRoundView
          players={players}
          companies={companies}
          flow={flow}
          activeCycle={activeCycle}
          handleSelectCompany={handleSelectCompany}
          handleMoveOrderUp={handleMoveOrderUp}
          handleMoveOrderDown={handleMoveOrderDown}
          handleRebalanceRemaining={handleRebalanceRemaining}
          handleMarkCompanyDone={handleMarkCompanyDone}
          handleORRevenueChange={handleORRevenueChange}
          handleAddTrain={handleAddTrain}
          handleUpdateTrainStops={handleUpdateTrainStops}
          handleClearTrain={handleClearTrain}
          handleDeleteTrain={handleDeleteTrain}
          handleSetTrainRevenueToCurrentOR={handleSetTrainRevenueToCurrentOR}
          handleStartNextCycle={handleStartNextCycle}
        />
      )}

      {flow.step === 'summary' && (
        <SummaryView
          cycles={summaryCycles}
          selectedCycleNo={resolvedSummaryCycleNo}
          handleSelectCycle={(cycleNo) =>
            dispatch({ type: 'SUMMARY_CYCLE_SELECT', payload: cycleNo })
          }
          numORs={flow.numORs}
        />
      )}

      <footer className="mt-12 border-t border-border-subtle py-4 text-center">
        <p className="text-sm text-text-secondary">&copy; 2024-2026 18xx 収益計算ツール</p>
      </footer>
    </div>
  );
}

export default App;
