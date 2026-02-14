const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateTrainRevenue = (stops = []) => (
  stops.reduce((sum, stop) => sum + toSafeNumber(stop), 0)
);

export const calculateCompanyTrainRevenue = (trains = []) => (
  trains.reduce((sum, train) => sum + calculateTrainRevenue(train?.stops || []), 0)
);

export const calculateCompanyTotalORRevenue = (orRevenues = [], numORs = Infinity) => (
  orRevenues
    .slice(0, numORs)
    .reduce((sum, orEntry) => sum + toSafeNumber(orEntry?.revenue), 0)
);

export const calculateDividend = (totalRevenue = 0, percentage = 0) => (
  Math.floor(toSafeNumber(totalRevenue) * (toSafeNumber(percentage) / 100))
);
