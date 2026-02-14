# フロントエンド近代化方針（ベストプラクティス準拠）

本ドキュメントは、既存の UI/デザイン見直し計画（`docs/ui-design-overhaul-plan-1-5.md`）を土台に、
React アプリの保守性・拡張性・品質を中長期で高めるための実行方針を整理したものです。

---

## 1. 方針サマリー

### 1.1 現状認識
- 現在は Create React App（CRA）ベースの構成で、`src/App.js` に画面・ロジック・永続化が集約されている。
- UI改善（見た目の統一、導線改善）と同時に、アーキテクチャ改善（責務分離）を進めないと中長期で手戻りが増える。

### 1.2 目標
- **短期**: UI/UXの改善を安全に進められる構造にする。
- **中期**: 状態管理・永続化・計算ロジックを分離して、変更容易性とテスト容易性を高める。
- **長期**: CRA依存から脱却し、モダンなビルド基盤（Vite）へ移行する。

---

## 2. 技術基盤の方針（CRA → Vite）

### 2.1 意思決定
- 基本方針は **Vite移行を最終到達点** とする。
- ただし、移行前にアプリ内部を整理（状態・永続化・計算の分離）し、移行リスクを下げる。

### 2.2 選択肢
- **A案（推奨）**: 先に内部整理 → Viteへ移行（SPA継続）。
- **B案（暫定）**: CRA維持のまま内部整理のみ先行。期限付きでA案へ合流。

### 2.3 Pages運用での注意点
- GitHub Pages配信を前提に、Vite移行時は `base` 設定（リポジトリ名配下）を明示する。
- CI（GitHub Actions）の Node バージョン要件を移行先に合わせて更新する。

---

## 3. アプリ構造の見直し方針（最優先）

### 3.1 `useReducer` 中心の状態管理へ統合

#### 目的
- 分散した state 更新ロジックを一元化し、挙動の追跡性を上げる。

#### 実施内容
- `state` を以下に集約する。
  - `players`
  - `companies`
  - `selectedCompanyId`
  - `numORs`
  - `currentView`
- `actions` をユースケース単位で定義する。
  - `PLAYER_ADD_MANY`, `PLAYER_RENAME`, `PLAYER_DELETE`
  - `COMPANY_ADD_MANY`, `COMPANY_RENAME`, `COMPANY_DELETE`, `COMPANY_SELECT`
  - `OR_SET_NUM`, `OR_REVENUE_SET`, `OR_REVENUE_RESET_ALL`
  - `TRAIN_ADD`, `TRAIN_DELETE`, `TRAIN_SET_STOPS`
  - `HOLDING_SET`, `TREASURY_SET`
- OR配列長の調整など、整形ロジックは reducer 内に寄せる。

### 3.2 永続化の分離（localStorage境界の明確化）

#### 目的
- UIと保存処理の結合を減らし、変更時の影響を限定する。

#### 実施内容
- `src/storage/`（または `src/lib/storage/`）を作成し、永続化APIを集約する。
  - `load(): AppState | null`
  - `save(state: AppState): void`
  - `migrate(saved): AppState`
- UI側は「状態を変更する」だけに限定し、保存呼び出しは境界層に任せる。

### 3.3 計算ロジックの純関数化

#### 目的
- UI非依存のロジックを独立させ、テストしやすくする。

#### 実施内容
- `src/lib/calc.js`（将来的に `calc.ts`）へ切り出す。
  - 列車収益合計
  - 企業OR合計
  - 配当計算（割合・切り捨てルール）
- 画面側からは純関数呼び出しのみ行う。

---

## 4. UI/デザイン見直し計画（1〜5）との統合

`docs/ui-design-overhaul-plan-1-5.md` の順序を維持しつつ、以下を追加方針とする。

1. **デザインシステム整備（既存計画1）**
   - UIプリミティブ（Button/Input/Card/Modal）導入時に、View分割しやすいファイル構成を採用。
2. **タイポグラフィ・余白（既存計画4）**
   - 見た目ルールをトークン化し、コンポーネント置換の判断基準を統一。
3. **色設計（既存計画5）**
   - ステータス色を意味ベースで固定し、色＋テキストで状態を表現。
4. **情報設計（既存計画2）**
   - `views/management`, `views/company-detail`, `views/summary` 分割とセットで実施。
5. **初回導線（既存計画3）**
   - セットアップ進捗（未着手/進行中/完了）の表示を導入。

---

## 5. 品質ゲート方針

### 5.1 静的品質
- ESLint/Prettier 設定を明示し、フォーマット差分を最小化する。
- 可能であれば pre-commit（husky + lint-staged）で品質チェックを自動化する。

### 5.2 テスト方針
- 最初のターゲットは `src/lib/calc.*` のユニットテスト。
- 次に reducer の状態遷移テストを追加。
- 既存 `App.test.js` は導線確認（初回セットアップ/タブ遷移）に絞り、責務を明確にする。

---

## 6. データ互換性（マイグレーション）方針

### 6.1 背景
- 永続化データの形は見直しで変化する可能性が高い。

### 6.2 実施内容
- 保存データに `schemaVersion` を付与する。
- 起動時に `migrate(saved)` を必ず通す。
- 変換不能時は「バックアップ退避 + 初期化 + 通知」の安全導線を用意する。

---

## 7. 実行ロードマップ（安全順）

### Phase 1（低リスク / UI影響小）
1. 計算ロジックの純関数切り出し
2. calcユニットテスト追加

### Phase 2（挙動維持で内部改善）
3. `useReducer` 化
4. 永続化層の分離 + `schemaVersion` 導入

### Phase 3（運用基盤の更新）
5. ESLint/Prettier と pre-commit 整備
6. CRA → Vite 移行（Pages設定・CI更新を含む）

### Phase 4（UX完成度向上）
7. UI/デザイン見直し計画 1〜5 の残タスク完了
8. 主要操作のE2Eまたは統合テストで回帰防止

---

## 8. 完了条件（Definition of Done）

- 主要ロジック（計算・状態遷移）が UI から分離され、単体テストで検証可能。
- 永続化データが `schemaVersion` 管理され、移行手順が文書化されている。
- UIは共通コンポーネント経由で実装され、スタイル直書きが限定されている。
- Vite移行後も GitHub Pages で安定デプロイできる。

