# 全面リニューアル実装方針

## 現行方針

- 本線アプリを唯一の正式入口にする。
- `minimal/` は試作入口として扱い、本線の設定体験へ統合したうえで削除する。
- 保存 state は schema v8 を正式形式にする。
- 旧 schema の localStorage cache / Supabase state は自動移行しない。
- Supabase のテーブル、RLS、RPC は現状維持し、`state` JSON の中身だけを新形式にする。

## 画面構成

- ロビー: 共同ゲームの作成と参加。
- 設定: プレイヤー、企業テンプレート、OR数、IPO株、市場株配当先、Merger Round の設定。
- ボード: 現在サイクルの SR / OR / Merger Round を `session.mode` に従って表示。
- 履歴: 確定済みサイクルの確認専用。

## 実装ルール

- reducer は純粋関数のまま維持する。
- `Date`、`Math.random`、`crypto.randomUUID`、storage、Supabase は reducer に入れない。
- `App.jsx` は描画と view 配線を主責務にし、業務ハンドラは `useGameActions` へ集約する。
- ワークスペース初期表示と gameId 変更時の遷移は `useWorkspaceNavigation` に集約する。

## 品質ゲート

- `npm run lint`
- `npm test`
- `npm run build`

UI 変更後は Playwright で desktop / tablet / mobile の主要導線を確認する。
