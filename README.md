# Train Revenue Calculator

18xx 向けの収益計算補助アプリです。React + Vite + Tailwind CSS で構築されています。  
Supabase 匿名認証 + Realtime による共同編集（同一ゲームの同時アクセス）に対応しています。

## Scripts

- `npm run dev` / `npm start`: 開発サーバーを起動（デフォルト: http://localhost:5173）
- `npm run build`: 本番ビルドを `dist/` に生成
- `npm run preview`: 本番ビルドをローカルで確認
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

## GitHub Pages デプロイ

このリポジトリは GitHub Actions で GitHub Pages へデプロイします。

- ワークフロー: `.github/workflows/deploy-pages.yml`
- 実行内容: `npm ci` → `npm run build` → `upload-pages-artifact` → `deploy-pages`
- 公開パス: `vite.config.js` の `base: '/train-revenue-calculator/'`

リポジトリ設定で **Settings > Pages > Source** を **GitHub Actions** にしてください。
