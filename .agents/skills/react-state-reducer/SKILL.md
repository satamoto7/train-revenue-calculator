---
name: react-state-reducer
description: useReducer 中心の状態管理を整理する（純粋性・action 設計・initializer・reducer 分割・肥大化対策）
---

# react-state-reducer

## 目的

- `src/App.jsx` の reducer を純粋関数として整理する
- action の粒度を見直し、Strict Mode で安全に動作させる
- 肥大化した場合は feature 別 reducer に分割する

## 背景

→ 詳細: `docs/tech-stack-best-practices.md` § 1. React 18 状態管理

現在の状態管理:

- `src/App.jsx` に `useReducer` が存在（actions: `PLAYER_SET_ALL`, `COMPANY_SET_ALL`, `COMPANY_SELECT`, `OR_SET_NUM`, `VIEW_SET`, `APP_LOAD`）
- localStorage の save は `useEffect` 経由（正しいパターン）
- React 18 Strict Mode が有効（`src/main.jsx`）

## 手順

### 1. 副作用の検出と排除

```bash
# reducer 内の副作用呼び出しを検索
grep -n "localStorage\|fetch\|Date\.\|Math\.random\|console\." src/App.jsx
```

reducer の `switch` ブロック内に副作用がある場合は `useEffect` または呼び出し元ハンドラへ移動する。

```javascript
// ❌ 悪い例
case 'PLAYER_SET_ALL':
  localStorage.setItem('data', JSON.stringify(action.players)); // ← 副作用
  return { ...state, players: action.players };

// ✅ 良い例（副作用は useEffect に）
case 'PLAYER_SET_ALL':
  return { ...state, players: action.players };
// ...
useEffect(() => { save(state); }, [state]);
```

### 2. action 粒度の確認

- 1 ユーザー操作 = 1 action を基本とする
- OR/ゲーム全体のリセットなど、複数状態をまとめてリセットする action は統合してよい

### 3. 初期化の最適化

localStorage からの読み込みが毎レンダリングで走っていないか確認する。

```javascript
// ✅ 正しいパターン（init 関数を第3引数に渡す）
function initState(_) {
  const saved = load();
  return saved ?? defaultState;
}
const [state, dispatch] = useReducer(reducer, null, initState);
```

### 4. reducer の外部化（state が増えた場合）

```bash
mkdir -p src/reducers
```

`src/App.jsx` の reducer 関数を `src/reducers/appReducer.js` へ移動し、import する。

```javascript
// src/reducers/appReducer.js
export function appReducer(state, action) {
  switch (
    action.type
    // ...
  ) {
  }
}
```

### 5. reducer 単体テストの追加

```javascript
// src/reducers/appReducer.test.js
import { appReducer } from './appReducer';

test('PLAYER_SET_ALL でプレイヤーリストが更新される', () => {
  const state = { players: [], companies: [] };
  const players = [{ id: '1', name: 'P1' }];
  const next = appReducer(state, { type: 'PLAYER_SET_ALL', players });
  expect(next.players).toEqual(players);
  expect(next.companies).toEqual([]); // 他の state は変わらない
});
```

## 完了条件

- [ ] reducer 内に副作用呼び出しがない（localStorage / Date / fetch 等）
- [ ] 各 action がユーザー操作の単位に対応している
- [ ] `useReducer(reducer, null, init)` で初期化している（または同等のロジック）
- [ ] reducer を外部化した場合、既存テスト（`npm test`）が全件通る

## 注意

- Strict Mode での二重実行を常に前提にする
- `useCallback` でメモ化したハンドラが `dispatch` を呼ぶ形は問題ない
- Context API や Redux への移行は現状不要（useReducer で十分な規模）
