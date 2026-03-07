export const QUICK_STOP_VALUES = [10, 20, 30, 40, 50, 60];
export const QUICK_REVENUE_ADJUSTMENTS = [-20, -10, 10, 20];

export const DIVIDEND_PATTERNS = [
  {
    key: 'full',
    label: '配当',
    summary: '収益をすべて配当原資にする',
  },
  {
    key: 'withhold',
    label: '無配',
    summary: '収益をすべて会社が受け取る',
  },
  {
    key: 'half',
    label: '半配当',
    summary: '収益を配当分と会社受取分に分ける',
  },
];

export const getEntryRevenue = (company, orNum) => {
  const entry = (company.orRevenues || []).find((orEntry) => orEntry.orNum === orNum);
  return entry?.revenue ?? 0;
};

export const getEntryDividendMode = (company, orNum) => {
  const entry = (company.orDividendModes || []).find((modeEntry) => modeEntry.orNum === orNum);
  if (entry?.mode === 'withhold' || entry?.mode === 'half') return entry.mode;
  return 'full';
};

export const getDividendLabel = (mode) =>
  DIVIDEND_PATTERNS.find((pattern) => pattern.key === mode)?.label || '配当';
