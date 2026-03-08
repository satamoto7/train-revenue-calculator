const PLAYER_COLORS = ['赤', '青', '緑', '黄', '紫', '橙'];
const PLAYER_SYMBOLS = ['●', '▲', '■', '◆', '★', '✚'];
const COMPANY_COLORS = ['赤', '青', '緑', '黄', '黒', '白', '橙', '紫', '桃', '茶', '空', '灰'];
const COMPANY_SYMBOLS = ['○', '△', '◇', '□', '☆', '◯', '◈', '⬟', '⬢', '⬣', '✦', '✧'];
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const COLOR_STYLE_MAP = {
  赤: 'bg-red-100 text-red-800 border-red-300',
  青: 'bg-blue-100 text-blue-800 border-blue-300',
  緑: 'bg-green-100 text-green-800 border-green-300',
  黄: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  紫: 'bg-purple-100 text-purple-800 border-purple-300',
  橙: 'bg-orange-100 text-orange-800 border-orange-300',
  黒: 'bg-slate-900 text-white border-slate-700',
  白: 'bg-white text-slate-700 border-slate-300',
  桃: 'bg-pink-100 text-pink-800 border-pink-300',
  茶: 'bg-amber-100 text-amber-900 border-amber-400',
  空: 'bg-sky-100 text-sky-800 border-sky-300',
  灰: 'bg-gray-200 text-gray-800 border-gray-400',
  無色: 'bg-slate-100 text-slate-600 border-slate-300',
};

const COLOR_TEXT_MAP = {
  赤: 'text-red-600',
  青: 'text-blue-600',
  緑: 'text-green-600',
  黄: 'text-yellow-600',
  紫: 'text-purple-600',
  橙: 'text-orange-600',
  黒: 'text-slate-900',
  白: 'text-slate-500',
  桃: 'text-pink-600',
  茶: 'text-amber-700',
  空: 'text-sky-600',
  灰: 'text-gray-600',
  無色: 'text-slate-500',
};

const COMPANY_ACCENT_EDGE_MAP = {
  赤: 'border-l-red-500',
  青: 'border-l-blue-500',
  緑: 'border-l-green-500',
  黄: 'border-l-yellow-400',
  紫: 'border-l-purple-500',
  橙: 'border-l-orange-500',
  黒: 'border-l-slate-900',
  白: 'border-l-slate-400',
  桃: 'border-l-pink-500',
  茶: 'border-l-amber-600',
  空: 'border-l-sky-500',
  灰: 'border-l-gray-500',
  無色: 'border-l-slate-300',
};

const PLAYER_ACCENT_EDGE_MAP = {
  赤: 'border-l-rose-300',
  青: 'border-l-sky-300',
  緑: 'border-l-emerald-300',
  黄: 'border-l-amber-300',
  紫: 'border-l-fuchsia-300',
  橙: 'border-l-orange-300',
  黒: 'border-l-slate-500',
  白: 'border-l-slate-200',
  桃: 'border-l-pink-300',
  茶: 'border-l-amber-300',
  空: 'border-l-sky-300',
  灰: 'border-l-gray-300',
  無色: 'border-l-slate-200',
};

export const PLAYER_SYMBOL_OPTIONS = PLAYER_SYMBOLS;
export const COMPANY_SYMBOL_OPTIONS = COMPANY_SYMBOLS;
export const PLAYER_COLOR_OPTIONS = PLAYER_COLORS;
export const COMPANY_COLOR_OPTIONS = COMPANY_COLORS;

export const normalizeHexColor = (color) => {
  if (typeof color !== 'string') return null;
  const trimmed = color.trim();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
};

const hexToRgba = (color, alpha) => {
  const normalized = normalizeHexColor(color);
  if (!normalized) return null;

  const hex =
    normalized.length === 4
      ? normalized
          .slice(1)
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const isLightHexColor = (color) => {
  const normalized = normalizeHexColor(color);
  if (!normalized) return false;

  const hex =
    normalized.length === 4
      ? normalized
          .slice(1)
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance >= 0.7;
};

export const getSeatLabel = (index) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < alphabet.length) return alphabet[index];
  return `P${index + 1}`;
};

export const getDefaultPlayerColor = (index) => PLAYER_COLORS[index % PLAYER_COLORS.length];
export const getDefaultPlayerSymbol = (index) => PLAYER_SYMBOLS[index % PLAYER_SYMBOLS.length];
export const getDefaultCompanyColor = (index) => COMPANY_COLORS[index % COMPANY_COLORS.length];
export const getDefaultCompanySymbol = (index) => COMPANY_SYMBOLS[index % COMPANY_SYMBOLS.length];

export const isKnownPlayerColor = (color) => PLAYER_COLORS.includes(color);
export const isKnownCompanyColor = (color) =>
  COMPANY_COLORS.includes(color) || Boolean(normalizeHexColor(color));

export const getColorStyleClass = (color) => COLOR_STYLE_MAP[color] || COLOR_STYLE_MAP.無色;
export const getColorTextClass = (color) => COLOR_TEXT_MAP[color] || COLOR_TEXT_MAP.無色;
export const getColorTextStyle = (color) => {
  const normalized = normalizeHexColor(color);
  if (!normalized) return undefined;

  return {
    color: normalized,
    ...(isLightHexColor(normalized)
      ? {
          textShadow: '0 0 0.4px rgba(15, 23, 42, 0.9), 0 0 0.8px rgba(15, 23, 42, 0.65)',
        }
      : {}),
  };
};
export const getCompanyAccentEdgeClass = (color) =>
  COMPANY_ACCENT_EDGE_MAP[color] || COMPANY_ACCENT_EDGE_MAP.無色;
export const getCompanyAccentEdgeStyle = (color) => {
  const normalized = normalizeHexColor(color);
  return normalized ? { borderLeftColor: normalized } : undefined;
};
export const getMarkerHighlightStyle = (color) => {
  const normalized = normalizeHexColor(color);
  if (!normalized) return undefined;

  const markerFill = hexToRgba(normalized, 0.34);
  const markerEdge = hexToRgba(normalized, 0.16);

  return {
    backgroundImage: `linear-gradient(transparent 28%, ${markerFill} 28%, ${markerFill} 80%, transparent 80%)`,
    boxShadow: `inset 0 -0.1em 0 ${markerEdge}`,
    ...getColorTextStyle(normalized),
  };
};
export const getPlayerAccentEdgeClass = (color) =>
  PLAYER_ACCENT_EDGE_MAP[color] || PLAYER_ACCENT_EDGE_MAP.無色;

export const getCompanyColorOptions = (currentColor) => {
  const normalized = normalizeHexColor(currentColor);
  const presetOptions = COMPANY_COLORS.map((color) => ({
    value: color,
    label: color,
    disabled: false,
  }));

  if (!normalized || COMPANY_COLORS.includes(currentColor)) {
    return presetOptions;
  }

  return [
    {
      value: normalized,
      label: 'テンプレート色 (保持のみ)',
      disabled: true,
    },
    ...presetOptions,
  ];
};

export const getPlayerDisplayName = (player) =>
  player?.displayName ||
  player?.name ||
  (player?.seatLabel ? `Player ${player.seatLabel}` : 'Player');

export const getPlayerSymbol = (player) => player?.symbol || '●';
export const getPlayerColor = (player) => player?.color || '無色';

export const getPlayerShortLabel = (player) => player?.seatLabel || 'P';

export const getCompanyDisplayName = (company) => {
  if (company?.displayName && company.displayName.trim()) return company.displayName.trim();
  if (company?.abbr && company.abbr.trim()) return company.abbr.trim();
  if (company?.name && company.name.trim()) return company.name.trim();
  if (Number.isInteger(company?.genericIndex)) return `Co${company.genericIndex}`;
  return 'Company';
};

export const getCompanySymbol = (company) => company?.symbol || '○';
export const getCompanyColor = (company) =>
  normalizeHexColor(company?.color) || company?.color || '無色';

export const getCompanyBadge = (company) => {
  const symbol = getCompanySymbol(company);
  const color = getCompanyColor(company);
  return `${symbol}${color}`;
};
