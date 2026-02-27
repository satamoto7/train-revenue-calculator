import React from 'react';
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
  hasUnsyncedDraft,
  onResendUnsyncedDraft,
  onReloadFromServer,
}) => {
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
        <div className="mb-2 flex justify-end">
          <Button type="button" variant="secondary" onClick={onReloadFromServer}>
            サーバー再読込
          </Button>
        </div>
        <p className="mb-2 text-sm font-medium text-text-secondary">参加者</p>
        <ul className="flex flex-wrap gap-2">
          {(participants || []).map((participant) => (
            <li
              key={participant.userId}
              className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-muted px-3 py-1 text-xs text-text-primary"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  participant.online ? 'bg-status-success' : 'bg-status-warning'
                }`}
              />
              <span>{participant.nickname || 'Guest'}</span>
              <span className="text-text-muted">{participant.online ? 'online' : 'offline'}</span>
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
