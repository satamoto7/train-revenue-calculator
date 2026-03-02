# Codex と使う `git worktree` 運用

このリポジトリでは、`main` を母艦 worktree、作業単位を `codex/*` ブランチの個別 worktree に分ける運用が安全です。Codex と並行作業するときも、この分離を崩さないのが基本です。

## ルール

- `D:\My Document\ボドゲ関係\train-revenue-calculator` は `main` 専用にする
- 日常作業は `codex/<task>` ブランチの専用 worktree で行う
- 1 タスク = 1 ブランチ = 1 worktree を守る
- detached HEAD の worktree は編集用途に使わない
- 作業後は `git worktree remove` と `git worktree prune` で残骸を残さない
- Codex へ依頼するときは「どの worktree を使うか」を最初に明示する

## まずやること

```powershell
git switch main
git fetch origin
git pull --ff-only
```

## 追加した補助スクリプト

`scripts/git-worktree.ps1` を追加しています。PowerShell から直接使うか、`npm run worktree -- ...` で呼べます。

### よく使う例

```powershell
# 一覧
./scripts/git-worktree.ps1 list -ShowStatus

# codex/fix-lobby を作る
./scripts/git-worktree.ps1 create -Name fix-lobby

# どこに作られるかだけ確認
./scripts/git-worktree.ps1 path -Name fix-lobby

# missing な管理情報を掃除
./scripts/git-worktree.ps1 prune

# 完了した worktree を branch 名で消す
./scripts/git-worktree.ps1 remove -Branch codex/fix-lobby
```

`-Name fix-lobby` は自動的に `codex/fix-lobby` に解決されます。既存のローカルブランチがあればそれを使い、なければ `main` から新規作成します。`origin/codex/...` だけ存在する場合は tracking branch として作成します。

## PowerShell 関数案

PowerShell プロファイルに入れるなら、この程度で十分です。

```powershell
$repo = 'D:\My Document\ボドゲ関係\train-revenue-calculator'
$wt = Join-Path $repo 'scripts\git-worktree.ps1'

function wt-list {
  Push-Location $repo
  try {
    & $wt list -ShowStatus
  } finally {
    Pop-Location
  }
}

function wt-new {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  Push-Location $repo
  try {
    & $wt create -Name $Name
  } finally {
    Pop-Location
  }
}

function wt-drop {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Branch
  )

  Push-Location $repo
  try {
    & $wt remove -Branch $Branch
  } finally {
    Pop-Location
  }
}

function wt-prune {
  Push-Location $repo
  try {
    & $wt prune
  } finally {
    Pop-Location
  }
}
```

## 掃除の判断基準

- `git worktree list` に `prunable` が出ている: `prune` で掃除してよい
- ディレクトリが消えていて管理情報だけ残っている: `prune` で掃除してよい
- detached HEAD だがディレクトリは存在する: 先に `git -C <path> log --oneline -n 5` で意味のある退避先か確認する
- uncommitted changes がある: まず commit / stash / 破棄の判断をする

## Codex と並行運用するときの型

1. `main` を最新化する
2. `./scripts/git-worktree.ps1 create -Name <task>` で作業 worktree を作る
3. その worktree を `cwd` にして Codex に依頼する
4. テスト・レビュー後に push / merge する
5. 不要になったら `remove` と `prune` を実行する

この型に寄せると、会話ごとに作業対象が固定され、`main` と並行タスクの混線をかなり減らせます。
