---
name: architecture-refactor-plan
description: src 構成の改善（hooks 抽出、constants 集約、reducer 外部化）を安全に進める計画手順
---

# architecture-refactor-plan

## 目的

- `src/App.jsx`（~545 行）の責務を整理し、可読性・保守性を上げる
- `CompanyDetailView.jsx`（~812 行）のサブコンポーネントを分離する
- テストが回帰を担保する状態で段階的にリファクタリングする

## 背景

→ 詳細: `docs/tech-stack-best-practices.md` § 5. プロジェクト構成

現在の問題:

- `App.jsx` がルーティング・状態管理・全ハンドラ・localStorage 同期を兼任
- `CompanyDetailView.jsx` に `TrainCard`, `RevenueStopEditor`, `RevenueInput` がインライン定義
- 定数（`APP_STORAGE_KEY`, `REVENUE_PRESETS` 等）が各ファイルに散在

## 前提

**リファクタリング前にテストが通ることを確認する:**

```bash
npm test  # 全24件が通ることを確認してから始める
```

段階的に行い、各ステップ後に `npm test` が通ることを確認する。

---

## 手順

### Phase 1: constants の集約（低リスク）

```bash
mkdir -p src/constants
```

`src/constants/app.js` を新規作成:

```javascript
// src/constants/app.js
export const APP_STORAGE_KEY = 'trainRevenue_18xx_data';
export const APP_SCHEMA_VERSION = 3;
export const MAX_ORS = 5;
export const REVENUE_PRESET_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
export const DEFAULT_NUM_ORS = 3;
```

各ファイルのハードコードされた値を import に置き換える。`npm test` を実行して確認。

---

### Phase 2: reducer の外部化（中リスク）

```bash
mkdir -p src/reducers
```

`src/App.jsx` の reducer 関数を `src/reducers/appReducer.js` へ移動:

```javascript
// src/reducers/appReducer.js
import { defaultState } from '../constants/app';

export function appReducer(state, action) {
  switch (action.type) {
    case 'PLAYER_SET_ALL':
      return { ...state, players: action.players };
    case 'COMPANY_SET_ALL':
      return { ...state, companies: action.companies };
    // ... 他の case
    default:
      return state;
  }
}
```

`src/App.jsx` で import に変更:

```javascript
import { appReducer } from './reducers/appReducer';
```

`npm test` を実行して確認。

---

### Phase 3: hooks の抽出（中リスク）

```bash
mkdir -p src/hooks
```

#### useModal

```javascript
// src/hooks/useModal.js
import { useState, useCallback } from 'react';

export function useModal() {
  const [modalMessage, setModalMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const openModal = useCallback((message, action) => {
    setModalMessage(message);
    setConfirmAction(() => action);
  }, []);

  const closeModal = useCallback(() => {
    setModalMessage('');
    setConfirmAction(null);
  }, []);

  return { modalMessage, confirmAction, openModal, closeModal };
}
```

`src/App.jsx` で `useModal` を使うように置き換える。`npm test` を実行して確認。

---

### Phase 4: CompanyDetailView のサブコンポーネント分割（高リスク）

`src/views/company-detail/` 内に個別ファイルを作成:

```
src/views/company-detail/
├── CompanyDetailView.jsx   # メインコンテナのみ
├── TrainCard.jsx           # インライン定義から独立
├── RevenueStopEditor.jsx   # インライン定義から独立
└── RevenueInput.jsx        # インライン定義から独立
```

**注意:** このフェーズは影響範囲が大きい。各コンポーネントを1つずつ切り出し、`npm test` で確認しながら進める。

---

## 確認コマンド（各フェーズ後に実行）

```bash
npm test        # 全テストを通す
npm run lint    # ESLint チェック
npm run build   # ビルド確認
```

## 完了条件

- [ ] Phase 1: `src/constants/app.js` が作成され、マジックナンバーが集約されている
- [ ] Phase 2: `src/reducers/appReducer.js` が存在し、テストが通る
- [ ] Phase 3: `src/hooks/useModal.js` 等が存在し、App.jsx がスリムになっている
- [ ] Phase 4:（任意）CompanyDetailView のサブコンポーネントが分離されている
- [ ] 全フェーズで `npm test` 全件通過

## 注意

- **一度に全部変えない**。1フェーズずつ、テストで確認しながら進める
- ファイル移動は IDE のリファクタリング機能（または Git mv）を使うと import パスの更新が楽になる
- props drilling が深い場合は React Context を検討する前に、まず hooks で整理する
