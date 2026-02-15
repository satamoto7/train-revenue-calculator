const PLAYER_COLORS = ['赤', '青', '緑', '黄', '紫', '橙'];
const PLAYER_SYMBOLS = ['●', '▲', '■', '◆', '★', '✚'];
const COMPANY_COLORS = ['赤', '青', '緑', '黄', '黒', '白', '橙', '紫', '桃', '茶', '空', '灰'];
const COMPANY_SYMBOLS = ['○', '△', '◇', '□', '☆', '◯', '◈', '⬟', '⬢', '⬣', '✦', '✧'];

export const getSeatLabel = (index) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < alphabet.length) return alphabet[index];
  return `P${index + 1}`;
};

export const getDefaultPlayerColor = (index) => PLAYER_COLORS[index % PLAYER_COLORS.length];
export const getDefaultPlayerSymbol = (index) => PLAYER_SYMBOLS[index % PLAYER_SYMBOLS.length];
export const getDefaultCompanyColor = (index) => COMPANY_COLORS[index % COMPANY_COLORS.length];
export const getDefaultCompanySymbol = (index) => COMPANY_SYMBOLS[index % COMPANY_SYMBOLS.length];

export const getPlayerDisplayName = (player) =>
  player?.displayName ||
  player?.name ||
  (player?.seatLabel ? `Player ${player.seatLabel}` : 'Player');

export const getPlayerShortLabel = (player) => player?.seatLabel || 'P';

export const getCompanyDisplayName = (company) => {
  if (company?.abbr && company.abbr.trim()) return company.abbr.trim();
  if (Number.isInteger(company?.genericIndex)) return `Co${company.genericIndex}`;
  if (company?.name && company.name.trim()) return company.name.trim();
  return 'Company';
};

export const getCompanyBadge = (company) => {
  const symbol = company?.symbol || '○';
  const color = company?.color || '無色';
  return `${symbol}${color}`;
};
