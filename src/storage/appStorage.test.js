import {
  APP_SCHEMA_VERSION,
  LEGACY_APP_STORAGE_KEY,
  clear,
  getGameStorageKey,
  load,
  save,
} from './appStorage';
import { createBaseState } from '../state/appState';

describe('appStorage (collab cache)', () => {
  const gameId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    localStorage.clear();
  });

  test('save/load は gameId 単位で新しい state を保存・取得する', () => {
    const state = {
      ...createBaseState(),
      gameConfig: {
        ...createBaseState().gameConfig,
        players: [{ id: 'p1', name: 'Player A', displayName: 'Player A' }],
      },
    };

    save(gameId, state);
    const loaded = load(gameId);

    expect(loaded.gameConfig.players).toHaveLength(1);
    expect(loaded.session.mode).toBe('stockRound');
  });

  test('HEX 会社色を含むテンプレート企業も保存・取得できる', () => {
    const state = {
      ...createBaseState(),
      gameConfig: {
        ...createBaseState().gameConfig,
        companies: [
          {
            id: 'c1',
            name: 'Pennsylvania Railroad',
            displayName: 'PRR',
            color: '#32763F',
            symbol: '○',
          },
        ],
      },
    };

    save(gameId, state);
    const loaded = load(gameId);

    expect(loaded.gameConfig.companies[0].color).toBe('#32763f');
  });

  test('schemaVersion 不一致は null を返す', () => {
    localStorage.setItem(
      getGameStorageKey(gameId),
      JSON.stringify({
        schemaVersion: APP_SCHEMA_VERSION - 1,
        state: createBaseState(),
      })
    );

    expect(load(gameId)).toBeNull();
  });

  test('legacy key は読み込まない', () => {
    localStorage.setItem(
      LEGACY_APP_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 4,
        players: [{ id: 'legacy-player' }],
      })
    );

    expect(load(gameId)).toBeNull();
  });

  test('clear は対象ゲームキャッシュを削除する', () => {
    save(gameId, createBaseState());

    clear(gameId);
    expect(load(gameId)).toBeNull();
  });
});
