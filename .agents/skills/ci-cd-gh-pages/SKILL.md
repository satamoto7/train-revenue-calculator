---
name: ci-cd-gh-pages
description: GitHub Actions で lint → test → build → Pages デプロイ（node 固定、npm ci、cache、concurrency）
---

# ci-cd-gh-pages

## 目的

- CI パイプラインに lint・test を追加し、品質ゲートを設ける
- main push で自動デプロイ、lint/test 失敗時はデプロイしない

## 背景

→ 詳細: `docs/tech-stack-best-practices.md` § 9. GitHub Actions / CI・CD

現在のワークフロー: `.github/workflows/deploy-pages.yml`

```yaml
# 現在の順序
1. npm ci
2. npm run build   ← lint・test がない
3. デプロイ
```

## 手順

### 1. 現在のワークフローのバックアップ確認

```bash
cat .github/workflows/deploy-pages.yml
```

### 2. lint → test → build の順に変更

`.github/workflows/deploy-pages.yml` のビルドジョブに以下を追加する:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22 # package.json の engines に合わせる
          cache: npm # npm キャッシュを有効化

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint # ← 追加

      - name: Test
        run: npm test # ← 追加（= vitest run）

      - name: Build
        run: npm run build # lint・test が通った場合のみ実行

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
```

### 3. 既存の concurrency 設定の確認

```yaml
concurrency:
  group: pages
  cancel-in-progress: true
```

複数の push が短時間で発生した場合、古いデプロイをキャンセルして最新のみ実行する（既に設定済み）。

### 4. permissions の確認

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

Pages デプロイに必要な権限（既に設定済み）。

### 5. 変更後の動作確認

```bash
# ローカルでの事前確認
npm run lint    # エラーがないことを確認
npm test        # 全24件が通ることを確認
npm run build   # ビルドが成功することを確認
```

変更をコミット・push して GitHub Actions のログを確認する:

- `Actions` タブ → 最新のワークフローラン → 各ステップのログ
- lint/test/build のいずれかが失敗した場合は `deploy` ジョブが実行されないことを確認

### 6. Node.js バージョンの固定確認

`node-version: 22` がローカル環境と一致していることを確認:

```bash
node --version  # v22.x.x であることを確認
```

不一致の場合は `.nvmrc` を作成して明示する:

```
22
```

## 完了条件

- [ ] `.github/workflows/deploy-pages.yml` に lint・test ステップが追加されている
- [ ] lint 失敗時に build・deploy が実行されない
- [ ] test 失敗時に build・deploy が実行されない
- [ ] main push 後に GitHub Pages が正常に更新される

## 注意

- `npm test` は `vitest run`（= 単発実行）。watch モードではないことを確認
- GitHub Secrets は現在不要（Pages デプロイは GITHUB_TOKEN で完結）
- `cancel-in-progress: true` により、push 連打時は最新のみデプロイされる
