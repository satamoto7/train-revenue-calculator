---
name: vite-build-config
description: Vite 設定の見直し（server.warmup、base、build.target、manualChunks、開発体験/キャッシュ最適化）
---

# vite-build-config

## 目的

- GitHub Pages へのデプロイが正常に動くよう `base` を確認する
- 開発時の初回起動を高速化する（warmup）
- 本番ビルドのキャッシュ効率を上げる（manualChunks）

## 背景

→ 詳細: `docs/tech-stack-best-practices.md` § 7. Vite ビルド設定

現在の設定: `vite.config.js`（Vite 7.3 + @vitejs/plugin-react）  
デプロイ先: `https://satamoto7.github.io/train-revenue-calculator`  
現在の base: `package.json` の `homepage` フィールドを参照

## 手順

### 1. base の確認

```javascript
// vite.config.js を確認
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/train-revenue-calculator/', // ← repo 名と一致しているか確認
  plugins: [react()],
  // ...
});
```

GitHub Pages の URL `https://satamoto7.github.io/train-revenue-calculator` と一致している必要がある。

デプロイ後にアセット（JS/CSS）が 404 になる場合は `base` の末尾スラッシュを確認する。

### 2. server.warmup の追加（任意）

初回 `npm run dev` 後の最初のページ表示が遅い場合に有効。

```javascript
export default defineConfig({
  base: '/train-revenue-calculator/',
  plugins: [react()],
  server: {
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/views/summary/SummaryView.jsx',
        './src/views/management/ManagementView.jsx',
      ],
    },
  },
  // ...
});
```

### 3. manualChunks の追加（任意）

React vendor チャンクを分離し、アプリコード更新時にブラウザキャッシュを活用する。

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom'],
      },
    },
  },
},
```

before/after を比較するには:

```bash
npm run build
# dist/ のファイルサイズを確認
ls dist/assets/
```

### 4. build.target の確認（任意）

```javascript
build: {
  target: 'es2020', // 対象ブラウザに合わせて調整
},
```

GitHub Pages 向けなら `'modules'`（デフォルト）または `'es2020'` 程度で十分。

### 5. 動作確認

```bash
# ビルドして本番相当の動作を確認
npm run build
npm run preview
# http://localhost:4173/train-revenue-calculator/ でアクセス確認
```

## 完了条件

- [ ] `npm run build` が成功する
- [ ] `npm run preview` でアセット（JS/CSS）が正常にロードされる（404 なし）
- [ ] デプロイ後に GitHub Pages で正常に表示される

## 注意

- `vite.config.js` の `base` と `package.json` の `homepage` の両方を確認する
- `manualChunks` を追加した場合は `npm run build` でチャンク名が変わるのを確認する
- `server.warmup` は開発時のみ有効（build には影響しない）
