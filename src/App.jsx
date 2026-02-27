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

  const handleSelectCompany = (companyId) => {
    if (currentViewStep === 'orRound') {
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-base via-brand-accent-soft to-surface-muted p-4">
        <p className="text-sm text-text-secondary">匿名ログインを準備中です...</p>
      </div>
    );
  }

  if (authStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-base via-brand-accent-soft to-surface-muted p-4">
        <div className="max-w-xl rounded-xl border border-status-danger bg-surface-elevated p-6 shadow-md">
          <h1 className="mb-3 text-lg font-semibold text-status-danger">起動エラー</h1>
          <p className="text-sm text-text-secondary">{authError}</p>
        </div>
      </div>
    );
  }

  if (isLobbyVisible) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-base via-brand-accent-soft to-surface-muted p-4 text-text-primary sm:p-8">
        <header className="mb-6 text-center">
          <h1 className="font-serif text-3xl font-bold text-brand-primary sm:text-4xl">
            18xx 収益計算補助
          </h1>
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

      <SyncStatusBar
        gameId={syncMeta.gameId}
        joinCode={syncMeta.joinCode}
        syncStatus={syncMeta.syncStatus}
        syncError={syncMeta.syncError}
        participants={syncMeta.participants}
        hasUnsyncedDraft={syncMeta.hasUnsyncedDraft}
        onResendUnsyncedDraft={actions.resendUnsyncedDraft}
        onReloadFromServer={actions.reloadFromServer}
      />

      <nav
        className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-center gap-2"
        role="navigation"
      >
        {STEP_CONFIG.map((step) => (
          <StepButton
            key={step.key}
            stepKey={step.key}
            label={step.label}
            currentStep={currentViewStep}
            onClick={handleStepChange}
          />
        ))}
      </nav>

      <div className="mx-auto mb-6 flex max-w-5xl justify-end">
        <Button type="button" variant="danger" onClick={handleResetApp}>
          全体リセット
        </Button>
      </div>

      {currentViewStep === 'setup' && (
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

      {currentViewStep === 'stockRound' && (
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

      {currentViewStep === 'orRound' && (
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

      <footer className="mt-12 border-t border-border-subtle py-4 text-center">
        <p className="text-sm text-text-secondary">&copy; 2024-2026 18xx 収益計算ツール</p>
      </footer>
    </div>
  );
}

export default App;
