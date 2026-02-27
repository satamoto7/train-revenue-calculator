import React, { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SectionHeader from '../../components/ui/SectionHeader';

const LobbyView = ({
  prefilledGameId,
  onPrefilledGameIdChange,
  onCreateGame,
  onJoinGame,
  isBusy,
  error,
  createdGame,
}) => {
  const normalizedPrefilledGameId = (prefilledGameId || '').trim();
  const [nickname, setNickname] = useState('');
  const [joinGameId, setJoinGameId] = useState(normalizedPrefilledGameId);
  const [joinCode, setJoinCode] = useState('');
  const [isManualGameIdVisible, setIsManualGameIdVisible] = useState(!normalizedPrefilledGameId);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (isManualGameIdVisible) return;
    setJoinGameId((prefilledGameId || '').trim());
  }, [isManualGameIdVisible, prefilledGameId]);

  useEffect(() => {
    setCopyStatus('');
  }, [createdGame]);

  const resolvedGameId = joinGameId.trim() || normalizedPrefilledGameId;
  const canJoinGame = Boolean(resolvedGameId && joinCode.trim());

  const clearDraftGameId = () => {
    setJoinGameId(normalizedPrefilledGameId);
    onPrefilledGameIdChange(normalizedPrefilledGameId);
  };

  const handleToggleManualGameId = () => {
    setIsManualGameIdVisible((prev) => {
      const next = !prev;
      if (!next) {
        clearDraftGameId();
      }
      return next;
    });
  };

  const handleCopy = async (text, label) => {
    if (!text) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyStatus('コピー機能が利用できません。手動でコピーしてください。');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label}をコピーしました。`);
    } catch (_error) {
      setCopyStatus('コピーに失敗しました。手動でコピーしてください。');
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <SectionHeader size="page" className="mb-6 text-center text-brand-primary">
        共同ゲームロビー
      </SectionHeader>

      <p className="mb-6 rounded-md border border-border-subtle bg-surface-elevated p-3 text-sm text-text-secondary">
        匿名ログイン済みです。ニックネームを入力してゲームを作成または参加してください。
      </p>

      {error && (
        <p className="mb-4 rounded-md border border-status-danger bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
          {error}
        </p>
      )}

      <section className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-md sm:p-6">
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          参加情報
        </SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-text-secondary" htmlFor="nickname">
            ニックネーム
            <Input
              id="nickname"
              type="text"
              value={nickname}
              placeholder="例: Player A"
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1"
              aria-label="ニックネーム"
            />
          </label>
          <div className="text-sm text-text-secondary">
            <p className="mb-1">URLのゲームID</p>
            {normalizedPrefilledGameId ? (
              <p className="rounded-md border border-border-subtle bg-surface-muted px-3 py-2 font-mono text-xs text-text-primary break-all">
                {normalizedPrefilledGameId}
              </p>
            ) : (
              <p className="rounded-md border border-border-subtle bg-surface-muted px-3 py-2 text-xs text-text-secondary">
                URLにゲームIDが含まれていません。
              </p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleToggleManualGameId}
            className="w-full sm:w-auto"
          >
            {isManualGameIdVisible ? 'ゲームID入力欄を閉じる' : 'ゲームIDを手入力する'}
          </Button>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-md sm:p-6">
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          新規作成
        </SectionHeader>
        <Button
          type="button"
          disabled={isBusy}
          onClick={() => onCreateGame({ nickname })}
          className="w-full sm:w-auto"
        >
          ゲームを新規作成
        </Button>
      </section>

      <section className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-md sm:p-6">
        <SectionHeader size="section" as="h3" className="mb-4 text-brand-primary">
          既存ゲームに参加
        </SectionHeader>
        {isManualGameIdVisible && (
          <label className="mb-4 block text-sm text-text-secondary" htmlFor="join-game-id">
            ゲームID
            <Input
              id="join-game-id"
              type="text"
              value={joinGameId}
              onChange={(e) => {
                setJoinGameId(e.target.value);
                onPrefilledGameIdChange(e.target.value);
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1"
              aria-label="参加用ゲームID"
            />
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-text-secondary" htmlFor="join-code">
            参加コード（6桁）
            <Input
              id="join-code"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="mt-1"
              aria-label="参加コード"
            />
          </label>
        </div>
        <div className="mt-4">
          <Button
            type="button"
            disabled={isBusy || !canJoinGame}
            onClick={() =>
              onJoinGame({
                gameId: resolvedGameId,
                joinCode: joinCode.trim(),
                nickname,
              })
            }
            className="w-full sm:w-auto"
          >
            参加する
          </Button>
        </div>
      </section>

      {createdGame && (
        <section className="rounded-xl border border-status-success/60 bg-status-success/10 p-4 shadow-md sm:p-6">
          <SectionHeader size="section" as="h3" className="mb-3 text-brand-primary">
            作成完了
          </SectionHeader>
          <p className="text-sm text-text-secondary break-all">ゲームID: {createdGame.gameId}</p>
          <p className="text-sm text-text-secondary">参加コード: {createdGame.joinCode}</p>
          <p className="text-sm text-text-secondary break-all">招待URL: {createdGame.shareUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleCopy(createdGame.shareUrl, '招待URL')}
            >
              招待URLをコピー
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleCopy(createdGame.joinCode, '参加コード')}
            >
              参加コードをコピー
            </Button>
          </div>
          {copyStatus && <p className="mt-2 text-xs text-text-secondary">{copyStatus}</p>}
        </section>
      )}
    </div>
  );
};

export default LobbyView;
