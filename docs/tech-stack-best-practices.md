# 技術ベストプラクティス（train-revenue-calculator）

本プロジェクト（18xx 収益計算補助）で使用している技術スタックのベストプラクティスをまとめた読み物ドキュメントです。  
**手順・チェックリストは `.agents/skills/` を参照してください。**

---

## 目次

1. [React 18 状態管理](#1-react-18-状態管理)
2. [Tailwind CSS](#2-tailwind-css)
3. [Vitest / React Testing Library](#3-vitest--react-testing-library)
4. [アクセシビリティ (a11y)](#4-アクセシビリティ-a11y)
5. [プロジェクト構成](#5-プロジェクト構成)
6. [localStorage 永続化](#6-localstorage-永続化)
7. [Vite ビルド設定](#7-vite-ビルド設定)
8. [ESLint / Prettier / Git フック](#8-eslint--prettier--git-フック)
9. [GitHub Actions / CI・CD](#9-github-actions--cicd)
10. [改善優先度マトリクス](#10-改善優先度マトリクス)

---

## 1. React 18 状態管理

### useReducer の純粋性

Reducer は **純粋関数** である必要がある。React 18 の Strict Mode は開発環境で reducer を二重実行するため、副作用（localStorage・Date・API 等）を reducer 内に書くとバグが発生する。

```javascript
// ❌ 悪い例：reducer 内で localStorage を呼ぶ
case 'ADD_PLAYER':
  localStorage.setItem('data', JSON.stringify(newState)); // Strict Mode で2回実行される
  return newState;

// ✅ 良い例：副作用は useEffect に置く
useEffect(() => {
  save(state); // reducer の外で1回だけ実行
}, [state]);
```

### action の粒度

1 ユーザー操作 = 1 action が理想。ただし関連する状態を一括リセットするような `RESET` 系まとめ action は許容される。

```javascript
// ✅ 現在のアクション例
'PLAYER_SET_ALL'; // プレイヤー一覧を差し替え
'COMPANY_SET_ALL'; // 企業一覧を差し替え
'COMPANY_SELECT'; // 選択企業の変更
'OR_SET_NUM'; // OR 数の変更
'VIEW_SET'; // 表示ビューの切り替え
'APP_LOAD'; // localStorage からの初期ロード
```

### useReducer の初期化

初期化が重い処理を含む場合は `useReducer(reducer, null, init)` の第3引数 `init` 関数に移す（マウント時1回だけ実行される）。

```javascript
function init(_) {
  const saved = load(); // localStorage からの読み込み
  return saved ?? defaultState;
}
const [state, dispatch] = useReducer(reducer, null, init);
```

### カスタムフック

状態管理ロジックは将来的にカスタムフックへ抽出することで、App.jsx の肥大化を防げる。

```javascript
// src/hooks/useModal.js（例）
function useModal() {
  const [modalMessage, setModalMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const openModal = (message, action) => {
    setModalMessage(message);
    setConfirmAction(() => action);
  };
  const closeModal = () => {
    setModalMessage('');
    setConfirmAction(null);
  };
  return { modalMessage, confirmAction, openModal, closeModal };
}
```

### useEffect の適正利用

- `useEffect` はデータフェッチや外部副作用の整理に使う。派生状態（collections の集計など）はレンダリング中に計算するか `useMemo` を使う。
- prop → state の同期には `useEffect` より Controlled Component パターン（prop を直接使う）を優先する。

---

## 2. Tailwind CSS

### コンポーネントベースのスタイル管理

Tailwind の強みは React コンポーネントとの組み合わせ。`@apply` ではなくコンポーネント抽出でスタイルを再利用する（Button, Card, Input 等は既に実装済み）。

### デザイントークン

`tailwind.config.js` の `theme.extend` でカスタムトークンを定義し、ハードコードされた色クラスを排除する。

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { primary: '#4f46e5', secondary: '#0284c7', accent: '#0d9488' },
        surface: { base: '#f9fafb', elevated: '#ffffff' },
      },
    },
  },
};
```

### クラス順序の統一

`prettier-plugin-tailwindcss` を導入するとクラス順序を自動整理できる（現在未導入）。

```bash
npm install -D prettier-plugin-tailwindcss
```

### キーボードフォーカス対応

ホバーのみで表示される要素は `focus-within` も追加してキーボードユーザー対応とする。

```html
<!-- ❌ ホバーのみ -->
<div class="opacity-0 group-hover:opacity-100">
  <!-- ✅ キーボードフォーカスにも対応 -->
  <div class="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"></div>
</div>
```

---

## 3. Vitest / React Testing Library

### テストの基本方針

ユーザーの振る舞いをテストする（実装の詳細ではない）。

**クエリ優先順位（高い順）:**

1. `getByRole` — ボタン・入力・見出し等
2. `getByLabelText` — フォームフィールド
3. `getByPlaceholderText`
4. `getByText`
5. `getByTestId` — 最後の手段

### セットアップ

```javascript
// vite.config.js の test セクション
test: {
  environment: 'jsdom',
  setupFiles: ['./src/setupTests.js'],
  globals: true,
}
```

```javascript
// src/setupTests.js
import '@testing-library/jest-dom';
```

### userEvent vs fireEvent

```javascript
// ❌ 避けるべき
fireEvent.click(button);

// ✅ 推奨
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'テキスト');
```

### Reducer の単体テスト

Reducer は純粋関数なため、UI なしで直接テストできる。

```javascript
import { reducer } from '../App';

test('PLAYER_SET_ALL でプレイヤーが更新される', () => {
  const state = { players: [], companies: [] };
  const newPlayers = [{ id: '1', name: 'A' }];
  const next = reducer(state, { type: 'PLAYER_SET_ALL', players: newPlayers });
  expect(next.players).toEqual(newPlayers);
});
```

### テストカバレッジの優先順位

1. 計算ロジック（`src/lib/calc.js`）— ビジネスクリティカル ✅ 済
2. ストレージ層（`src/storage/appStorage.js`）— データ破損防止 ✅ 済
3. 主要ユーザーフロー — プレイヤー追加・企業操作・OR 収益入力 ✅ 済（11件）
4. エッジケース — 削除確認モーダル、localStorage 破損時などの拡充

---

## 4. アクセシビリティ (a11y)

### セマンティック HTML

クリック可能な `<div>` / `<span>` は `<button>` に変更する。

```jsx
// ❌
<div onClick={handleEdit}>収益値</div>

// ✅
<button type="button" onClick={handleEdit}>収益値</button>
```

### フォームラベル

すべての `<input>` に `<label>` または `aria-label` を付ける。

```jsx
<input aria-label="OR1 収益" type="number" ... />
```

### モーダルのアクセシビリティ

```jsx
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">確認</h2>
  {/* ... */}
</div>
```

現在の `Modal.jsx` は `role="dialog"` と `aria-modal="true"` が実装済み（CLAUDE.md §共有UIコンポーネント参照）。

### ESLint プラグイン

`eslint-plugin-jsx-a11y` で開発時に自動検出（既に導入済み）。

---

## 5. プロジェクト構成

### 現在の構成の評価

| 層                   | 場所                        | 評価                                |
| -------------------- | --------------------------- | ----------------------------------- |
| ドメインロジック     | `src/lib/`                  | ✅ 純粋関数に分離済み               |
| 永続化               | `src/storage/`              | ✅ 層として分離済み                 |
| UI コンポーネント    | `src/components/ui/`        | ✅ 共通 UI は分離済み               |
| ビュー               | `src/views/`                | ✅ 3画面に分離済み                  |
| ルートコンポーネント | `src/App.jsx`               | ⚠️ ~545行、handlers が密集          |
| 企業詳細ビュー       | `src/views/company-detail/` | ⚠️ ~812行、サブコンポーネントが内在 |

### 推奨改善方向（詳細は skill 参照）

```
src/
├── hooks/          # カスタムフック（useModal, usePlayers 等）
├── reducers/       # reducer を App.jsx から外部化
├── constants/      # 定数集約（APP_STORAGE_KEY, REVENUE_PRESETS 等）
└── views/company-detail/
    ├── CompanyDetailView.jsx
    ├── TrainCard.jsx           # 現在はインライン定義
    ├── RevenueStopEditor.jsx
    └── RevenueInput.jsx
```

### 定数の外部化

```javascript
// src/constants/app.js（例）
export const APP_STORAGE_KEY = 'trainRevenue_18xx_data';
export const APP_SCHEMA_VERSION = 3;
export const MAX_ORS = 5;
export const REVENUE_PRESET_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
```

---

## 6. localStorage 永続化

### 防御的なロード

```javascript
export function load() {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.schemaVersion !== APP_SCHEMA_VERSION) return migrate(data);
    return data;
  } catch {
    return null; // 破損データでもアプリが起動できるようにする
  }
}
```

### スキーマ Migration（段階的適用）

```javascript
function migrate(data) {
  let current = { ...data };
  let version = current.schemaVersion ?? 0;

  while (version < APP_SCHEMA_VERSION) {
    if (version === 1) current = migrateV1toV2(current);
    if (version === 2) current = migrateV2toV3(current);
    version++;
  }
  return current;
}
```

現在の実装: `src/storage/appStorage.js`（schemaVersion: 3）

### 保存頻度の最適化

状態変化のたびに localStorage を書き込む場合、debounce（300〜500ms）を検討する。

```javascript
const debouncedSave = useMemo(() => debounce((state) => save(state), 300), []);
```

### QuotaExceededError 対策

```javascript
export function save(state) {
  try {
    localStorage.setItem(
      APP_STORAGE_KEY,
      JSON.stringify({ ...state, schemaVersion: APP_SCHEMA_VERSION })
    );
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage 容量超過: 保存をスキップしました');
    }
  }
}
```

---

## 7. Vite ビルド設定

### GitHub Pages の base パス

`vite.config.js` の `base` と `package.json` の `homepage` が一致していること。

```javascript
// vite.config.js
export default defineConfig({
  base: '/train-revenue-calculator/',
  plugins: [react()],
});
```

### 初回起動の高速化（warmup）

```javascript
server: {
  warmup: {
    clientFiles: ['./src/main.jsx', './src/App.jsx'],
  },
},
```

### manualChunks でキャッシュ効率向上

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

### build.target

ブラウザ互換性と最新機能のバランスを確認する（現在のデフォルトは `'modules'`）。

---

## 8. ESLint / Prettier / Git フック

### 現在の設定

| ツール      | 設定ファイル                                                           |
| ----------- | ---------------------------------------------------------------------- |
| ESLint      | `.eslintrc.cjs`（react, react-hooks, jsx-a11y, prettier プラグイン）   |
| Prettier    | `.prettierrc.json`（singleQuote, trailingComma: es5, printWidth: 100） |
| Husky       | `.husky/pre-commit`（lint-staged 実行）                                |
| lint-staged | `package.json` の `lint-staged` セクション                             |

### lint-staged の設定

```json
"lint-staged": {
  "src/**/*.{js,jsx,css}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

### pre-push フック（任意追加）

```bash
# .husky/pre-push
npm test -- --run
```

push 前にテストを通過させることで CI 前にバグを検出できる。

---

## 9. GitHub Actions / CI・CD

### 現在のワークフロー

`.github/workflows/deploy-pages.yml`:

1. `npm ci`
2. `npm run build`
3. `./dist` を GitHub Pages へデプロイ

### 改善案: lint・test を追加

```yaml
- name: Lint
  run: npm run lint

- name: Test
  run: npm test

- name: Build
  run: npm run build
```

lint や test が失敗した場合は build・deploy を実行しない（品質ゲート）。

### concurrency 設定（既に設定済み）

```yaml
concurrency:
  group: pages
  cancel-in-progress: true
```

---

## 10. 改善優先度マトリクス

### 高優先度（影響大・コスト低〜中）

| #   | 項目                                     | 理由                   |
| --- | ---------------------------------------- | ---------------------- |
| 1   | CI に lint → test を追加                 | デプロイ前の品質ゲート |
| 2   | Reducer の副作用排除確認                 | Strict Mode バグ防止   |
| 3   | クリック可能な div/span を button に変更 | a11y 基本要件          |

### 中優先度（影響中・コスト中）

| #   | 項目                                | 理由                         |
| --- | ----------------------------------- | ---------------------------- |
| 4   | reducer を App.jsx から外部化       | テスト容易性・可読性         |
| 5   | hooks 抽出（useModal 等）           | App.jsx の肥大化解消         |
| 6   | constants 集約                      | マジックナンバー排除         |
| 7   | localStorage migration の段階適用化 | スキーマ変更の安全性         |
| 8   | Vite warmup / manualChunks          | 開発体験・本番パフォーマンス |

### 低優先度（影響大だがコスト高）

| #   | 項目                                       | 理由                   |
| --- | ------------------------------------------ | ---------------------- |
| 9   | CompanyDetailView のサブコンポーネント分割 | 大規模リファクタリング |
| 10  | TypeScript 移行                            | 長期移行コストが高い   |
| 11  | Error Boundary 追加                        | 安定動作中なら緊急度低 |

---

## 参考資料

- [React Docs - useReducer](https://react.dev/reference/react/useReducer)
- [Testing Library - クエリ優先順位](https://testing-library.com/docs/queries/about/#priority)
- [Vite 構成リファレンス](https://vite.dev/config/)
- [Tailwind CSS - Configuration](https://tailwindcss.com/docs/configuration)
- [GitHub Pages / Actions](https://docs.github.com/ja/pages)
