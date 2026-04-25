import { useCallback, useState } from 'react';
import { calculateCompanyTrainRevenue } from '../lib/calc';
import {
  buildCompaniesFromTemplate,
  GAME_TEMPLATE_OPTIONS,
  templateRequiresMergerRound,
} from '../lib/gameTemplates';
import { getPlayerDisplayName } from '../lib/labels';
import { buildStockValidationMap, createCompany, createPlayer } from '../state/appState';

export function useGameActions({ appState, board, dispatch, materializedCompanies, setWorkspace }) {
  const [modalMessage, setModalMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const closeModal = useCallback(() => {
    setModalMessage('');
    setConfirmAction(null);
  }, []);

  const setPlayers = useCallback(
    (nextPlayers) => {
      dispatch({ type: 'CONFIG_SET_PLAYERS', payload: nextPlayers });
    },
    [dispatch]
  );

  const setCompanies = useCallback(
    (nextCompanies) => {
      dispatch({ type: 'CONFIG_SET_COMPANIES', payload: nextCompanies });
    },
    [dispatch]
  );

  const applyCompanyTemplate = useCallback(
    (templateId) => {
      const nextCompanies = buildCompaniesFromTemplate(templateId);
      if (nextCompanies.length === 0) return;
      if (templateRequiresMergerRound(templateId)) {
        dispatch({ type: 'CONFIG_SET_MERGER_ROUND_ENABLED', payload: true });
      }
      setCompanies(nextCompanies);
    },
    [dispatch, setCompanies]
  );

  const handleAddMultiplePlayers = (count) => {
    const nextPlayers = [
      ...appState.gameConfig.players,
      ...Array.from({ length: count }, (_, index) =>
        createPlayer(appState.gameConfig.players.length + index)
      ),
    ];
    setPlayers(nextPlayers);
  };

  const handleDeletePlayer = (playerId) => {
    const playerName = getPlayerDisplayName(
      appState.gameConfig.players.find((player) => player.id === playerId)
    );
    setConfirmAction(() => () => {
      setPlayers(appState.gameConfig.players.filter((player) => player.id !== playerId));
      closeModal();
    });
    setModalMessage(`プレイヤー「${playerName}」を削除しますか？`);
  };

  const handleEditPlayerName = (playerId, name) => {
    setPlayers(
      appState.gameConfig.players.map((player) =>
        player.id === playerId ? { ...player, displayName: name, name } : player
      )
    );
  };

  const handleEditPlayerSymbol = (playerId, symbol) => {
    setPlayers(
      appState.gameConfig.players.map((player) =>
        player.id === playerId ? { ...player, symbol } : player
      )
    );
  };

  const handleEditPlayerColor = (playerId, color) => {
    setPlayers(
      appState.gameConfig.players.map((player) =>
        player.id === playerId ? { ...player, color } : player
      )
    );
  };

  const handleAddMultipleCompanies = (count) => {
    const nextCompanies = [
      ...appState.gameConfig.companies,
      ...Array.from({ length: count }, (_, index) =>
        createCompany(appState.gameConfig.companies.length + index)
      ),
    ];
    setCompanies(nextCompanies);
  };

  const handleDeleteCompany = (companyId) => {
    setConfirmAction(() => () => {
      setCompanies(appState.gameConfig.companies.filter((company) => company.id !== companyId));
      closeModal();
    });
    setModalMessage('企業を削除しますか？関連入力も消えます。');
  };

  const handleEditCompanyName = (companyId, displayName) => {
    setCompanies(
      appState.gameConfig.companies.map((company) =>
        company.id === companyId ? { ...company, displayName } : company
      )
    );
  };

  const handleApplyCompanyTemplate = (templateId) => {
    const template = GAME_TEMPLATE_OPTIONS.find((entry) => entry.id === templateId);
    if (!template) return;

    if (appState.gameConfig.companies.length === 0) {
      applyCompanyTemplate(templateId);
      return;
    }

    setConfirmAction(() => () => {
      applyCompanyTemplate(templateId);
      closeModal();
    });
    setModalMessage(
      `「${template.label}」の企業テンプレートを適用しますか？\n既存の企業一覧・株式入力・OR結果・進行順は新しい企業セットに置き換わります。${
        templateRequiresMergerRound(templateId)
          ? '\nこのテンプレートは Merger Round も有効化します。'
          : ''
      }`
    );
  };

  const handleEditCompanySymbol = (companyId, symbol) => {
    setCompanies(
      appState.gameConfig.companies.map((company) =>
        company.id === companyId ? { ...company, symbol } : company
      )
    );
  };

  const handleEditCompanyColor = (companyId, color) => {
    setCompanies(
      appState.gameConfig.companies.map((company) =>
        company.id === companyId ? { ...company, color } : company
      )
    );
  };

  const handleEditCompanyType = (companyId, companyType) => {
    dispatch({ type: 'CONFIG_SET_COMPANY_TYPE', payload: { companyId, companyType } });
  };

  const handleSetNumORs = (numORs) => {
    dispatch({ type: 'CONFIG_SET_NUM_ORS', payload: numORs });
  };

  const handleSetHasIpoShares = (hasIpoShares) => {
    dispatch({ type: 'CONFIG_SET_HAS_IPO_SHARES', payload: hasIpoShares });
  };

  const handleSetMergerRoundEnabled = (enabled) => {
    dispatch({ type: 'CONFIG_SET_MERGER_ROUND_ENABLED', payload: enabled });
  };

  const handleSetBankPoolDividendRecipient = (recipient) => {
    dispatch({ type: 'BANK_POOL_DIVIDEND_RECIPIENT_SET', payload: recipient });
  };

  const handleStartGame = () => {
    if (appState.gameConfig.players.length === 0 || appState.gameConfig.companies.length === 0) {
      setModalMessage('ゲーム開始にはプレイヤーと企業の登録が必要です。');
      return;
    }
    dispatch({ type: 'SETUP_LOCK', payload: true });
    setWorkspace('board');
  };

  const handleStockChange = (companyId, payload) => {
    dispatch({ type: 'SR_STOCK_SET', payload: { companyId, ...payload } });
  };

  const handleUnestablishedChange = (companyId, checked) => {
    dispatch({ type: 'SR_UNESTABLISHED_SET', payload: { companyId, isUnestablished: checked } });
  };

  const handlePresidentChange = (companyId, presidentPlayerId) => {
    dispatch({ type: 'SR_PRESIDENT_SET', payload: { companyId, presidentPlayerId } });
  };

  const runStockValidation = () => {
    const validation = buildStockValidationMap(appState.gameConfig, appState.stockRoundState);
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
    dispatch({ type: 'SR_COMPLETE' });
    setWorkspace('board');
  };

  const handleGreenTrainTriggeredChange = (checked) => {
    dispatch({ type: 'GREEN_TRAIN_TRIGGER_SET', payload: checked });
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
      closeModal();
    });
    setModalMessage('未処理企業の順番を再調整しますか？');
  };

  const handleMarkCompanyDone = (companyId) => {
    const companiesById = new Map(board.companies.map((company) => [company.id, company]));
    const establishedCompanyIds = (board.activeCycle.companyOrder || []).filter(
      (id) => !companiesById.get(id)?.isUnestablished
    );
    if (!establishedCompanyIds.includes(companyId)) return;

    const currentOR = board.activeCycle.currentOR;
    const completed = (board.activeCycle.completedCompanyIdsByOR?.[currentOR] || []).filter((id) =>
      establishedCompanyIds.includes(id)
    );
    if (completed.includes(companyId)) return;

    const nextCount = completed.length + 1;
    dispatch({ type: 'OR_COMPANY_MARK_DONE', payload: companyId });

    if (nextCount >= establishedCompanyIds.length && currentOR < board.flow.numORs) {
      dispatch({ type: 'OR_NEXT_ROUND' });
      setModalMessage(`OR${currentOR}が完了しました。OR${currentOR + 1}に進みます。`);
      return;
    }

    if (nextCount >= establishedCompanyIds.length && currentOR === board.flow.numORs) {
      setModalMessage(
        board.flow.shouldEnterMergerRound
          ? '最終ORが完了しました。「Merger Roundへ」で合併処理へ進めます。'
          : '最終ORが完了しました。「次SR開始」で次サイクルへ進めます。'
      );
    }
  };

  const parsePeriodicIncome = (value, errorMessage) => {
    const trimmed = `${value}`.trim();
    if (trimmed === '') return 0;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setModalMessage(errorMessage);
      return null;
    }
    return Math.max(0, parsed);
  };

  const handlePlayerPeriodicIncomeChange = (playerId, value) => {
    const periodicIncome = parsePeriodicIncome(
      value,
      'プレイヤー定期収入には数値を入力してください。'
    );
    if (periodicIncome === null) return;
    dispatch({ type: 'PLAYER_PERIODIC_INCOME_SET', payload: { playerId, periodicIncome } });
  };

  const handleCompanyPeriodicIncomeChange = (companyId, value) => {
    const periodicIncome = parsePeriodicIncome(value, '企業定期収入には数値を入力してください。');
    if (periodicIncome === null) return;
    dispatch({ type: 'COMPANY_PERIODIC_INCOME_SET', payload: { companyId, periodicIncome } });
  };

  const handleORRevenueChange = (companyId, orNum, value) => {
    const trimmed = `${value}`.trim();
    if (trimmed === '') return;

    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setModalMessage('OR収益には数値を入力してください。');
      return;
    }

    dispatch({
      type: 'OR_REVENUE_SET',
      payload: { companyId, orNum, revenue: Math.max(0, parsed) },
    });
  };

  const handleSetORDividendMode = (companyId, orNum, mode) => {
    dispatch({ type: 'OR_DIVIDEND_MODE_SET', payload: { companyId, orNum, mode } });
  };

  const handleAddTrain = (companyId) => {
    const trainId =
      globalThis.crypto?.randomUUID?.() ||
      `train-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    dispatch({ type: 'TRAIN_ADD', payload: { companyId, trainId } });
  };

  const handleUpdateTrainStops = (companyId, trainId, stops) => {
    dispatch({ type: 'TRAIN_UPDATE_STOPS', payload: { companyId, trainId, stops } });
  };

  const handleClearTrain = (companyId, trainId) => {
    dispatch({ type: 'TRAIN_CLEAR', payload: { companyId, trainId } });
  };

  const handleDeleteTrain = (companyId, trainId) => {
    dispatch({ type: 'TRAIN_DELETE', payload: { companyId, trainId } });
  };

  const handleSetTrainRevenueToCurrentOR = (companyId) => {
    const company = materializedCompanies.find((item) => item.id === companyId);
    if (!company) return;
    const currentOR = board.activeCycle.currentOR;
    const revenue = calculateCompanyTrainRevenue(company.trains || []);
    dispatch({ type: 'OR_REVENUE_SET', payload: { companyId, orNum: currentOR, revenue } });
    setModalMessage(`列車計算収益 ${revenue} を OR${currentOR} に反映しました。`);
  };

  const handleStartNextCycle = () => {
    setConfirmAction(() => () => {
      dispatch({ type: 'CYCLE_CLOSE_AND_START_NEXT_SR', payload: new Date().toISOString() });
      setWorkspace('board');
      closeModal();
    });
    setModalMessage('現在サイクルを確定し、次SRへ進みますか？');
  };

  const handleEnterMergerRound = () => {
    dispatch({ type: 'OR_ENTER_MERGER_ROUND' });
    setWorkspace('board');
  };

  const handleCommitMerger = (payload) => {
    dispatch({ type: 'MR_MERGE_COMMIT', payload });
    setModalMessage(
      '合併を反映しました。続けて次の合併を行うか、Merger Round を終了してください。'
    );
  };

  const handleCompleteMergerRound = () => {
    setConfirmAction(() => () => {
      dispatch({ type: 'MR_COMPLETE_AND_START_NEXT_SR', payload: new Date().toISOString() });
      setWorkspace('board');
      closeModal();
    });
    setModalMessage('Merger Round を終了し、次SRへ進みますか？');
  };

  const handleResetApp = () => {
    setConfirmAction(() => () => {
      dispatch({ type: 'APP_RESET' });
      setWorkspace('setup');
      closeModal();
    });
    setModalMessage('全データをリセットしますか？この操作は取り消せません。');
  };

  return {
    modal: {
      message: modalMessage,
      close: closeModal,
      confirmAction,
      confirm: () => {
        if (confirmAction) confirmAction();
      },
    },
    handlers: {
      handleAddMultiplePlayers,
      handleDeletePlayer,
      handleEditPlayerName,
      handleEditPlayerSymbol,
      handleEditPlayerColor,
      handleAddMultipleCompanies,
      handleApplyCompanyTemplate,
      handleDeleteCompany,
      handleEditCompanyName,
      handleEditCompanySymbol,
      handleEditCompanyColor,
      handleEditCompanyType,
      handleSetNumORs,
      handleSetHasIpoShares,
      handleSetMergerRoundEnabled,
      handleSetBankPoolDividendRecipient,
      handleStartGame,
      handleStockChange,
      handlePresidentChange,
      handleUnestablishedChange,
      runStockValidation,
      handleCompleteStockRound,
      handlePlayerPeriodicIncomeChange,
      handleCompanyPeriodicIncomeChange,
      handleGreenTrainTriggeredChange,
      handleMoveOrderUp,
      handleMoveOrderDown,
      handleRebalanceRemaining,
      handleMarkCompanyDone,
      handleORRevenueChange,
      handleAddTrain,
      handleUpdateTrainStops,
      handleClearTrain,
      handleDeleteTrain,
      handleSetTrainRevenueToCurrentOR,
      handleSetORDividendMode,
      handleEnterMergerRound,
      handleStartNextCycle,
      handleCommitMerger,
      handleCompleteMergerRound,
      handleResetApp,
    },
  };
}
