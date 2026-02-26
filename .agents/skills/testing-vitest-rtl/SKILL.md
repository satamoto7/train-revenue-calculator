---
name: testing-vitest-rtl
description: Vitest + Testing Library でのテスト整備（setup、ユーザー視点クエリ、userEvent、reducer 単体テスト）
---

# testing-vitest-rtl

## 目的

- 既存テストの品質を上げる（クエリ優先順位、userEvent）
- 主要ユーザーフローの回帰テストを充実させる
- ドメインロジック・reducer の単体テストを追加する

## 背景

→ 詳細: `docs/tech-stack-best-practices.md` § 3. Vitest / React Testing Library

現在のテスト:

- `src/App.test.jsx` — 11件（初期表示・ナビ・CRUD・localStorage・a11y）
- `src/lib/calc.test.js` — 10件（純粋関数）
- `src/storage/appStorage.test.js` — 3件（save/load/migrate）
- 合計 24件、全件通過

```bash
npm test   # 単発実行
npm run test:watch  # ウォッチモード（開発時）
```

## 手順

### 1. setup の確認

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

不足している場合は追加する。

### 2. クエリ優先順位の見直し

既存テストで `getByTestId` や低優先クエリを使っている箇所を確認する。

```bash
grep -n "getByTestId\|queryByTestId" src/App.test.jsx
```

**推奨クエリ優先順位（高い順）:**

1. `getByRole('button', { name: 'ボタン名' })` — ボタン・入力・見出し
2. `getByLabelText('ラベル')` — フォーム要素
3. `getByPlaceholderText` `getByText`
4. `getByTestId` — 最後の手段

### 3. userEvent への移行

```javascript
// ❌ fireEvent を使っている箇所
fireEvent.click(button);
fireEvent.change(input, { target: { value: '100' } });

// ✅ userEvent に変更
const user = userEvent.setup();
await user.click(button);
await user.type(input, '100');
```

### 4. テストケースの充実（優先順）

#### 4-a. 削除確認モーダルのフロー

```javascript
test('プレイヤー削除でモーダルが表示され、確認で削除される', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByText('全般管理'));
  // プレイヤーを追加してから削除ボタンをクリック...
  // モーダルの確認ボタンをクリック...
  // プレイヤーが表示されなくなることを確認
});
```

#### 4-b. OR 収益入力と合計

```javascript
test('OR1 収益を入力するとサマリーに反映される', async () => {
  // ...
});
```

#### 4-c. localStorage 破損時のフォールバック

```javascript
test('localStorage に不正な JSON があってもアプリが起動する', () => {
  localStorage.setItem('trainRevenue_18xx_data', 'invalid');
  render(<App />);
  expect(screen.getByText('サマリー')).toBeInTheDocument();
});
```

### 5. reducer 単体テストの追加

reducer を外部化した場合（`src/reducers/appReducer.js`）にテストを追加する。

```javascript
// src/reducers/appReducer.test.js
import { appReducer } from './appReducer';

const initialState = { players: [], companies: [], currentView: 'summary', numORs: 3 };

test('PLAYER_SET_ALL でプレイヤーが更新される', () => {
  const players = [{ id: '1', name: 'P1' }];
  const next = appReducer(initialState, { type: 'PLAYER_SET_ALL', players });
  expect(next.players).toEqual(players);
});
```

## 完了条件

- [ ] `npm test` で全件通る（既存 24 件 + 追加分）
- [ ] 主要ユーザーフロー（追加・削除・収益入力）に回帰テストがある
- [ ] `getByTestId` の不要な使用が解消されている
- [ ] `fireEvent` が `userEvent` に置き換えられている（または意図的に残している理由がある）

## 注意

- テストは `beforeEach(() => { localStorage.clear(); })` で localStorage をリセットする
- `crypto.randomUUID` は jsdom 環境で利用可能（Node 19+）
- `vi.mock` で外部モジュールをモックする際は `vi.resetAllMocks()` を `afterEach` で実行する
