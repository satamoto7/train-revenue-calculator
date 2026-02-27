import localStorageAdapter from './localStorageAdapter';

export const APP_STATE_SESSION_ID = 'default';

export const appStorageAdapter = localStorageAdapter;

export const loadAppState = (sessionId = APP_STATE_SESSION_ID) => appStorageAdapter.load(sessionId);

export const saveAppState = (state, sessionId = APP_STATE_SESSION_ID) =>
  appStorageAdapter.save(sessionId, state);

export const subscribeAppState = (onChange, sessionId = APP_STATE_SESSION_ID) =>
  appStorageAdapter.subscribe(sessionId, onChange);
