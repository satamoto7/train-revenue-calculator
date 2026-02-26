const toNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const hasAnyStockInput = (company, hasIpoShares = true) => {
  const hasPlayerHolding = (company?.stockHoldings || []).some(
    (holding) => toNumeric(holding?.percentage) > 0
  );
  const hasTreasury = toNumeric(company?.treasuryStockPercentage) > 0;
  const hasBankPool = hasIpoShares && toNumeric(company?.bankPoolPercentage) > 0;

  return hasPlayerHolding || hasTreasury || hasBankPool;
};

export const inferIsUnestablished = (company, hasIpoShares = true) =>
  !hasAnyStockInput(company, hasIpoShares);
