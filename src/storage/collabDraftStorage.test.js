import {
  clearUnsyncedDraft,
  hasUnsyncedDraft,
  loadUnsyncedDraft,
  saveUnsyncedDraft,
} from './collabDraftStorage';

describe('collabDraftStorage', () => {
  const gameId = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    localStorage.clear();
  });

  test('save/load で未同期下書きを保存・取得できる', () => {
    saveUnsyncedDraft(
      gameId,
      {
        players: [{ id: 'p1', name: 'Player A', displayName: 'Player A' }],
      },
      'save failed'
    );

    const draft = loadUnsyncedDraft(gameId);

    expect(draft.reason).toBe('save failed');
    expect(draft.state.players[0].id).toBe('p1');
    expect(typeof draft.savedAt).toBe('string');
  });

  test('破損JSONは null を返す', () => {
    localStorage.setItem(`unsynced_draft_${gameId}`, '{ invalid');
    expect(loadUnsyncedDraft(gameId)).toBeNull();
  });

  test('clear と hasUnsyncedDraft が機能する', () => {
    saveUnsyncedDraft(gameId, { players: [] });
    expect(hasUnsyncedDraft(gameId)).toBe(true);

    clearUnsyncedDraft(gameId);
    expect(hasUnsyncedDraft(gameId)).toBe(false);
  });
});
