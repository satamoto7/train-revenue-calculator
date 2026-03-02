param(
  [Parameter(Position = 0)]
  [ValidateSet('list', 'create', 'prune', 'remove', 'path', 'help')]
  [string]$Command = 'list',

  [string]$Name,
  [string]$Branch,
  [string]$Path,
  [string]$Base = 'main',
  [switch]$ShowStatus,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Get-RepoRoot {
  $root = git rev-parse --show-toplevel
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($root)) {
    throw 'Not inside a git repository.'
  }

  return $root.Trim()
}

function Get-RepoName {
  $root = Get-RepoRoot
  return Split-Path -Leaf $root
}

function Get-WorktreeRoot {
  if (-not [string]::IsNullOrWhiteSpace($env:CODEX_WORKTREE_ROOT)) {
    return $env:CODEX_WORKTREE_ROOT
  }

  return Join-Path $env:USERPROFILE '.codex\worktrees'
}

function Get-Worktrees {
  $lines = git worktree list --porcelain
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to read worktree list.'
  }

  $items = @()
  $current = @{}

  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      if ($current.Count -gt 0) {
        $items += [pscustomobject]@{
          Path      = $current['worktree']
          Head      = $current['HEAD']
          BranchRef = if ($current.ContainsKey('branch')) { $current['branch'] } else { $null }
          Branch    = if ($current.ContainsKey('branch')) {
            $current['branch'] -replace '^refs/heads/', ''
          } else {
            $null
          }
          Detached  = $current.ContainsKey('detached')
          Prunable  = $current.ContainsKey('prunable')
        }
      }
      $current = @{}
      continue
    }

    $parts = $line.Split(' ', 2)
    $key = $parts[0]
    $value = if ($parts.Count -gt 1) { $parts[1] } else { $true }
    $current[$key] = $value
  }

  if ($current.Count -gt 0) {
    $items += [pscustomobject]@{
      Path      = $current['worktree']
      Head      = $current['HEAD']
      BranchRef = if ($current.ContainsKey('branch')) { $current['branch'] } else { $null }
      Branch    = if ($current.ContainsKey('branch')) {
        $current['branch'] -replace '^refs/heads/', ''
      } else {
        $null
      }
      Detached  = $current.ContainsKey('detached')
      Prunable  = $current.ContainsKey('prunable')
    }
  }

  return $items
}

function Get-BranchName {
  if (-not [string]::IsNullOrWhiteSpace($Branch)) {
    return $Branch
  }

  if ([string]::IsNullOrWhiteSpace($Name)) {
    throw 'Specify -Name or -Branch.'
  }

  if ($Name -like '*/*') {
    return $Name
  }

  return "codex/$Name"
}

function Get-WorktreePath {
  if (-not [string]::IsNullOrWhiteSpace($Path)) {
    return $Path
  }

  $branchName = Get-BranchName
  $slug = ($branchName -replace '^codex/', '') -replace '[\\/:\s]+', '-'
  $repoName = Get-RepoName
  return Join-Path (Join-Path (Get-WorktreeRoot) $slug) $repoName
}

function Test-LocalBranch {
  param([string]$BranchName)
  & git show-ref --verify --quiet "refs/heads/$BranchName"
  return $LASTEXITCODE -eq 0
}

function Test-RemoteBranch {
  param([string]$BranchName)
  & git show-ref --verify --quiet "refs/remotes/origin/$BranchName"
  return $LASTEXITCODE -eq 0
}

function Resolve-Worktree {
  $worktrees = Get-Worktrees

  if (-not [string]::IsNullOrWhiteSpace($Path)) {
    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    return $worktrees | Where-Object {
      [System.IO.Path]::GetFullPath($_.Path) -eq $resolvedPath
    } | Select-Object -First 1
  }

  if (-not [string]::IsNullOrWhiteSpace($Branch)) {
    return $worktrees | Where-Object { $_.Branch -eq $Branch } | Select-Object -First 1
  }

  if (-not [string]::IsNullOrWhiteSpace($Name)) {
    $branchName = Get-BranchName
    return $worktrees | Where-Object { $_.Branch -eq $branchName } | Select-Object -First 1
  }

  throw 'Specify -Path, -Branch, or -Name.'
}

function Show-Worktrees {
  $worktrees = Get-Worktrees

  foreach ($item in $worktrees) {
    $branchLabel = if ($item.Branch) { $item.Branch } else { 'DETACHED' }
    $flags = @()
    if ($item.Prunable) { $flags += 'prunable' }
    if ($item.Detached) { $flags += 'detached' }
    $suffix = if ($flags.Count -gt 0) { " [$($flags -join ', ')]" } else { '' }
    Write-Output "$branchLabel`t$($item.Path)$suffix"

    if ($ShowStatus -and (Test-Path $item.Path)) {
      $status = git -C $item.Path status --short --branch
      if ($LASTEXITCODE -ne 0) {
        throw "Failed to read status for $($item.Path)"
      }
      foreach ($line in $status) {
        Write-Output "  $line"
      }
    }
  }
}

function New-Worktree {
  $branchName = Get-BranchName
  $targetPath = Get-WorktreePath

  if (Test-Path $targetPath) {
    throw "Target path already exists: $targetPath"
  }

  $parent = Split-Path -Parent $targetPath
  if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  if (Test-LocalBranch $branchName) {
    Invoke-Git -Arguments @('worktree', 'add', $targetPath, $branchName)
  } elseif (Test-RemoteBranch $branchName) {
    Invoke-Git -Arguments @('worktree', 'add', '--track', '-b', $branchName, $targetPath, "origin/$branchName")
  } else {
    Invoke-Git -Arguments @('worktree', 'add', '-b', $branchName, $targetPath, $Base)
  }

  Write-Output "Created $branchName at $targetPath"
}

function Remove-Worktree {
  $item = Resolve-Worktree
  if (-not $item) {
    throw 'Matching worktree was not found.'
  }

  if (-not $Force -and (Test-Path $item.Path)) {
    $status = git -C $item.Path status --porcelain
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to inspect worktree status for $($item.Path)"
    }
    if ($status.Count -gt 0) {
      throw "Worktree has uncommitted changes: $($item.Path). Re-run with -Force if you intend to discard them."
    }
  }

  $args = @('worktree', 'remove')
  if ($Force) {
    $args += '--force'
  }
  $args += $item.Path

  Invoke-Git -Arguments $args
  Write-Output "Removed $($item.Path)"
}

function Show-Path {
  Write-Output (Get-WorktreePath)
}

function Show-Help {
  @'
Usage:
  ./scripts/git-worktree.ps1 list [-ShowStatus]
  ./scripts/git-worktree.ps1 create -Name <task> [-Base main] [-Path <path>]
  ./scripts/git-worktree.ps1 remove (-Name <task> | -Branch <branch> | -Path <path>) [-Force]
  ./scripts/git-worktree.ps1 prune
  ./scripts/git-worktree.ps1 path -Name <task>

Notes:
  -Name fix-auth resolves to branch codex/fix-auth by default.
  The default root is $env:USERPROFILE\.codex\worktrees unless CODEX_WORKTREE_ROOT is set.
'@ | Write-Output
}

switch ($Command) {
  'list' { Show-Worktrees }
  'create' { New-Worktree }
  'remove' { Remove-Worktree }
  'prune' { Invoke-Git -Arguments @('worktree', 'prune', '--verbose') }
  'path' { Show-Path }
  'help' { Show-Help }
  default { throw "Unsupported command: $Command" }
}
