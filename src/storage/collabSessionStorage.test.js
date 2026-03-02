import {
  clearCollabSession,
  getCollabSessionKey,
  loadCollabSession,
  saveCollabSession,
} from './collabSessionStorage';

describe('collabSessionStorage', () => {
  const gameId = '00000000-0000-0000-0000-000000000003';

  beforeEach(() => {
    localStorage.clear();
  });

  test('save/load で joinCode を保存・取得できる', () => {
    saveCollabSession(gameId, { joinCode: '123456' });

    const session = loadCollabSession(gameId);

    expect(session.joinCode).toBe('123456');
    expect(typeof session.savedAt).toBe('string');
  });

  test('破損JSONは null を返す', () => {
    localStorage.setItem(getCollabSessionKey(gameId), '{ invalid');
    expect(loadCollabSession(gameId)).toBeNull();
  });

  test('clear で保存済み session を削除する', () => {
    saveCollabSession(gameId, { joinCode: '123456' });
    clearCollabSession(gameId);

    expect(loadCollabSession(gameId)).toBeNull();
  });

  test('空の joinCode は保存しない', () => {
    saveCollabSession(gameId, { joinCode: '   ' });

    expect(loadCollabSession(gameId)).toBeNull();
  });
});
