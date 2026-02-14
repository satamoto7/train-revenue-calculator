# 修正プラン: 技術ベストプラクティス適用

BEST_PRACTICES.md の調査結果に基づき、3フェーズに分けた段階的修正プランです。
各フェーズは独立してデプロイ可能で、既存機能を壊さないことを前提としています。

---

## フェーズ 1: 即座に修正すべき問題（バグ修正・基本品質）

リスク低・影響大。既存の動作を壊さず、コードの正確性と基本品質を改善。

### 1-1. NavButton をApp関数の外に移動

- **ファイル:** `src/App.js` 901行目
- **問題:** `NavButton` が `App()` 関数内部で定義されており、Appがレンダリングされるたびにコンポーネントが再生成される。これにより React が毎回 DOM を再マウントし、フォーカスが失われる等の意図しない挙動が起こりうる
- **修正:** `NavButton` を `App` 関数の外（他のヘルパーコンポーネントと同じ位置）に移動
- **変更量:** 移動のみ、約5行

### 1-2. 壊れたテストを修正し、基本テストを追加

- **ファイル:** `src/App.test.js`
- **問題:** CRAテンプレートのまま「learn react」を検索しており、確実に失敗する
- **修正:**
  - アプリタイトル「18xx 収益計算補助」が表示されることを確認するテスト
  - 3つのナビゲーションタブが表示されることを確認するテスト
  - 各ビューへの画面遷移テスト
  - プレイヤー一括追加の基本テスト
  - 企業一括追加の基本テスト
  - localStorage モックのセットアップ
  - `crypto.randomUUID` のポリフィル（Jest環境用）
- **変更量:** テストファイル全面書き換え、約100-150行

### 1-3. Modal にアクセシビリティ属性を追加

- **ファイル:** `src/App.js` 13-39行目（Modalコンポーネント）
- **問題:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` が未設定
- **修正:**

  ```jsx
  // Before
  <div className="fixed inset-0 bg-black bg-opacity-60 ...">
    <div className="bg-white p-6 ...">

  // After
  <div className="fixed inset-0 bg-black bg-opacity-60 ..." role="dialog" aria-modal="true" aria-labelledby="modal-message">
    <div className="bg-white p-6 ...">
      {message && <p id="modal-message" ...>{message}</p>}
  ```

- **変更量:** 約3行の属性追加

### 1-4. クリック可能な div/span を button に変更

- **ファイル:** `src/App.js`
- **対象箇所:**
  - **92行目:** `RevenueStopEditor` の収益値表示 `<div onClick={() => setIsEditing(true)}>` → `<button>` に変更
  - **425行目:** `ManagementView` のプレイヤー名 `<span onClick={() => startEditPlayerName(player)}>` → `<button>` に変更
- **理由:** `<div>`/`<span>` + `onClick` はキーボードでフォーカス・操作できず、スクリーンリーダーにも認識されない
- **修正:**

  ```jsx
  // Before (92行目)
  <div className="relative p-1.5 bg-slate-200 rounded text-sm text-slate-700 cursor-pointer hover:bg-slate-300" onClick={() => setIsEditing(true)}>

  // After
  <button type="button" className="relative p-1.5 bg-slate-200 rounded text-sm text-slate-700 cursor-pointer hover:bg-slate-300 text-left" onClick={() => setIsEditing(true)} aria-label={`収益地点 ${stop} を編集`}>
  ```

- **変更量:** 各箇所2-3行

### 1-5. フォーム入力にラベル/aria-label を追加

- **ファイル:** `src/App.js`
- **対象箇所:**
  - **68-72行目:** `RevenueStopEditor` の編集入力 → `aria-label="収益値を編集"` を追加
  - **133-138行目:** `RevenueInput` のカスタム値入力 → `aria-label="カスタム収益値"` を追加
  - **262-271行目:** `PercentageInputControl` の入力 → `aria-label` に `{label}の保有割合` を設定
- **変更量:** 各箇所1行の属性追加

### 1-6. ホバー専用UIのキーボード対応

- **ファイル:** `src/App.js`
- **対象箇所:**
  - **91行目:** `⊕` ボタン — `opacity-0 group-hover:opacity-100`
  - **94行目:** `+`/`-` クイック変更ボタン — 同上
  - **99行目:** `⊖` ボタン — 同上
- **問題:** ホバー時のみ表示されるボタンはキーボードユーザーから見えない
- **修正:** `group-focus-within:opacity-100` を追加
  ```
  // Before
  opacity-0 group-hover:opacity-100
  // After
  opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
  ```
- **変更量:** 各箇所にクラス1つ追加

---

## フェーズ 2: コード品質・保守性の向上

リスク中・影響中。コードの整理と保守性向上。リファクタリング中心。

### 2-1. 定数を外部ファイルに抽出

- **新規ファイル:** `src/constants.js`
- **移動する定数:**
  - `APP_STORAGE_KEY` (App.js:4)
  - `defaultCompanyColors` (App.js:7-9)
  - `revenueValues` (RevenueInput内 App.js:105)
- **App.js の変更:** `import { APP_STORAGE_KEY, ... } from './constants'` に置き換え
- **変更量:** 新規ファイル約15行 + App.js内でimportとインライン定数削除

### 2-2. 計算ロジックをユーティリティ関数に抽出

- **新規ファイル:** `src/utils.js`
- **抽出する関数:**
  - `calculatePlayerDividends(players, companies, numORs)` — SummaryView:283-296 から
  - `calculateCompanySummaries(companies, numORs)` — SummaryView:300-310 から
  - `calculateTrainRevenue(train)` — CompanyDetailView:510 から
  - `calculateTotalORRevenue(company, numORs)` — CompanyDetailView:511 から
- **新規テストファイル:** `src/utils.test.js` — 上記関数の単体テスト
- **メリット:** ビジネスクリティカルな計算を独立してテスト可能
- **変更量:** 新規ファイル約50行 + テスト約80行 + App.js内で関数呼び出し置き換え

### 2-3. useLocalStorage カスタムフックの作成

- **新規ファイル:** `src/hooks/useLocalStorage.js`
- **目的:** App.jsの localStorage 読み書きロジック (664-709行目) をカスタムフックに抽出
- **修正後のApp.js:**
  ```javascript
  // Before: useState + useEffect × 2 + useCallback (約45行)
  // After:
  const [appData, setAppData] = useLocalStorage(APP_STORAGE_KEY, {
    players: [],
    companies: [],
    selectedCompanyId: null,
    numORs: 2,
  });
  ```
- **変更量:** 新規ファイル約30行 + App.js内で約45行→約5行に簡素化

### 2-4. 開発ツールの追加

- **package.json に追加:**
  - `@testing-library/user-event` — テストでのユーザー操作シミュレーション
  - `eslint-plugin-jsx-a11y` — アクセシビリティ自動検出
- **変更量:** パッケージ追加 + ESLint設定

---

## フェーズ 3: 構造的改善（大規模リファクタリング）

リスク高・影響大。長期的な保守性向上のための構造変更。

### 3-1. コンポーネントのファイル分割

- **目的:** 980行の単一ファイルを機能ベースのフォルダ構造に分割
- **新しい構造:**
  ```
  src/
  ├── components/
  │   ├── common/
  │   │   ├── Modal.js
  │   │   ├── NavButton.js
  │   │   └── PercentageInputControl.js
  │   ├── summary/
  │   │   └── SummaryView.js
  │   ├── management/
  │   │   └── ManagementView.js
  │   └── company/
  │       ├── CompanyDetailView.js
  │       ├── TrainCard.js
  │       ├── RevenueStopEditor.js
  │       └── RevenueInput.js
  ├── hooks/
  │   └── useLocalStorage.js
  ├── constants.js
  ├── utils.js
  └── App.js  (レイアウト・ルーティング・状態管理のみ、約200行)
  ```
- **変更量:** 約10個の新規ファイル + App.js大幅書き換え

### 3-2. カスタムフックによる状態管理の分離

- **新規ファイル:**
  - `src/hooks/usePlayers.js` — プレイヤー CRUD ロジック (712-740行目)
  - `src/hooks/useCompanies.js` — 企業 CRUD + 株式 + OR収益ロジック (743-890行目)
  - `src/hooks/useModal.js` — モーダル表示・確認パターン (658-661行目)
- **目的:** App.js の handler 密集を解消し、各ドメインのロジックをカプセル化
- **変更量:** 3つの新規フック + App.jsの大幅簡素化

### 3-3. Error Boundary の追加

- **新規ファイル:** `src/components/ErrorBoundary.js`
- **目的:** レンダリングエラーでアプリ全体がクラッシュすることを防止
- **変更量:** 新規ファイル約40行 + index.js で App を ErrorBoundary でラップ

---

## 実施順序の推奨

```
フェーズ1 (1-2日)
  ├── 1-1 NavButton移動
  ├── 1-3 Modal a11y
  ├── 1-4 div/span → button
  ├── 1-5 input labels
  ├── 1-6 keyboard対応
  └── 1-2 テスト修正（最後に実施 → 全変更のリグレッション確認）

フェーズ2 (2-3日)
  ├── 2-1 定数抽出
  ├── 2-2 計算ロジック抽出 + テスト
  ├── 2-3 useLocalStorage
  └── 2-4 開発ツール追加

フェーズ3 (3-5日)
  ├── 3-1 ファイル分割
  ├── 3-2 カスタムフック
  └── 3-3 Error Boundary
```

## リスクと注意点

- **フェーズ1:** 既存の見た目・動作への影響は最小限。ただし `<div>` → `<button>` 変更時、ブラウザデフォルトのボタンスタイルが適用されるため、Tailwindでリセットが必要
- **フェーズ2:** import パスの変更により、既存のテストが影響を受ける可能性。テストをフェーズ1で修正済みにしてから着手すべき
- **フェーズ3:** 最大のリスク。git の差分が大きく、レビューが困難になる。フェーズ2完了後にテストカバレッジを確保してから着手を推奨

---

## 進捗メモ（frontend-modernization連携）

- [x] `docs/frontend-modernization-best-practices-plan.md` の **Phase 1-1**（計算ロジック切り出し）対応済み。
- [x] 同ドキュメントの **Phase 1-2**（calcユニットテスト追加）対応済み。
- [ ] 次の優先作業: CRA → Vite 移行（Pages設定・CI更新を含む）

> 運用ルール: 計算ロジックを変更するPRでは、`src/lib/calc.test.js` の更新有無を必ず確認する。

---

## Phase 4-7 詳細タスク（UI/デザイン見直し 1〜5 完了向け）

> 背景: Phase 4-7 の作業範囲が長期化しているため、レビューしやすい粒度に分解して管理する。

### 4-7A. デザインシステム整備（UIプリミティブ横展開）

- [x] `Button` 共通化（variant/size）
- [x] `Card` 共通化
- [x] `Input` 共通化
- [x] `Modal` を `src/components/ui/Modal.jsx` へ分離
- [x] `SectionHeader` を追加し、主要見出しスタイルを統一
- [x] 既存 `App.jsx` の直書きボタン/入力を UI プリミティブへ段階置換（残件棚卸し）

**4-7A 残件棚卸し（次フェーズへ持ち越し）**

- `TrainCard` 内の「削除」「クリア」等を共通 `Button` へ寄せる
- プレイヤー/企業削除アイコンボタンの variant 整理（Danger統一）
- OR入力周辺のクイック操作ボタン群の共通化方針を決める

**完了条件**

- 同種UI（Button/Input/Card/Modal/SectionHeader）が共通コンポーネント経由で実装される。
- 新規実装で生の Tailwind クラス直書きを最小化できる。

### 4-7B. タイポグラフィ・余白スケール標準化

- [x] `tailwind.config.js` に `fontSize` / `spacing` / shadow を追加
- [ ] 見出し・本文・補助テキストのサイズ利用ルールを `PLAN.md` に明文化
- [ ] 主要入力 UI（収益編集 / 割合入力 / モーダル）へ統一ルール適用
- [ ] 320px 幅での可読性チェック（テキスト折返し、ボタン高さ、タップ領域）

**完了条件**

- 可読性に関するレビュー指摘（文字が小さい/詰まりすぎ）が再発しない。

### 4-7C. 色設計（ステータスカラー）再定義

- [x] 意味ベースの色トークン（Info/Success/Warning/Danger/Neutral）を追加
- [ ] 破壊操作（削除/リセット）の Danger 統一を全画面で完了
- [ ] 通常編集操作を Primary/Neutral に寄せる
- [ ] 「色だけで意味を伝えるUI」の棚卸しとラベル併記方針の記録

**完了条件**

- 同じ意味の操作が画面ごとに異なる色を使わない。

### 4-7D. 情報設計（IA）再構成

- [ ] 現在の `App.jsx` セクションを「設定 / 入力 / 確認」に分類
- [ ] セクション並び順をユーザー操作順へ再配置
- [ ] 破壊操作の下部集約
- [ ] `src/views/management` / `src/views/company-detail` / `src/views/summary` へ分割

**完了条件**

- 初見ユーザーが上から順に操作するだけで主要タスクを完了できる。

### 4-7E. ナビゲーション・初回導線（再検討枠）

- [ ] 空データ時セットアップ導線の再設計（優先度: 中）
- [ ] タブ進捗表示の再導入可否を IA 改修後に判断
- [ ] `App.test.jsx` に初回導線テストを追加・更新

**メモ**

- いったん優先度を下げた「未完了ガイド/状態ラベル」は、IA 再設計と同時に再評価する。

### 4-7F. 実行順序（短期スプリント）

1. 4-7A（Modal/SectionHeader 分離 + 置換棚卸し）
2. 4-7B（タイポ/余白の主要UI適用）
3. 4-7C（色意味統一の全画面適用）
4. 4-7D（view分割と配置再構成）
5. 4-7E（導線再導入の可否判断）

### 4-7G. 受け入れチェック（PRごと）

- [ ] 変更対象が UI プリミティブ経由になっているか
- [ ] `npm run test` / `npm run lint` が通るか
- [ ] UI変更が視認できるスクリーンショットを添付したか
- [ ] `docs/frontend-modernization-best-practices-plan.md` の進捗ログを更新したか
