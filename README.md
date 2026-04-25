# Train Revenue Calculator

18xx 向けの収益計算補助アプリです。React + Vite + Tailwind CSS で構築されています。  
Supabase 匿名認証 + Realtime による共同編集（同一ゲームの同時アクセス）に対応しています。

## Current App Flow

正式入口は本線アプリのみです。

1. ロビーで共同ゲームを作成または参加
2. 設定でプレイヤー、企業テンプレート、OR数、IPO株、市場株配当先を決定
3. ボードで SR / OR / Merger Round を現在サイクルの作業画面として進行
4. 履歴で確定済みサイクルを確認

保存 state は schema v8 です。旧 schema の localStorage cache / 共同ゲーム state は自動移行せず、新規ゲーム作成へ誘導します。

## Scripts

- `npm run dev` / `npm start`: 開発サーバーを起動（デフォルト: http://localhost:5173）
- `npm run build`: 本番ビルドを `dist/` に生成
- `npm run preview`: 本番ビルドをローカルで確認
- `npm run worktree -- <command>`: Codex と併用する `git worktree` 補助
- `npm test`: テストを1回実行（Vitest）
- `npm run test:watch`: テストをウォッチ実行
- `npm run lint`: ESLint 実行
- `npm run format:check`: Prettier チェック

## Environment Variables

共同編集機能には以下の環境変数が必要です。

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

詳細セットアップ手順は `docs/supabase-collab-setup.md` を参照してください。

## Worktree 運用

Codex と並行で触る前提の `git worktree` 運用は `docs/worktree-codex-workflow.md` を参照してください。`main` を母艦 worktree に固定し、作業は `codex/*` ブランチの個別 worktree に分ける前提です。

## GitHub Pages デプロイ

このリポジトリは GitHub Actions で GitHub Pages へデプロイします。

- ワークフロー: `.github/workflows/deploy-pages.yml`
- 実行内容: `npm ci` → `npm run build` → `upload-pages-artifact` → `deploy-pages`
- 公開パス: `vite.config.js` の `base: '/train-revenue-calculator/'`

リポジトリ設定で **Settings > Pages > Source** を **GitHub Actions** にしてください。
