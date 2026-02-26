---
name: lint-format-git-hooks
description: ESLint / Prettier と Husky / lint-staged で品質ゲートを作る（pre-commit / pre-push）
---

# lint-format-git-hooks

## 目的

- commit 時に自動で lint + format を実行し、壊れたコードをコミットさせない
- push 前にテストを通過させる（任意）

## 背景

→ 詳細: `docs/tech-stack-best-practices.md` § 8. ESLint / Prettier / Git フック

現在の設定:

- ESLint: `.eslintrc.cjs`（react, react-hooks, jsx-a11y, prettier プラグイン）
- Prettier: `.prettierrc.json`（singleQuote: true, trailingComma: "es5", printWidth: 100）
- Husky 9: `.husky/pre-commit`（`npx lint-staged` を実行）
- lint-staged: `package.json` の `"lint-staged"` セクション

## 現在の lint-staged 設定確認

```json
// package.json
"lint-staged": {
  "src/**/*.{js,jsx,css}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

## 手順

### 1. 動作確認

```bash
# lint が通るか確認
npm run lint

# format チェック
npm run format:check

# 手動で lint-staged を実行（ステージ済みファイルに対して）
npx lint-staged
```

### 2. Husky の pre-commit フック確認

```bash
cat .husky/pre-commit
# "npx lint-staged" が含まれていれば OK
```

フックが機能しているか確認:

```bash
git add src/App.jsx
git commit -m "test: hook check"
# ESLint / Prettier が自動実行されることを確認
```

### 3. lint-staged の対象を更新（docs/ 等を追加する場合）

```json
"lint-staged": {
  "src/**/*.{js,jsx,css}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"],
  "docs/**/*.md": ["prettier --write"]
}
```

### 4. pre-push フックの追加（任意）

push 前にテストを実行し、壊れた状態のコードを push させない。

```bash
# .husky/pre-push を作成
echo "npm test" > .husky/pre-push
chmod +x .husky/pre-push
```

**注意:** テスト時間が長い場合は開発体験が悪化するため、テストは CI に任せて pre-push は省略してもよい。

### 5. Prettier + Tailwind ソートプラグイン（任意）

```bash
npm install -D prettier-plugin-tailwindcss
```

```json
// .prettierrc.json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Tailwind クラスの順序が自動整理されるようになる。

## 完了条件

- [ ] `npm run lint` がエラーなしで通る
- [ ] `npm run format:check` がエラーなしで通る
- [ ] commit 時に lint + format が自動実行される（Husky + lint-staged）
- [ ] （任意）push 時にテストが自動実行される

## 注意

- `package.json` の `"prepare": "husky"` が設定されていないと `npm ci` 後に husky が初期化されない
- Windows 環境での Husky: `.husky/pre-commit` に実行権限が必要（Git for Windows の場合は自動付与）
- lint-staged は**ステージ済みのファイルのみ**に実行される（全チェックは `npm run lint` で行う）
