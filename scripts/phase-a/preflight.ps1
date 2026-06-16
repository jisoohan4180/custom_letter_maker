param(
  [Parameter(Mandatory = $true)]
  [int]$Epic
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "../lib/git-utils.ps1")

Repair-HarnessWindowsEnvironment

function Stop-Setup2 {
  Write-Host "Complete README.md Setup 2 first."
  exit 1
}

$repoRootResult = Invoke-HarnessGit -Arguments @("rev-parse", "--show-toplevel")
if ($repoRootResult.ExitCode -ne 0 -or -not $repoRootResult.Output) { Stop-Setup2 }
Set-Location ((($repoRootResult.Output | Select-Object -First 1) -as [string]).Trim())

$branchResult = Invoke-HarnessGit -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
if ($branchResult.ExitCode -ne 0 -or -not $branchResult.Output) { Stop-Setup2 }
$branch = ((($branchResult.Output | Select-Object -First 1) -as [string]).Trim())
if ($branch -notin @("main", "develop")) { Stop-Setup2 }

$developResult = Invoke-HarnessGit -Arguments @("rev-parse", "--verify", "develop")
if ($developResult.ExitCode -ne 0) { Stop-Setup2 }

$originResult = Invoke-HarnessGit -Arguments @("remote", "get-url", "origin")
if ($originResult.ExitCode -ne 0) { Stop-Setup2 }

$remoteDevelop = Test-HarnessGitHubRemoteRef -Ref "develop"
if (-not $remoteDevelop.Ok) { Stop-Setup2 }

if (-not (Test-Path -LiteralPath ".agents/skills/bmad-create-story")) { Stop-Setup2 }
if (-not (Test-Path -LiteralPath ".agents/skills/bmad-dev-story")) { Stop-Setup2 }

$epicsPath = "_bmad-output/planning-artifacts/epics.md"
if (-not (Test-Path -LiteralPath $epicsPath -PathType Leaf)) { Stop-Setup2 }
$epics = Get-Content -LiteralPath $epicsPath -Raw
if ($epics -notmatch "(?m)^#{1,6}\s*Epic\s+$Epic\b|Epic\s+$Epic\s*:") { Stop-Setup2 }

if (-not (Test-Path -LiteralPath "_bmad-output/implementation-artifacts/sprint-status.yaml" -PathType Leaf)) { Stop-Setup2 }

Write-Host "Loop A preflight passed for Epic $Epic"
exit 0
