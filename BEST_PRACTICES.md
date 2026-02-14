# 技術ベストプラクティス調査レポート

本プロジェクト（18xx 収益計算補助）で使用している技術スタックのベストプラクティスを調査し、現状との差分と改善提案をまとめました。

---

## 目次

1. [React 18 ベストプラクティス](#1-react-18-ベストプラクティス)
2. [Tailwind CSS ベストプラクティス](#2-tailwind-css-ベストプラクティス)
3. [Jest / React Testing Library ベストプラクティス](#3-jest--react-testing-library-ベストプラクティス)
4. [アクセシビリティ (a11y)](#4-アクセシビリティ-a11y)
5. [プロジェクト構成・JavaScript 全般](#5-プロジェクト構成javascript-全般)
6. [改善優先度マトリクス](#6-改善優先度マトリクス)

---

## 1. React 18 ベストプラクティス

### 1.1 コンポーネント構造：単一責任の原則

**ベストプラクティス:**
各コンポーネントは1つの役割のみを担当する。コンポーネントが同時にデータ取得・表示・フィルタ管理・状態管理を行う場合は分割すべき。

**現状の課題:**
- `App.js` が約980行の単一ファイルに全コンポーネント・全ハンドラ・全状態管理を含む
- `App` コンポーネントが状態管理 + ルーティング + すべてのビジネスロジックを兼任

**推奨改善:**
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
│   ├── useLocalStorage.js
│   ├── useCompanies.js
│   ├── usePlayers.js
│   └── useModal.js
├── App.js           (レイアウト・ルーティングのみ)
├── constants.js     (定数・設定値)
└── utils.js         (計算ロジック等の純粋関数)
```

### 1.2 カスタムフックの活用

**ベストプラクティス:**
繰り返される状態管理ロジックはカスタムフックに抽出する。UIロジックとビジネスロジックを分離する。

**現状の課題:**
- `App` 内にすべてのハンドラ関数が密集（`handleAddMultiplePlayers`, `handleDeletePlayer`, `handleStockHoldingChange` 等）
- localStorage の読み書きロジックが `App` に直接埋め込まれている
- `PercentageInputControl` と `RevenueStopEditor` で似た「値の編集 → 確定」パターンが重複

**推奨改善:**

1. **`useLocalStorage` カスタムフック** — localStorage との同期を汎用化
```javascript
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('localStorage読み込みエラー:', error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('localStorage保存エラー:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
```

2. **`usePlayers` / `useCompanies` カスタムフック** — ドメインロジックをカプセル化
3. **`useModal` カスタムフック** — モーダルの表示/確認パターンを統一

### 1.3 useEffect の適正利用

**ベストプラクティス:**
- `useEffect` はデータフェッチングや副作用の「ゴミ箱」にしない
- 派生状態は `useMemo` で計算する
- イベントに起因する処理はイベントハンドラ内で完結させる

**現状の課題:**
- `App.js:705-709` で `saveData` を依存配列に入れた `useEffect` は冗長。`saveData` が `useCallback` でメモ化されているが、状態変更のたびに `saveData` が再生成されるため、実質的に2重トリガーの可能性がある
- `RevenueStopEditor` と `PercentageInputControl` で `useEffect` を使って prop → state の同期を行っているが、これは制御されたコンポーネント（Controlled Component）パターンで代替可能

**推奨改善:**
- データ保存は状態更新ハンドラ内で直接行うか、`useEffect` の依存配列を最適化する
- 派生状態（配当金計算、合計収益等）はレンダリング中に直接計算するか `useMemo` を使用（現状 `SummaryView` で行っているのは良い実践）

### 1.4 React.memo / useMemo / useCallback の適切な使用

**ベストプラクティス:**
- まず計測し、実際にパフォーマンス問題がある箇所にのみ適用する
- すべてのコンポーネントをメモ化するのは過剰最適化

**現状の課題:**
- `useCallback` は `saveData` のみに使用されている
- 各ビューコンポーネントには `React.memo` が適用されていない
- `SummaryView` 内の計算ロジック（`playerDividends`, `companySummaries`）は毎レンダリングで再計算されている

**推奨改善:**
- `SummaryView` の計算は `useMemo` で最適化を検討（ただしデータ量が少なければ現状でも問題ない）
- 子コンポーネントに渡すイベントハンドラを `useCallback` でメモ化することを検討
- プロファイリングで問題箇所を特定してから最適化すること（過度なメモ化は避ける）

### 1.5 NavButton のコンポーネント定義位置

**現状の課題:**
- `NavButton` コンポーネントが `App` 関数の **内部** で定義されている（`App.js:901`）
- レンダリングのたびにコンポーネントが再生成される

**推奨改善:**
- `NavButton` を `App` 関数の外（他のヘルパーコンポーネントと同じ場所）に移動する

---

## 2. Tailwind CSS ベストプラクティス

### 2.1 コンポーネントベースのスタイル管理

**ベストプラクティス:**
- Tailwindの本来の強みはReactコンポーネントと組み合わせること
- `@apply` ではなく、コンポーネント抽出でスタイルを再利用する

**現状の評価: 良好**
- 全スタイルがユーティリティクラスで記述されている
- カスタムCSSクラスを使用していない
- コンポーネント内でスタイルが定義されておりコロケーションが実現されている

### 2.2 デザインシステムの一元管理

**ベストプラクティス:**
- 色やスペーシングを `tailwind.config.js` でカスタムトークンとして定義する

**現状の課題:**
- `tailwind.config.js` の `theme.extend` が空で、カスタムトークンが未定義
- アプリ全体でハードコードされた色値（`bg-indigo-600`, `bg-teal-50` 等）を使用

**推奨改善:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4f46e5',   // indigo-600 相当
          secondary: '#0284c7', // sky-600 相当
          accent: '#0d9488',    // teal-600 相当
        }
      }
    }
  }
}
```

### 2.3 クラスの整列順序

**ベストプラクティス:**
- Prettier の Tailwind CSS プラグイン（`prettier-plugin-tailwindcss`）でクラス順序を自動整理する

**現状の課題:**
- Prettier も Tailwind ソートプラグインも未導入
- クラス順序が統一されていない

**推奨改善:**
```bash
npm install -D prettier prettier-plugin-tailwindcss
```

### 2.4 繰り返されるクラスの集約

**現状の課題:**
- ボタンスタイルが各所に長いクラス文字列として重複（例: `"bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-150 ease-in-out"`）

**推奨改善:**
- 共通ボタンスタイルを定数や小コンポーネントとして抽出
```javascript
const buttonStyles = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition",
  danger: "bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition",
  secondary: "bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md transition",
};
```

---

## 3. Jest / React Testing Library ベストプラクティス

### 3.1 現状のテスト状況

**重大な問題:**
- 既存テスト（`App.test.js`）は CRA テンプレートのまま
- "learn react" テキストを検索しているが、アプリに存在しないため **テストは確実に失敗する**
- テストカバレッジ: 実質 **0%**

### 3.2 テスト戦略の推奨

**ベストプラクティス:**
- ユーザーの振る舞いをテストする（実装の詳細ではない）
- ユーザー中心のクエリを使用する（`getByRole`, `getByLabelText`, `getByText`）
- 重要なユーザーフローから優先的にテストする

**推奨テスト構成:**
```
src/
├── __tests__/
│   ├── App.test.js           # 統合テスト（ナビゲーション等）
│   ├── SummaryView.test.js   # サマリー表示
│   ├── ManagementView.test.js # プレイヤー/企業管理
│   └── CompanyDetail.test.js  # 企業詳細・収益計算
├── components/
│   └── common/
│       └── __tests__/
│           ├── Modal.test.js
│           └── PercentageInputControl.test.js
```

### 3.3 優先テスト対象

重要度順：

1. **配当計算ロジック** — ビジネスクリティカルな計算が正しいか
2. **プレイヤー/企業の CRUD 操作** — 追加・削除・編集が正常動作するか
3. **localStorage 永続化** — データが正しく保存・復元されるか
4. **モーダルの確認フロー** — 削除操作の2段階確認が正しく動作するか
5. **OR 収益入力と合計計算** — 数値入力・合計表示が正しいか

### 3.4 テスト作成例

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// localStorage のモック
beforeEach(() => {
  localStorage.clear();
});

test('プレイヤーを一括追加できる', async () => {
  const user = userEvent.setup();
  render(<App />);

  // 管理画面に移動
  await user.click(screen.getByText('全般管理'));

  // プレイヤーを追加
  await user.click(screen.getByText('プレイヤーを一括追加'));

  // プレイヤーが表示される
  expect(screen.getByText('プレイヤー 1')).toBeInTheDocument();
  expect(screen.getByText('プレイヤー 2')).toBeInTheDocument();
});

test('配当金が正しく計算される', async () => {
  // ... ユーザー操作をシミュレートして配当金の計算結果を検証
});
```

### 3.5 モック戦略

- **localStorage**: `beforeEach` で `localStorage.clear()` する
- **`crypto.randomUUID()`**: Jest 環境で利用可能か確認し、必要ならポリフィルを提供
- **外部API**: 現在使用していないため不要

---

## 4. アクセシビリティ (a11y)

### 4.1 セマンティック HTML

**ベストプラクティス:**
- ネイティブHTML要素（`<button>`, `<nav>`, `<header>` 等）を使う
- `<div>` + onClick でインタラクティブ要素を作らない

**現状の課題:**
- `RevenueStopEditor` の収益値表示（`App.js:92`）が `<div onClick>` で実装されている → キーボードアクセス不可
- プレイヤー名（`App.js:425`）も `<span onClick>` で編集トリガーされている → キーボードでフォーカスできない
- モーダルにフォーカストラップが実装されていない

**推奨改善:**
- クリック可能な `<div>` / `<span>` は `<button>` に変更する
- `role`, `aria-label`, `tabIndex` を適切に付与する

### 4.2 フォームのアクセシビリティ

**ベストプラクティス:**
- すべての `<input>` に対応する `<label>` を付ける
- エラー表示は `aria-invalid` と `aria-describedby` で通知する

**現状の課題:**
- `RevenueInput` のカスタム値入力（`App.js:137`）にラベルがない（`placeholder` のみ）
- `RevenueStopEditor` の編集用入力（`App.js:68-72`）にラベルがない
- `PercentageInputControl` の入力（`App.js:262-271`）にラベル関連付けがない

**推奨改善:**
- `aria-label` または `<label>` をすべての入力要素に追加
- バリデーションエラー時に `aria-invalid="true"` を設定

### 4.3 モーダルのアクセシビリティ

**現状の課題:**
- `Modal` コンポーネントに `role="dialog"` / `aria-modal="true"` が未設定
- モーダルが開いた際にフォーカスが移動しない
- Escape キーでモーダルを閉じられない（一部の場面のみ対応）
- 背景コンテンツがスクリーンリーダーから隠されていない

**推奨改善:**
```jsx
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  {/* ... */}
</div>
```

### 4.4 キーボードナビゲーション

**現状の課題:**
- 収益地点のクイック操作ボタン（`+`, `-`, `⊕`, `⊖`）はホバー時のみ表示（`opacity-0 group-hover:opacity-100`）
  → キーボードユーザーには操作ボタンが見えない
- タブ順序が論理的でない場面がある

**推奨改善:**
- `focus-within` や `focus-visible` を活用してキーボードフォーカス時にもボタンを表示する
```html
<div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
```

### 4.5 開発支援ツール

**推奨:**
```bash
npm install -D eslint-plugin-jsx-a11y
```
- ESLint にアクセシビリティルールを追加し、開発時に自動検出する

---

## 5. プロジェクト構成・JavaScript 全般

### 5.1 コンポーネント分割

**ベストプラクティス:**
- 機能ベースのフォルダ構造を採用する
- 1ファイルあたり1コンポーネントを原則とする

**現状の課題:**
- 全コンポーネント（9個）が `App.js` 1ファイルに存在
- ファイルが約980行で可読性・保守性が低い

**推奨改善:** → 1.1 で記載した構成を参照

### 5.2 定数の外部化

**現状の課題:**
- `defaultCompanyColors` は `App.js` 先頭で定義されているが、他の定数（`APP_STORAGE_KEY`、`revenueValues` 等）も散在

**推奨改善:**
```javascript
// src/constants.js
export const APP_STORAGE_KEY = 'trainRevenue_18xx_data';
export const DEFAULT_COMPANY_COLORS = [
  "赤", "青", "緑", "黄", "黒", "白", "橙", "紫", "桃", "茶", "空", "灰"
];
export const REVENUE_PRESET_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const MAX_ORS = 5;
```

### 5.3 ビジネスロジックの分離

**ベストプラクティス:**
- 計算ロジックを純粋関数として分離し、テスト可能にする

**現状の課題:**
- 配当計算ロジックが `SummaryView` コンポーネント内にインライン定義
- 収益合計計算が `CompanyDetailView` 内にインライン定義

**推奨改善:**
```javascript
// src/utils/calculations.js
export function calculatePlayerDividends(players, companies, numORs) { ... }
export function calculateCompanySummaries(companies, numORs) { ... }
export function calculateTrainRevenue(train) {
  return train.stops.reduce((sum, stop) => sum + stop, 0);
}
```

### 5.4 エラーバウンダリ

**ベストプラクティス:**
- 予期しないエラーでアプリ全体がクラッシュしないよう、Error Boundary を設置する

**現状の課題:**
- Error Boundary が未実装
- localStorage の読み込みエラーはキャッチされているが、レンダリングエラーは未処理

**推奨改善:**
- 少なくともルートレベルに1つの Error Boundary を追加する

### 5.5 型安全性

**ベストプラクティス:**
- TypeScript の導入、または最低限 JSDoc での型注釈

**現状の課題:**
- 型チェックなし（Plain JavaScript、PropTypes もなし）
- データモデルの構造が暗黙的

**推奨改善（段階的）:**
1. まず PropTypes を追加（最小限の型安全性）
2. 将来的に TypeScript へ移行を検討
3. または JSDoc コメントで型を注釈

### 5.6 パッケージの更新

**現状の課題:**
- `react-scripts` 5.0.1 は最新ではない可能性がある
- `@testing-library/react` が `dependencies` に含まれていない（`react-scripts` に同梱だが明示推奨）
- `@testing-library/user-event` も明示的に追加すべき

**推奨改善:**
```bash
npm outdated                          # バージョンの確認
npm install @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

---

## 6. 改善優先度マトリクス

影響度と実装コストを基に優先度を分類しました。

### 高優先度（影響大・コスト低〜中）

| # | 項目 | 理由 |
|---|------|------|
| 1 | **テストの修正・追加** | 現在のテストが壊れており、品質保証がない |
| 2 | **NavButton を App 外に移動** | 毎レンダリングで再生成されるバグ的挙動 |
| 3 | **クリック可能な div/span を button に変更** | アクセシビリティの基本要件 |
| 4 | **Modal に role="dialog" と aria-modal を追加** | スクリーンリーダー対応の基本 |
| 5 | **フォーム入力にラベルを追加** | アクセシビリティ要件 |

### 中優先度（影響中・コスト中）

| # | 項目 | 理由 |
|---|------|------|
| 6 | **useLocalStorage カスタムフック** | コードの整理・再利用性向上 |
| 7 | **ビジネスロジックの utils 分離** | テスト容易性の向上 |
| 8 | **定数の外部ファイル化** | 保守性向上 |
| 9 | **Prettier + Tailwind ソートプラグイン導入** | コード品質の自動化 |
| 10 | **eslint-plugin-jsx-a11y 導入** | アクセシビリティ問題の自動検出 |

### 低優先度（影響大だがコスト高）

| # | 項目 | 理由 |
|---|------|------|
| 11 | **コンポーネントのファイル分割** | 大規模リファクタリング。段階的に実施推奨 |
| 12 | **TypeScript 移行** | 長期的には有益だが移行コストが高い |
| 13 | **Error Boundary 追加** | 重要だがアプリが安定している場合は緊急度低 |
| 14 | **tailwind.config.js のデザイントークン定義** | デザイン一貫性向上だがアプリ規模に対して過剰の可能性 |

---

## 参考資料

### React
- [React Best Practices - DevAceTech](https://www.devacetech.com/insights/react-best-practices)
- [React & Next.js in 2025 - Modern Best Practices - Strapi](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
- [React Architecture Patterns 2025 - BacanCY](https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices)
- [React Design Patterns 2025 - Telerik](https://www.telerik.com/blogs/react-design-patterns-best-practices)
- [33 React Best Practices 2026 - Technostacks](https://technostacks.com/blog/react-best-practices/)
- [React Hooks Changes - Matt Smith](https://allthingssmitty.com/2025/12/01/react-has-changed-your-hooks-should-too/)

### Tailwind CSS
- [Tailwind CSS Best Practices 2025-2026 - FrontendTools](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns)
- [Tailwind CSS in Large Projects - Medium](https://medium.com/@vishalthakur2463/tailwind-css-in-large-projects-best-practices-pitfalls-bf745f72862b)
- [How to Master Tailwind CSS 2025 - BootstrapDash](https://www.bootstrapdash.com/blog/tailwind-css-best-practices)
- [Tailwind CSS Best Practices 2025 - Faraaz Motiwala](https://www.faraazcodes.com/blog/tailwind-2025-best-practices)

### テスト
- [React Testing Library - 公式ドキュメント](https://testing-library.com/docs/react-testing-library/intro/)
- [Top React Testing Libraries 2026 - BrowserStack](https://www.browserstack.com/guide/top-react-testing-libraries)
- [Testing in 2026: Jest, RTL & Full Stack - Nucamp](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies)
- [React UI Testing Best Practices 2026 - Trio.dev](https://trio.dev/best-practices-for-react-ui-testing/)

### アクセシビリティ
- [React Accessibility - 公式ドキュメント](https://legacy.reactjs.org/docs/accessibility.html)
- [React Accessibility Guide - BrowserStack](https://www.browserstack.com/guide/react-accessibility)
- [React a11y Best Practices - RTCamp](https://rtcamp.com/handbook/react-best-practices/accessibility/)
- [React Aria - Adobe](https://react-spectrum.adobe.com/react-aria/accessibility.html)

### localStorage
- [useLocalStorage - usehooks-ts](https://usehooks-ts.com/react-hook/use-local-storage)
- [Persisting React State in localStorage - Josh W. Comeau](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/)
- [localStorage in React - Robin Wieruch](https://www.robinwieruch.de/local-storage-react/)
