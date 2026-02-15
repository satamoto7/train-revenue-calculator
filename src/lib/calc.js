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
