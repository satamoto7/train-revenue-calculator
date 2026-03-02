import React, { useEffect, useState } from 'react';
import Button from './Button';

const SYNC_STATUS_LABEL = {
  idle: '待機中',
  syncing: '同期中',
  synced: '同期済み',
  error: '同期エラー',
};

const SyncStatusBar = ({
  gameId,
  joinCode,
  syncStatus,
  syncError,
  participants,
  shareUrl,
  hasUnsyncedDraft,
  onResendUnsyncedDraft,
  onReloadFromServer,
  onShareRoom,
}) => {
  const [shareStatusMessage, setShareStatusMessage] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setShareStatusMessage('');
  }, [gameId, joinCode, shareUrl]);

  useEffect(() => {
    setIsCollapsed(false);
  }, [gameId]);

  const handleShareRoom = async () => {
    if (!onShareRoom) return;
    try {
      const result = await onShareRoom();
      setShareStatusMessage(result?.message || '');
    } catch (_error) {
      setShareStatusMessage('共有に失敗しました。手動でURLと参加コードを共有してください。');
    }
  };

  if (isCollapsed) {
    return (
      <section className="mb-6 rounded-xl border border-brand-accent/15 bg-[linear-gradient(135deg,_rgba(16,32,51,0.98),_rgba(27,47,69,0.98))] p-4 shadow-ui-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-brand-accent/25 bg-brand-accent/10 px-3 py-1 text-xs font-medium text-brand-accent">
              共同プレイ情報
            </span>
            <span className="text-slate-300">
              同期状態:
              <span
                className={`ml-1 font-semibold ${
                  syncStatus === 'error'
                    ? 'text-red-300'
                    : syncStatus === 'syncing'
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                }`}
              >
                {SYNC_STATUS_LABEL[syncStatus] || syncStatus}
              </span>
            </span>
            <span className="text-slate-300">参加者 {participants?.length || 0}名</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleShareRoom}>
              この部屋を共有
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-slate-200 hover:text-white"
              onClick={() => setIsCollapsed(false)}
            >
              詳細を表示
            </Button>
          </div>
        </div>
        {shareStatusMessage && <p className="mt-3 text-sm text-slate-300">{shareStatusMessage}</p>}
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated p-6 shadow-ui">
      <div className="mb-5 flex flex-col gap-4 border-b border-border-subtle pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-accent">
            Shared Table
          </p>
          <h2 className="mt-2 text-lg font-semibold text-brand-primary">共同プレイ情報</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={handleShareRoom}>
            この部屋を共有
          </Button>
          <Button type="button" variant="secondary" onClick={onReloadFromServer}>
            サーバー再読込
          </Button>
          <Button type="button" variant="ghost" onClick={() => setIsCollapsed(true)}>
            閉じる
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">ゲームID</p>
            <p className="mt-2 break-all font-mono text-sm text-text-primary">{gameId || '-'}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              参加コード
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{joinCode || '-'}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-muted p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">同期状態</p>
            <p
              className={`mt-2 text-sm font-semibold ${
                syncStatus === 'error'
                  ? 'text-status-danger'
                  : syncStatus === 'syncing'
                    ? 'text-status-warning'
                    : 'text-status-success'
              }`}
            >
              {SYNC_STATUS_LABEL[syncStatus] || syncStatus}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-brand-accent/15 bg-brand-accent-soft/60 p-4 lg:max-w-sm">
          <p className="text-sm font-medium text-brand-primary">共有のヒント</p>
          <p className="mt-2 text-sm text-text-secondary">
            ゲーム開始後はこの欄を閉じて、必要なときだけ共有や再読込を使えます。
          </p>
        </div>
      </div>

      {syncError && <p className="ui-note-danger mt-4">{syncError}</p>}

      {hasUnsyncedDraft && (
        <div className="ui-note-warning mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">
            未同期下書きがあります。必要なら手動でサーバーへ再送してください。
          </p>
          <Button type="button" variant="secondary" onClick={onResendUnsyncedDraft}>
            下書きを再送
          </Button>
        </div>
      )}

      <div className="mt-5 border-t border-border-subtle pt-5">
        {shareStatusMessage && (
          <p className="mb-3 text-sm text-text-secondary">{shareStatusMessage}</p>
        )}
        <p className="mb-3 text-sm font-medium text-text-secondary">参加者</p>
        <ul className="flex flex-wrap gap-2">
          {(participants || []).map((participant) => (
            <li key={participant.userId} className="ui-chip text-text-primary">
              <span>{participant.nickname || 'Guest'}</span>
            </li>
          ))}
          {(participants || []).length === 0 && (
            <li className="text-xs text-text-muted">参加者情報を取得中です。</li>
          )}
        </ul>
      </div>
    </section>
  );
};

export default SyncStatusBar;
