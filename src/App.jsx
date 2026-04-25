import React, { useMemo } from 'react';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';
import SyncStatusBar from './components/ui/SyncStatusBar';
import { useCollaborativeGame } from './hooks/useCollaborativeGame';
import { useGameActions } from './hooks/useGameActions';
import { useWorkspaceNavigation } from './hooks/useWorkspaceNavigation';
import { WORKSPACE_CONFIG } from './state/appState';
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
      className={`relative min-h-11 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft ${
        isActive
          ? 'border-brand-primary bg-brand-soft text-brand-primary shadow-ui'
          : 'border-transparent text-text-secondary hover:border-border-subtle hover:bg-surface-muted hover:text-text-primary'
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <WorkspaceIcon workspace={workspace} />
        <span>{label}</span>
      </span>
    </button>
  );
};

function App() {
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
  const { workspace, setWorkspace } = useWorkspaceNavigation(appState, syncMeta.gameId);
  const { modal, handlers } = useGameActions({
    appState,
    board,
    dispatch,
    materializedCompanies,
    setWorkspace,
  });
  const {
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
  } = handlers;

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
    <div className="min-h-screen bg-transparent px-4 py-4 text-text-primary sm:px-8 sm:py-8">
      <Modal
        message={modal.message}
        onClose={modal.close}
        showConfirm={!!modal.confirmAction}
        onConfirm={modal.confirm}
      />

      <header className="ui-panel mx-auto mb-4 max-w-6xl px-5 py-5 text-center sm:px-6 sm:py-6 lg:text-left">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-text-muted">
              Revenue Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
              18xx収益計算
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              収益入力を素早く、一覧は見失わずに確認できるようにした運営用ワークスペースです。
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
        className="mx-auto mb-6 max-w-6xl overflow-x-auto rounded-3xl border border-border-subtle bg-surface-elevated p-2 shadow-ui"
        role="tablist"
        aria-label="ワークスペース切り替え"
      >
        <div className="flex min-w-max items-center gap-2">
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
            handleSetNumORs={handleSetNumORs}
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
            handleApplyCompanyTemplate={handleApplyCompanyTemplate}
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

        {workspace === 'history' ? <HistoryView cycles={historyCycles} /> : null}
      </div>

      <footer className="mx-auto mt-12 max-w-6xl border-t border-border-subtle py-4 text-center">
        <p className="text-sm text-text-muted">&copy; 2024-2026 18xx収益計算</p>
      </footer>
    </div>
  );
}

export default App;
