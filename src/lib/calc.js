const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateTrainRevenue = (stops = []) =>
  stops.reduce((sum, stop) => sum + toSafeNumber(stop), 0);

export const calculateCompanyTrainRevenue = (trains = []) =>
  trains.reduce((sum, train) => sum + calculateTrainRevenue(train?.stops || []), 0);

export const calculateCompanyTotalORRevenue = (orRevenues = [], numORs = Infinity) =>
  orRevenues.reduce((sum, orEntry, index) => {
    const rawOrNum = Number(orEntry?.orNum);
    const normalizedOrNum = Number.isFinite(rawOrNum) && rawOrNum > 0 ? rawOrNum : index + 1;

    if (normalizedOrNum > numORs) return sum;
    return sum + toSafeNumber(orEntry?.revenue);
  }, 0);

export const calculateDividend = (totalRevenue = 0, percentage = 0) =>
  Math.floor(toSafeNumber(totalRevenue) * (toSafeNumber(percentage) / 100));

const normalizeDividendMode = (mode) =>
  ['full', 'withhold', 'half'].includes(mode) ? mode : 'full';

export const splitHalfDividendRevenue = (totalRevenue = 0) => {
  const normalizedRevenue = Math.max(0, toSafeNumber(totalRevenue));
  if (normalizedRevenue === 0) {
    return { dividendRevenue: 0, retainedRevenue: 0 };
  }

  const dividendRevenue = Math.min(normalizedRevenue, Math.ceil(normalizedRevenue / 20) * 10);
  return {
    dividendRevenue,
    retainedRevenue: normalizedRevenue - dividendRevenue,
  };
};

export const calculateORRevenueDistribution = ({
  company,
  players = [],
  totalRevenue = 0,
  companyIncome = 0,
  mode = 'full',
  bankPoolDividendRecipient = 'market',
}) => {
  const normalizedMode = normalizeDividendMode(mode);
  const normalizedRevenue = Math.max(0, toSafeNumber(totalRevenue));
  const normalizedCompanyIncome = Math.max(0, toSafeNumber(companyIncome));
  const normalizedRecipient = bankPoolDividendRecipient === 'company' ? 'company' : 'market';

  let distributableRevenue = normalizedRevenue;
  let retainedRevenue = 0;

  if (normalizedMode === 'withhold') {
    distributableRevenue = 0;
    retainedRevenue = normalizedRevenue;
  } else if (normalizedMode === 'half') {
    const half = splitHalfDividendRevenue(normalizedRevenue);
    distributableRevenue = half.dividendRevenue;
    retainedRevenue = half.retainedRevenue;
  }

  const playerPayouts = players
    .map((player) => {
      const holding = (company?.stockHoldings || []).find((entry) => entry.playerId === player.id);
      const percentage = Math.max(0, toSafeNumber(holding?.percentage));
      return {
        playerId: player.id,
        percentage,
        amount: calculateDividend(distributableRevenue, percentage),
      };
    })
    .filter((entry) => entry.percentage > 0);

  const treasuryPercentage = Math.max(0, toSafeNumber(company?.treasuryStockPercentage));
  const treasuryAmount = calculateDividend(distributableRevenue, treasuryPercentage);

  const bankPoolPercentage = Math.max(0, toSafeNumber(company?.bankPoolPercentage));
  const bankPoolAmount = calculateDividend(distributableRevenue, bankPoolPercentage);
  const marketAmount = normalizedRecipient === 'market' ? bankPoolAmount : 0;
  const companyAmount =
    normalizedCompanyIncome +
    retainedRevenue +
    treasuryAmount +
    (normalizedRecipient === 'company' ? bankPoolAmount : 0);

  return {
    mode: normalizedMode,
    totalRevenue: normalizedRevenue,
    companyIncome: normalizedCompanyIncome,
    distributableRevenue,
    retainedRevenue,
    playerPayouts,
    treasury: {
      percentage: treasuryPercentage,
      amount: treasuryAmount,
    },
    bankPool: {
      percentage: bankPoolPercentage,
      amount: bankPoolAmount,
      recipient: normalizedRecipient,
    },
    marketAmount,
    companyAmount,
  };
};
