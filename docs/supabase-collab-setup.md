# Supabase 共同編集セットアップ

## 1. Supabase プロジェクト準備

1. Supabase で新規プロジェクトを作成する
2. `Authentication > Providers` で `Anonymous Sign-Ins` を有効化する
3. `SQL Editor` で `supabase/migrations/20260227_collab_init.sql` を実行する

## 2. Realtime / RLS 確認

1. `Database > Replication` で `game_states` と `game_members` が publication `supabase_realtime` に含まれていることを確認
2. `Table Editor` で `games / game_members / game_states` の RLS が有効になっていることを確認
3. SQL で匿名ユーザーが直接読めないことを確認（`join_game` / `create_game` 経由でのみ参加可能）

## 3. フロント環境変数

`.env.local` を作成して以下を設定する:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## 4. ローカル実行

```bash
npm ci
npm run dev
```

ブラウザで以下を確認する:

1. ロビー画面が表示される
2. 新規作成で `ゲームID` と `参加コード` が表示される
3. 別ブラウザで同じ `gameId + joinCode` で参加できる
4. 片方の入力がもう片方にリアルタイム反映される
5. 同期エラー時に `未同期下書き` バナーが表示され、`下書きを再送` できる

## 5. GitHub Pages デプロイ時

GitHub リポジトリの `Settings > Secrets and variables > Actions` に以下を登録する:

1. `VITE_SUPABASE_URL`
2. `VITE_SUPABASE_ANON_KEY`

ビルド時に環境変数が未設定だと、アプリは `起動エラー` を表示する。

## 6. 今後の実装予定メモ（データ保持）

- 現在は `games / game_members / game_states` を期限なしで保持する（自動削除なし）
- 今後、運用状況を見て「一定期間未更新ゲームのアーカイブ/削除」を実装する
- 目安案: `last_seen_at` または `game_states.updated_at` が 90 日以上更新されないゲームを対象にする
- Free/Pro のクォータ監視を行い、必要時に保持ポリシーを有効化する
