# AGENTS.md (train-revenue-calculator)

## このリポジトリの目的

18xx 収益計算補助の Web アプリ（Vite + React + Tailwind CSS）。  
GitHub Pages へ自動デプロイ: <https://satamoto7.github.io/train-revenue-calculator>

---

## 開発コマンド

| コマンド               | 内容                                                 |
| ---------------------- | ---------------------------------------------------- |
| `npm ci`               | 依存関係インストール（CI 推奨）                      |
| `npm run dev`          | 開発サーバー起動（localhost:5173）                   |
| `npm start`            | 開発サーバー起動（`npm run dev` の別名）             |
| `npm run build`        | プロダクションビルド（`dist/`）                      |
| `npm run preview`      | ビルド済みアプリをローカル確認                       |
| `npm run lint`         | ESLint チェック（`src/**/*.{js,jsx}`）               |
| `npm run lint:fix`     | ESLint 自動修正                                      |
| `npm run format`       | Prettier 整形（設定ファイル / 主要ドキュメント対象） |
| `npm run format:check` | Prettier チェック                                    |
| `npm run lint-staged`  | lint-staged を手動実行                               |
| `npm test`             | テスト単発実行（= `vitest run`）                     |
| `npm run test:watch`   | テストウォッチ（開発用）                             |

---

## 変更方針（必須）

- **Reducer は純粋関数**。localStorage / Date / Math.random 等の副作用を reducer 内に書かない（React Strict Mode 二重実行が前提）。  
  → 参照: `docs/tech-stack-best-practices.md` § React 18 状態管理
- **永続化は storage 層に閉じる**。localStorage の直叩きを views/hooks に散らさない。  
  → `src/storage/appStorage.js`（key: `trainRevenue_18xx_data`, schemaVersion: 3）
- **UI 一時状態は useState、アプリ状態は useReducer** を基本とする。
- **テストはユーザー視点**で書く（Testing Library の推奨クエリ順: role → label → text → testid）。  
  `userEvent` を使い `fireEvent` は避ける。
- **CI で lint → test → build を通してからデプロイ**する（現在は build → deploy のみ。改善 skill あり）。

---

## コード規約

- UI テキストは日本語、コード識別子は英語
- 拡張子: React コンポーネントは `.jsx`、純粋ロジックは `.js`
- インデント: 2 スペース
- フォーマット: Prettier（シングルクォート、trailing comma es5、100 文字折り返し）
- State の更新: スプレッド演算子 / `map` / `filter`（直接変更禁止）
- ハンドラ名: `handle*` の形式を App に集約し、props 経由で子に渡す
- ID 生成: `crypto.randomUUID()`

---

## 触れて良い / 注意が必要な場所

| パス                 | 内容                            | 注意点                                         |
| -------------------- | ------------------------------- | ---------------------------------------------- |
| `src/lib/`           | ドメインロジック（純粋関数）    | 副作用を入れない                               |
| `src/storage/`       | 永続化層                        | スキーマ変更時は migrate を必ず更新            |
| `src/views/`         | 画面コンポーネント              | 変更時は関連テストも更新                       |
| `src/components/ui/` | 共通 UI コンポーネント          | Button/Card/Input/Modal/SectionHeader          |
| `src/App.jsx`        | ルートコンポーネント（~545 行） | 肥大化に注意。hooks/reducers 外部化 skill 参照 |

---

## テスト

```bash
npm test   # 24 テスト（App.test.jsx 11件 / calc.test.js 10件 / appStorage.test.js 3件）
```

すべて通ることを確認してからコミットすること。

---

## Pre-commit フック

Husky + lint-staged が自動実行:

- `src/**/*.{js,jsx,css}` → `eslint --fix` + `prettier --write`
- `*.{json,md}` → `prettier --write`

---

## デプロイ

`.github/workflows/deploy-pages.yml` が `main` ブランチ push 時、または `workflow_dispatch` で自動実行:

1. `npm ci`
2. `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を注入して `npm run build`
3. `./dist` を Pages artifact として upload
4. GitHub Pages へデプロイ

GitHub Pages / ローカル共同編集確認では Supabase 環境変数が必要。セットアップは `docs/supabase-collab-setup.md` を参照。

---

## MCP 運用ルール

### 基本方針

- MCP は必要条件を満たす場合だけ使う
- ローカルのコード・設定・テストで足りる調査には MCP を使わない
- この repo で外部の現物確認が必要なときだけ使う

### Context7

- 使う条件:
  - Vite / React / Vitest / Tailwind / Supabase JS / GitHub Actions の最新版仕様確認が必要
  - 学習済み知識だけでは古い可能性がある
- 使わない条件:
  - リポジトリ内コードの読解
  - 既存実装の追跡だけで足りる作業

### Playwright

- 使う条件:
  - UI変更後の画面確認
  - フォーム操作、表示崩れ、導線確認
  - GitHub Pages 公開版や `npm run dev` / `npm run preview` のブラウザ検証
- 使わない条件:
  - 純粋関数や reducer の検証
  - Testing Library / Vitest で十分なケース

### Supabase

- 使う条件:
  - `src/collab/**` や共同編集仕様の変更
  - schema / migration / RLS / Realtime の実態確認
  - セットアップドキュメント更新前の事実確認
- 使わない条件:
  - localStorage 永続化だけの変更
  - フロントUIのみの変更

### GitHub

- 使う条件:
  - Actions / Pages / PR / Issue の調査
  - CI失敗原因の確認
  - リモート状態がローカルだけでは分からないとき
- 使わない条件:
  - ローカルgit履歴やワークツリー確認だけで足りるケース

### ガードレール

- GitHub での書き込み操作、Supabase での破壊的操作、Secrets 更新は、ユーザーが明示的に依頼した場合だけ行う
- 迷ったら MCP を使わず、先にローカル調査を優先する

---

## 参照ドキュメント

| ドキュメント                                                             | 内容                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| [`docs/tech-stack-best-practices.md`](docs/tech-stack-best-practices.md) | 技術スタックのベストプラクティス詳細（読み物） |
| [`CLAUDE.md`](CLAUDE.md)                                                 | AI アシスタント向け詳細ガイド                  |
| [`.agents/skills/`](.agents/skills/)                                     | 作業単位の実行 skill 一覧                      |

### Skills 一覧

| Skill                                                                                      | 内容                                       |
| ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| [`react-state-reducer`](.agents/skills/react-state-reducer/SKILL.md)                       | useReducer 純粋性・action 設計・分割       |
| [`storage-persistence-migrations`](.agents/skills/storage-persistence-migrations/SKILL.md) | localStorage 永続化・スキーマ migration    |
| [`vite-build-config`](.agents/skills/vite-build-config/SKILL.md)                           | Vite 設定最適化（base・warmup・chunk）     |
| [`testing-vitest-rtl`](.agents/skills/testing-vitest-rtl/SKILL.md)                         | Vitest + Testing Library テスト整備        |
| [`lint-format-git-hooks`](.agents/skills/lint-format-git-hooks/SKILL.md)                   | ESLint / Prettier / Husky / lint-staged    |
| [`ci-cd-gh-pages`](.agents/skills/ci-cd-gh-pages/SKILL.md)                                 | GitHub Actions lint→test→build→Pages       |
| [`architecture-refactor-plan`](.agents/skills/architecture-refactor-plan/SKILL.md)         | src 構成改善（hooks 抽出・reducer 外部化） |
