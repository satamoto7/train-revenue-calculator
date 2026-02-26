---
name: storage-persistence-migrations
description: localStorage 永続化とスキーマバージョン管理（load/save 防御、段階マイグレーション、容量超過対応）
---

# storage-persistence-migrations

## 目的

- 永続化の安全性（破損データ耐性）を確保する
- スキーマ追加・変更時に既存データを安全に移行する

## 背景

→ 詳細: `docs/tech-stack-best-practices.md` § 6. localStorage 永続化

現在の実装:

- `src/storage/appStorage.js`
- localStorage キー: `trainRevenue_18xx_data`
- 現在のスキーマバージョン: `APP_SCHEMA_VERSION = 3`
- `load()` / `save()` / `migrate()` が定義済み

## 手順

### 1. load() の防御確認

```javascript
// src/storage/appStorage.js を開いて確認
```

以下がすべて含まれているか確認する:

- `try/catch` で JSON.parse の失敗をキャッチしている
- `schemaVersion` が一致しない場合に `migrate()` を呼ぶ（または `null` を返す）
- `null` を返した場合、呼び出し元がデフォルト状態にフォールバックしている

```javascript
export function load() {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // バージョン一致するならそのまま返す
    if (data.schemaVersion === APP_SCHEMA_VERSION) return data;
    // 旧バージョンなら migrate
    return migrate(data);
  } catch {
    return null; // 破損データ → デフォルト状態で起動
  }
}
```

### 2. migrate() の段階的適用確認

現在の実装が「現在のバージョンに直接ジャンプ」している場合は、段階的適用（while ループ）に変更する。

```javascript
function migrate(data) {
  let current = { ...data };
  let version = current.schemaVersion ?? 0;

  while (version < APP_SCHEMA_VERSION) {
    if (version === 1) current = migrateV1toV2(current);
    if (version === 2) current = migrateV2toV3(current);
    version++;
    current.schemaVersion = version;
  }
  return current;
}
```

各 `migrateVxtoVy` 関数は純粋関数（引数を変更せず、新しいオブジェクトを返す）。

### 3. save() の QuotaExceededError 対応

```javascript
export function save(state) {
  try {
    const data = {
      schemaVersion: APP_SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
      ...state,
    };
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('[appStorage] 容量超過: 保存をスキップしました');
    } else {
      console.error('[appStorage] 保存エラー:', e);
    }
  }
}
```

### 4. スキーマバージョンを上げる手順（新フィールド追加時）

1. `APP_SCHEMA_VERSION` を `4` に更新する
2. `migrateV3toV4(data)` 関数を追加する（既存データに新フィールドのデフォルト値を付与）
3. `migrate()` の while ループに `if (version === 3) current = migrateV3toV4(current);` を追加
4. `src/storage/appStorage.test.js` に旧バージョンデータでの migrate テストを追加する

### 5. テストの充実

```javascript
// src/storage/appStorage.test.js に追加する例
test('破損した JSON でも load() が null を返す', () => {
  localStorage.setItem('trainRevenue_18xx_data', '{ invalid json');
  expect(load()).toBeNull();
});

test('schemaVersion=1 のデータが現在のバージョンに migrate される', () => {
  localStorage.setItem(
    'trainRevenue_18xx_data',
    JSON.stringify({
      schemaVersion: 1,
      players: [],
      companies: [],
    })
  );
  const result = load();
  expect(result.schemaVersion).toBe(APP_SCHEMA_VERSION);
});
```

## 完了条件

- [ ] 破損データ（JSON パース失敗）でもアプリが起動する（load() が null を返す）
- [ ] `schemaVersion` が古いデータが最新スキーマに段階的に migrate される
- [ ] QuotaExceededError が発生しても例外でアプリがクラッシュしない
- [ ] `npm test` が全件通る（appStorage.test.js 含む）

## 注意

- migrate 後のデータは即 save() して次回起動で再 migrate を避ける
- `lastUpdated` タイムスタンプは save() 内で付与する（reducer 内で Date を使わない）
