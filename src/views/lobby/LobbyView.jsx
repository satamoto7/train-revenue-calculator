import React, { useState } from 'react';
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
  const [nickname, setNickname] = useState('');
  const [joinGameId, setJoinGameId] = useState(prefilledGameId || '');
  const [joinCode, setJoinCode] = useState('');

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
          <label className="text-sm text-text-secondary" htmlFor="prefilled-game-id">
            URLのゲームID
            <Input
              id="prefilled-game-id"
              type="text"
              value={joinGameId}
              onChange={(e) => {
                setJoinGameId(e.target.value);
                onPrefilledGameIdChange(e.target.value);
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1"
              aria-label="ゲームID"
            />
          </label>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-text-secondary" htmlFor="join-game-id">
            ゲームID
            <Input
              id="join-game-id"
              type="text"
              value={joinGameId}
              onChange={(e) => {
                setJoinGameId(e.target.value);
                onPrefilledGameIdChange(e.target.value);
              }}
              className="mt-1"
              aria-label="参加用ゲームID"
            />
          </label>
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
            disabled={isBusy || !joinGameId || !joinCode}
            onClick={() =>
              onJoinGame({
                gameId: joinGameId.trim(),
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
          <p className="text-sm text-text-secondary">ゲームID: {createdGame.gameId}</p>
          <p className="text-sm text-text-secondary">参加コード: {createdGame.joinCode}</p>
          <p className="text-sm text-text-secondary break-all">招待URL: {createdGame.shareUrl}</p>
        </section>
      )}
    </div>
  );
};

export default LobbyView;
