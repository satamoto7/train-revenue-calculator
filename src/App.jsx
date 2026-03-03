import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';
import SyncStatusBar from './components/ui/SyncStatusBar';
import { useCollaborativeGame } from './hooks/useCollaborativeGame';
import { calculateCompanyTrainRevenue } from './lib/calc';
import { getPlayerDisplayName } from './lib/labels';
import {
  buildStockValidationMap,
  cloneCompanies,
  clonePlayers,
  createCompany,
  createPlayer,
  getEstablishedCompanyIds,
  STEP_CONFIG,
} from './state/appState';
import LobbyView from './views/lobby/LobbyView';
import OrRoundView from './views/or-round/OrRoundView';
import SetupView from './views/setup/SetupView';
import StockRoundView from './views/stock-round/StockRoundView';
import SummaryView from './views/summary/SummaryView';

const StepIcon = ({ stepKey }) => {
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

  if (stepKey === 'setup') {
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

  if (stepKey === 'stockRound') {
    return (
      <svg {...commonProps}>
        <path d="M5 18V9" />
        <path d="M12 18V5" />
        <path d="M19 18v-7" />
        <path d="M3 18h18" />
      </svg>
    );
  }

  if (stepKey === 'orRound') {
    return (
      <svg {...commonProps}>
        <path d="M5 16c2 0 3-8 7-8s5 8 7 8" />
        <path d="M6 16v2" />
        <path d="M18 16v2" />
        <path d="M8 10h8" />
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

const StepButton = ({ stepKey, label, currentStep, onClick }) => {
  const isActive = currentStep === stepKey;
  return (
    <button
      id={`view-tab-${stepKey}`}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`view-panel-${stepKey}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onClick(stepKey)}
      className={`relative min-h-11 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft ${
        isActive
          ? 'border-brand-accent text-white'
          : 'border-transparent text-slate-300 hover:text-white'
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <StepIcon stepKey={stepKey} />
        <span>{label}</span>
      </span>
    </button>
  );
};

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

  const {
    players,
    companies,
    flow,
    activeCycle,
    cycleHistory,
    summarySelectedCycleNo,
    srValidation,
  } = appState;
  const [currentViewStep, setCurrentViewStep] = useState('setup');
  const lastGameIdRef = useRef('');

  useEffect(() => {
    if (!syncMeta.gameId) return;
    if (lastGameIdRef.current === syncMeta.gameId) return;
    lastGameIdRef.current = syncMeta.gameId;
    setCurrentViewStep(flow.step || 'setup');
  }, [flow.step, syncMeta.gameId]);

  const setPlayers = useCallback(
    (nextPlayers) => {
      dispatch({ type: 'PLAYER_SET_ALL', payload: nextPlayers });
    },
    [dispatch]
  );

  const setCompanies = useCallback(
    (nextCompanies) => {
      dispatch({ type: 'COMPANY_SET_ALL', payload: nextCompanies });
    },
    [dispatch]
  );

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

  const handleSetBankPoolDividendRecipient = (recipient) => {
    dispatch({
      type: 'BANK_POOL_DIVIDEND_RECIPIENT_SET',
      payload: recipient,
    });
  };

  const handleStartGame = () => {
    if (players.length === 0 || companies.length === 0) {
      setModalMessage('ゲーム開始にはプレイヤーと企業の登録が必要です。');
      return;
    }
    dispatch({ type: 'SETUP_LOCK', payload: true });
    setCurrentViewStep('stockRound');
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
    dispatch({ type: 'COMPANY_SELECT', payload: establishedIds[0] || null });
    setCurrentViewStep('orRound');
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
      setCurrentViewStep('stockRound');
      setModalMessage('');
      setConfirmAction(null);
    });
    setModalMessage('現在サイクルを確定し、次SRへ進みますか？');
  };

  const handleStepChange = (stepKey) => {
    setCurrentViewStep(stepKey);
  };

  const handleResetApp = () => {
    setConfirmAction(() => () => {
      dispatch({ type: 'APP_RESET' });
      setCurrentViewStep('setup');
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
              設定から SR、OR、サマリーまでを一つの画面で追えます。
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Button type="button" variant="danger" onClick={handleResetApp}>
              全体リセット
            </Button>
          </div>
        </div>
      </header>

      <div
        className="mx-auto mb-8 max-w-6xl overflow-x-auto rounded-xl border border-brand-accent/15 bg-[linear-gradient(180deg,_rgba(16,32,51,0.98),_rgba(27,47,69,0.98))] shadow-ui-lg"
        role="tablist"
        aria-label="画面切り替え"
      >
        <div className="flex min-w-max items-center gap-2 px-3">
          {STEP_CONFIG.map((step) => (
            <StepButton
              key={step.key}
              stepKey={step.key}
              label={step.label}
              currentStep={currentViewStep}
              onClick={handleStepChange}
            />
          ))}
        </div>
      </div>

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
        id={`view-panel-${currentViewStep}`}
        role="tabpanel"
        aria-labelledby={`view-tab-${currentViewStep}`}
        className="mx-auto max-w-6xl"
      >
        {currentViewStep === 'setup' && (
          <SetupView
            players={players}
            companies={companies}
            numORs={flow.numORs}
            hasIpoShares={flow.hasIpoShares}
            setupLocked={flow.setupLocked}
            bankPoolDividendRecipient={flow.bankPoolDividendRecipient}
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
            handleSetBankPoolDividendRecipient={handleSetBankPoolDividendRecipient}
            handleStartGame={handleStartGame}
          />
        )}

        {currentViewStep === 'stockRound' && (
          <StockRoundView
            players={players}
            companies={companies}
            hasIpoShares={flow.hasIpoShares}
            validation={srValidation}
            handleStockChange={handleStockChange}
            handlePresidentChange={handlePresidentChange}
            handleUnestablishedChange={handleUnestablishedChange}
            handleValidate={runStockValidation}
            handleComplete={handleCompleteStockRound}
          />
        )}

        {currentViewStep === 'orRound' && (
          <OrRoundView
            players={players}
            companies={companies}
            flow={flow}
            activeCycle={activeCycle}
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

        {currentViewStep === 'summary' && (
          <SummaryView
            cycles={summaryCycles}
            selectedCycleNo={resolvedSummaryCycleNo}
            handleSelectCycle={(cycleNo) =>
              dispatch({ type: 'SUMMARY_CYCLE_SELECT', payload: cycleNo })
            }
            numORs={flow.numORs}
          />
        )}
      </div>

      <footer className="mx-auto mt-12 max-w-6xl border-t border-border-subtle py-4 text-center">
        <p className="text-sm text-text-muted">&copy; 2024-2026 18xx収益計算</p>
      </footer>
    </div>
  );
}

export default App;
