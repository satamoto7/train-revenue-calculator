import React from 'react';
import CycleStatusHeader from './CycleStatusHeader';
import StockRoundView from '../stock-round/StockRoundView';
import OrRoundView from '../or-round/OrRoundView';

const BoardView = ({
  board,
  handleStockChange,
  handlePresidentChange,
  handleUnestablishedChange,
  handleValidate,
  handleCompleteStockRound,
  handlePlayerPeriodicIncomeChange,
  handleCompanyPeriodicIncomeChange,
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
  handleStartNextCycle,
}) => {
  const { players, companies, validation, flow, activeCycle, status } = board;

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
        onCompleteStockRound={handleCompleteStockRound}
      />

      {status.mode === 'stockRound' ? (
        <StockRoundView
          embedded
          players={players}
          companies={companies}
          hasIpoShares={flow.hasIpoShares}
          validation={validation}
          handleStockChange={handleStockChange}
          handlePresidentChange={handlePresidentChange}
          handleUnestablishedChange={handleUnestablishedChange}
          handleValidate={handleValidate}
          handleComplete={handleCompleteStockRound}
          handlePlayerPeriodicIncomeChange={handlePlayerPeriodicIncomeChange}
          handleCompanyPeriodicIncomeChange={handleCompanyPeriodicIncomeChange}
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
          handlePlayerPeriodicIncomeChange={handlePlayerPeriodicIncomeChange}
          handleCompanyPeriodicIncomeChange={handleCompanyPeriodicIncomeChange}
          handleSetORDividendMode={handleSetORDividendMode}
        />
      )}
    </div>
  );
};

export default BoardView;
