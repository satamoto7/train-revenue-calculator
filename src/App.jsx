import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';
import SyncStatusBar from './components/ui/SyncStatusBar';
import { useCollaborativeGame } from './hooks/useCollaborativeGame';
import { calculateCompanyTrainRevenue } from './lib/calc';
import { getPlayerDisplayName } from './lib/labels';
import {
  WORKSPACE_CONFIG,
  buildStockValidationMap,
  createCompany,
  createPlayer,
} from './state/appState';
import {
  selectBoardViewModel,
  selectHistoryCycles,
  selectMaterializedCompanies,
} from './state/selectors';
import LobbyView from './views/lobby/LobbyView';
import BoardView from './views/board/BoardView';
import HistoryView from './views/history/HistoryView';
import SetupView from './views/setup/SetupView';

const WorkspaceIcon = ({ workspace }) => {
  const commonProps = {
    'aria-hidden': 'true',
    className: 'h-4 w-4 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: '1.8',
    viewBox: '0 0 24 24',
  };

  if (workspace === 'board') {
    return (
      <svg {...commonProps}>
        <path d="M4 7h16" />
        <path d="M4 12h10" />
        <path d="M4 17h7" />
        <circle cx="17" cy="12" r="3" />
      </svg>
    );
  }

  if (workspace === 'setup') {
    return (
      <svg {...commonProps}>
        <path d="M4 7h10" />
        <path d="M18 7h2" />
        <path d="M4 17h2" />
        <path d="M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
      <path d="M10 10v9" />
    </svg>
  );
};

const WorkspaceButton = ({ workspace, label, currentWorkspace, onClick }) => {
  const isActive = currentWorkspace === workspace;
  return (
    <button
      id={`workspace-tab-${workspace}`}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`workspace-panel-${workspace}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onClick(workspace)}
      className={`relative min-h-11 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft ${
        isActive
          ? 'border-brand-accent text-white'
          : 'border-transparent text-slate-300 hover:text-white'
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <WorkspaceIcon workspace={workspace} />
        <span>{label}</span>
      </span>
    </button>
  );
};

const defaultWorkspaceForState = (appState) =>
  appState.gameConfig.setupLocked ? 'board' : 'setup';

function App() {
  const [modalMessage, setModalMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const {
    appState,
    dispatch,
    authStatus,
    authError,
    isLobbyVisible,
    lobbyState,
    syncMeta,
    actions,
  } = useCollaborativeGame();

  const board = useMemo(() => selectBoardViewModel(appState), [appState]);
  const historyCycles = useMemo(() => selectHistoryCycles(appState), [appState]);
  const materializedCompanies = useMemo(() => selectMaterializedCompanies(appState), [appState]);
  const [workspace, setWorkspace] = useState(defaultWorkspaceForState(appState));
  const lastGameIdRef = useRef('');

  useEffect(() => {
    if (!syncMeta.gameId) return;
    if (lastGameIdRef.current === syncMeta.gameId) return;
    lastGameIdRef.current = syncMeta.gameId;
    setWorkspace(defaultWorkspaceForState(appState));
  }, [appState, syncMeta.gameId]);

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
      setModalMessage('');
      setConfirmAction(null);
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
      setModalMessage('');
      setConfirmAction(null);
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
    dispatch({
      type: 'CONFIG_SET_COMPANY_TYPE',
      payload: {
        companyId,
        companyType,
      },
    });
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
    dispatch({
      type: 'BANK_POOL_DIVIDEND_RECIPIENT_SET',
      payload: recipient,
    });
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

  const handlePresidentChange = (companyId, presidentPlayerId) => {
    dispatch({
      type: 'SR_PRESIDENT_SET',
      payload: {
        companyId,
        presidentPlayerId,
      },
    });
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
      setModalMessage('');
      setConfirmAction(null);
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
      payload: {
        companyId,
        orNum,
        revenue: Math.max(0, parsed),
      },
    });
  };

  const handleSetORDividendMode = (companyId, orNum, mode) => {
    dispatch({
      type: 'OR_DIVIDEND_MODE_SET',
      payload: {
        companyId,
        orNum,
        mode,
      },
    });
  };

  const handleAddTrain = (companyId) => {
    const trainId =
      globalThis.crypto?.randomUUID?.() ||
      `train-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    dispatch({ type: 'TRAIN_ADD', payload: { companyId, trainId } });
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
    const company = materializedCompanies.find((item) => item.id === companyId);
    if (!company) return;
    const currentOR = board.activeCycle.currentOR;
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
      setWorkspace('board');
      setModalMessage('');
      setConfirmAction(null);
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
      setModalMessage('');
      setConfirmAction(null);
    });
    setModalMessage('Merger Round を終了し、次SRへ進みますか？');
  };

  const handleResetApp = () => {
    setConfirmAction(() => () => {
      dispatch({ type: 'APP_RESET' });
      setWorkspace('setup');
      setModalMessage('');
      setConfirmAction(null);
    });
    setModalMessage('全データをリセットしますか？この操作は取り消せません。');
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
        <p className="text-sm text-text-secondary">匿名ログインを準備中です...</p>
      </div>
    );
  }

  if (authStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
        <div className="max-w-xl rounded-xl border border-status-danger/20 bg-surface-elevated p-6 shadow-ui">
          <h1 className="mb-3 text-lg font-semibold text-status-danger">起動エラー</h1>
          <p className="text-sm text-text-secondary">{authError}</p>
        </div>
      </div>
    );
  }

  if (isLobbyVisible) {
    return (
      <div className="min-h-screen bg-surface-base px-4 py-6 text-text-primary sm:px-8 sm:py-10">
        <header className="mx-auto mb-8 max-w-6xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-primary sm:text-4xl">
            18xx収益計算
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            共同プレイ中の SR / OR 進行を軽く整理できます。
          </p>
        </header>

        <LobbyView
          prefilledGameId={lobbyState.prefilledGameId}
          onPrefilledGameIdChange={actions.setPrefilledGameId}
          onCreateGame={actions.createAndJoinGame}
          onJoinGame={actions.joinExistingGame}
          isBusy={lobbyState.isBusy}
          error={lobbyState.error}
          createdGame={lobbyState.createdGame}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base px-4 py-6 text-text-primary sm:px-8 sm:py-10">
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

      <header className="mx-auto mb-6 max-w-6xl rounded-2xl border border-brand-accent/20 bg-[radial-gradient(circle_at_top_left,_rgba(182,138,61,0.18),_transparent_35%),linear-gradient(135deg,_#102033,_#1b2f45_55%,_#27445D)] px-6 py-6 text-center shadow-ui-lg lg:px-8 lg:py-7 lg:text-left">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-accent/90">
              Revenue Companion
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              18xx収益計算
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              共同プレイを維持したまま、OR中の収益計算と配分確認を中心に進行できます。
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Button type="button" variant="danger" onClick={handleResetApp}>
              全体リセット
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl">
        <SyncStatusBar
          gameId={syncMeta.gameId}
          joinCode={syncMeta.joinCode}
          syncStatus={syncMeta.syncStatus}
          syncError={syncMeta.syncError}
          participants={syncMeta.participants}
          shareUrl={syncMeta.shareUrl}
          hasUnsyncedDraft={syncMeta.hasUnsyncedDraft}
          onResendUnsyncedDraft={actions.resendUnsyncedDraft}
          onReloadFromServer={actions.reloadFromServer}
          onShareRoom={actions.shareRoom}
        />
      </div>

      <div
        className="mx-auto mb-8 max-w-6xl overflow-x-auto rounded-xl border border-brand-accent/15 bg-[linear-gradient(180deg,_rgba(16,32,51,0.98),_rgba(27,47,69,0.98))] shadow-ui-lg"
        role="tablist"
        aria-label="ワークスペース切り替え"
      >
        <div className="flex min-w-max items-center gap-2 px-3">
          {WORKSPACE_CONFIG.map((entry) => (
            <WorkspaceButton
              key={entry.key}
              workspace={entry.key}
              label={entry.label}
              currentWorkspace={workspace}
              onClick={setWorkspace}
            />
          ))}
        </div>
      </div>

      <div
        id={`workspace-panel-${workspace}`}
        role="tabpanel"
        aria-labelledby={`workspace-tab-${workspace}`}
        className="mx-auto max-w-6xl"
      >
        {workspace === 'board' ? (
          <BoardView
            board={board}
            handleGreenTrainTriggeredChange={handleGreenTrainTriggeredChange}
            handleStockChange={handleStockChange}
            handlePresidentChange={handlePresidentChange}
            handleUnestablishedChange={handleUnestablishedChange}
            handleValidate={runStockValidation}
            handleCompleteStockRound={handleCompleteStockRound}
            handlePlayerPeriodicIncomeChange={handlePlayerPeriodicIncomeChange}
            handleCompanyPeriodicIncomeChange={handleCompanyPeriodicIncomeChange}
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
            handleSetORDividendMode={handleSetORDividendMode}
            handleEnterMergerRound={handleEnterMergerRound}
            handleStartNextCycle={handleStartNextCycle}
            handleCommitMerger={handleCommitMerger}
            handleCompleteMergerRound={handleCompleteMergerRound}
          />
        ) : null}

        {workspace === 'setup' ? (
          <SetupView
            players={appState.gameConfig.players}
            companies={appState.gameConfig.companies}
            numORs={appState.gameConfig.numORs}
            hasIpoShares={appState.gameConfig.hasIpoShares}
            mergerRoundEnabled={appState.gameConfig.mergerRoundEnabled}
            setupLocked={appState.gameConfig.setupLocked}
            bankPoolDividendRecipient={appState.gameConfig.bankPoolDividendRecipient}
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
            handleEditCompanyType={handleEditCompanyType}
            handleSetNumORs={handleSetNumORs}
            handleSetHasIpoShares={handleSetHasIpoShares}
            handleSetMergerRoundEnabled={handleSetMergerRoundEnabled}
            handleSetBankPoolDividendRecipient={handleSetBankPoolDividendRecipient}
            handleStartGame={handleStartGame}
          />
        ) : null}

        {workspace === 'history' ? (
          <HistoryView cycles={historyCycles} numORs={appState.gameConfig.numORs} />
        ) : null}
      </div>

      <footer className="mx-auto mt-12 max-w-6xl border-t border-border-subtle py-4 text-center">
        <p className="text-sm text-text-muted">&copy; 2024-2026 18xx収益計算</p>
      </footer>
    </div>
  );
}

export default App;
