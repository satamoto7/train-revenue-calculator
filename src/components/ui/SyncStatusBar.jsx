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

  useEffect(() => {
    setShareStatusMessage('');
  }, [gameId, joinCode, shareUrl]);

  const handleShareRoom = async () => {
    if (!onShareRoom) return;
    try {
      const result = await onShareRoom();
      setShareStatusMessage(result?.message || '');
    } catch (_error) {
      setShareStatusMessage('共有に失敗しました。手動でURLと参加コードを共有してください。');
    }
  };

  return (
    <section className="mx-auto mb-6 max-w-6xl rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-md">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">
          ゲームID: <span className="font-mono text-xs text-text-primary">{gameId}</span>
        </p>
        {joinCode && (
          <p className="text-sm text-text-secondary">
            参加コード: <span className="font-semibold text-text-primary">{joinCode}</span>
          </p>
        )}
        <p className="text-sm text-text-secondary">
          同期状態:{' '}
          <span
            className={`font-semibold ${
              syncStatus === 'error'
                ? 'text-status-danger'
                : syncStatus === 'syncing'
                  ? 'text-status-warning'
                  : 'text-status-success'
            }`}
          >
            {SYNC_STATUS_LABEL[syncStatus] || syncStatus}
          </span>
        </p>
      </div>

      {syncError && (
        <p className="mb-3 rounded-md border border-status-danger/60 bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
          {syncError}
        </p>
      )}

      {hasUnsyncedDraft && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-status-warning/70 bg-status-warning/10 px-3 py-2">
          <p className="text-sm text-text-secondary">
            未同期下書きがあります。必要なら手動でサーバーへ再送してください。
          </p>
          <Button type="button" variant="secondary" onClick={onResendUnsyncedDraft}>
            下書きを再送
          </Button>
        </div>
      )}

      <div>
        <div className="mb-2 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleShareRoom}>
            この部屋を共有
          </Button>
          <Button type="button" variant="secondary" onClick={onReloadFromServer}>
            サーバー再読込
          </Button>
        </div>
        {shareStatusMessage && (
          <p className="mb-2 text-sm text-text-secondary">{shareStatusMessage}</p>
        )}
        <p className="mb-2 text-sm font-medium text-text-secondary">参加者</p>
        <ul className="flex flex-wrap gap-2">
          {(participants || []).map((participant) => (
            <li
              key={participant.userId}
              className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-muted px-3 py-1 text-xs text-text-primary"
            >
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
