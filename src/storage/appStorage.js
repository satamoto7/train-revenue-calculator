import {
  getDefaultCompanyColor,
  getDefaultCompanySymbol,
  getDefaultPlayerColor,
  getDefaultPlayerSymbol,
  getSeatLabel,
} from '../lib/labels';

export const APP_STORAGE_KEY = 'trainRevenue_18xx_data';
export const APP_SCHEMA_VERSION = 2;

const DEFAULT_STATE = {
  players: [],
  companies: [],
  selectedCompanyId: null,
  numORs: 2,
};

const createFallbackId = (prefix, index) => {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `${prefix}-${index + 1}`;
};

const normalizePlayer = (player, index) => {
  const seatLabel = player?.seatLabel || getSeatLabel(index);
  const displayName =
    player?.displayName || player?.name || (seatLabel ? `Player ${seatLabel}` : 'Player');

  return {
    ...player,
    id: player?.id || createFallbackId('player', index),
    seatLabel,
    displayName,
    name: player?.name || displayName,
    color: player?.color || getDefaultPlayerColor(index),
    symbol: player?.symbol || getDefaultPlayerSymbol(index),
  };
};

const inferGenericIndex = (company, index) => {
  if (Number.isInteger(company?.genericIndex)) return company.genericIndex;
  const match = company?.name?.match(/^Co(\d+)$/i);
  if (match) return Number(match[1]);
  return index + 1;
};

const normalizeCompany = (company, index) => {
  const genericIndex = inferGenericIndex(company, index);
  return {
    ...company,
    id: company?.id || createFallbackId('company', index),
    name: company?.name || `Co${genericIndex}`,
    genericIndex,
    color: company?.color || getDefaultCompanyColor(index),
    symbol: company?.symbol || getDefaultCompanySymbol(index),
    abbr: company?.abbr || '',
    templateId: company?.templateId ?? null,
    icon: company?.icon ?? null,
    treasuryStockPercentage: Number.isFinite(company?.treasuryStockPercentage)
      ? company.treasuryStockPercentage
      : 0,
    trains: Array.isArray(company?.trains) ? company.trains : [],
    stockHoldings: Array.isArray(company?.stockHoldings) ? company.stockHoldings : [],
    orRevenues: Array.isArray(company?.orRevenues) ? company.orRevenues : [],
  };
};

export function migrate(saved) {
  if (!saved || typeof saved !== 'object') {
    return { ...DEFAULT_STATE };
  }

  const numORs = Number.isInteger(saved.numORs) && saved.numORs > 0 ? saved.numORs : 2;

  const next = {
    ...DEFAULT_STATE,
    players: Array.isArray(saved.players)
      ? saved.players.map((player, index) => normalizePlayer(player, index))
      : [],
    companies: Array.isArray(saved.companies)
      ? saved.companies.map((company, index) => normalizeCompany(company, index))
      : [],
    selectedCompanyId: saved.selectedCompanyId ?? null,
    numORs,
  };

  return next;
}

export function load() {
  const raw = localStorage.getItem(APP_STORAGE_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  return migrate(parsed);
}

export function save(state) {
  const payload = {
    schemaVersion: APP_SCHEMA_VERSION,
    players: state.players || [],
    companies: state.companies || [],
    selectedCompanyId: state.selectedCompanyId ?? null,
    numORs: state.numORs || 2,
    lastUpdated: new Date().toISOString(),
  };

  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(payload));
}
