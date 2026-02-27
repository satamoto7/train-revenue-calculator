import { APP_SCHEMA_VERSION, APP_STORAGE_KEY, migrate, serialize } from './appStorage';

const isStorageEventForKey = (event) =>
  event?.storageArea === localStorage && event?.key === APP_STORAGE_KEY;

const createLocalStorageAdapter = () => ({
  load(sessionId) {
    void sessionId;
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== APP_SCHEMA_VERSION) return null;
    return migrate(parsed);
  },

  save(sessionId, state) {
    void sessionId;
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(serialize(state)));
  },

  subscribe(sessionId, onChange) {
    void sessionId;
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handleStorage = (event) => {
      if (!isStorageEventForKey(event)) return;
      onChange();
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  },
});

export const localStorageAdapter = createLocalStorageAdapter();

export default localStorageAdapter;
