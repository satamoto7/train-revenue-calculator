const parsePercent = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
};

export const getHoldingPercentage = (company, playerId) => {
  const holding = (company?.stockHoldings || []).find((entry) => entry.playerId === playerId);
  return parsePercent(holding?.percentage || 0);
};

export const getLeadingPlayerIds = (company) => {
  const holdings = (company?.stockHoldings || [])
    .map((holding) => ({
      playerId: holding.playerId,
      percentage: parsePercent(holding.percentage),
    }))
    .filter((holding) => holding.percentage > 0);

  if (holdings.length === 0) return [];

  const highestPercentage = Math.max(...holdings.map((holding) => holding.percentage));
  return holdings
    .filter((holding) => holding.percentage === highestPercentage)
    .map((holding) => holding.playerId);
};

export const getEffectivePresidentPlayerIds = (company) => {
  if (typeof company?.presidentPlayerId === 'string' && company.presidentPlayerId.trim()) {
    return [company.presidentPlayerId];
  }
  return getLeadingPlayerIds(company);
};
