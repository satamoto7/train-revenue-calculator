import React from 'react';
import CycleStatusHeader from './CycleStatusHeader';
import StockRoundView from '../stock-round/StockRoundView';
import OrRoundView from '../or-round/OrRoundView';
import MergerRoundView from '../merger-round/MergerRoundView';

const BoardView = ({
  board,
  handleGreenTrainTriggeredChange,
  handleStockChange,
  handlePresidentChange,
  handleUnestablishedChange,
  handleValidate,
  handleCompleteStockRound,
  handlePlayerPeriodicIncomeChange,
  handleCompanyPeriodicIncomeChange,
  handleSetNumORs,
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
}) => {
  const { players, companies, validation, flow, activeCycle, status, merger } = board;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <CycleStatusHeader
        cycleNo={status.cycleNo}
        mode={status.mode}
        currentOR={activeCycle.currentOR}
        numORs={flow.numORs}
        completedCount={status.completedCount}
        remainingCount={status.remainingCount}
        invalidCount={status.invalidCount}
        mergerRoundEnabled={flow.mergerRoundEnabled}
        greenTrainTriggered={flow.greenTrainTriggered}
        onGreenTrainTriggeredChange={handleGreenTrainTriggeredChange}
        onCompleteStockRound={handleCompleteStockRound}
      />

      {status.mode === 'stockRound' ? (
        <StockRoundView
          embedded
          players={players}
          companies={companies}
          numORs={flow.numORs}
          hasIpoShares={flow.hasIpoShares}
          validation={validation}
          handleStockChange={handleStockChange}
          handlePresidentChange={handlePresidentChange}
          handleUnestablishedChange={handleUnestablishedChange}
          handleValidate={handleValidate}
          handleSetNumORs={handleSetNumORs}
          handleComplete={handleCompleteStockRound}
          handlePlayerPeriodicIncomeChange={handlePlayerPeriodicIncomeChange}
          handleCompanyPeriodicIncomeChange={handleCompanyPeriodicIncomeChange}
        />
      ) : status.mode === 'mergerRound' ? (
        <MergerRoundView
          players={players}
          minorCandidates={merger.minorCandidates}
          majorCandidates={merger.majorCandidates}
          hasIpoShares={flow.hasIpoShares}
          onCommitMerge={handleCommitMerger}
          onComplete={handleCompleteMergerRound}
        />
      ) : (
        <OrRoundView
          embedded
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
          handleEnterMergerRound={handleEnterMergerRound}
          handlePlayerPeriodicIncomeChange={handlePlayerPeriodicIncomeChange}
          handleCompanyPeriodicIncomeChange={handleCompanyPeriodicIncomeChange}
          handleSetORDividendMode={handleSetORDividendMode}
        />
      )}
    </div>
  );
};

export default BoardView;
