# Train Revenue Calculator

18xx 向けの収益計算補助アプリです。React + Vite + Tailwind CSS で構築されています。

## Scripts

- `npm run dev` / `npm start`: 開発サーバーを起動（デフォルト: http://localhost:5173）
- `npm run build`: 本番ビルドを `dist/` に生成
- `npm run preview`: 本番ビルドをローカルで確認
- `npm test`: テストを1回実行（Vitest）
- `npm run test:watch`: テストをウォッチ実行
- `npm run lint`: ESLint 実行
- `npm run format:check`: Prettier チェック

## GitHub Pages デプロイ

このリポジトリは GitHub Actions で GitHub Pages へデプロイします。

- ワークフロー: `.github/workflows/deploy-pages.yml`
- 実行内容: `npm ci` → `npm run build` → `upload-pages-artifact` → `deploy-pages`
- 公開パス: `vite.config.js` の `base: '/train-revenue-calculator/'`

リポジトリ設定で **Settings > Pages > Source** を **GitHub Actions** にしてください。
