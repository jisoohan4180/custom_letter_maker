Set-StrictMode -Version Latest

function Format-BashArgument {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $escaped = $Value.Replace("'", "'`"'`"'")
  return "'" + $escaped + "'"
}

function Convert-WindowsPathToGitBashPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $resolved = (Resolve-Path -LiteralPath $Path).Path
  if ($resolved -match '^([A-Za-z]):\\(.*)$') {
    $drive = $Matches[1].ToLowerInvariant()
    $rest = ($Matches[2] -replace '\\', '/')
    return "/$drive/$rest"
  }

  return ($resolved -replace '\\', '/')
}

function Get-BashFlavor {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BashPath
  )

  $uname = & $BashPath -lc "uname -s" 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($uname)) { return "unknown" }

  $uname = $uname.Trim()
  if ($uname -match '^Linux$') { return "wsl" }
  if ($uname -match 'MINGW|MSYS|CYGWIN') { return "git-bash" }

  return "unknown"
}

function Get-RepoRootForBash {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BashPath,
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $bashFlavor = Get-BashFlavor -BashPath $BashPath
  switch ($bashFlavor) {
    "wsl" {
      $repoRootUnix = & $BashPath -lc "wslpath -a $(Format-BashArgument -Value $RepoRoot)" 2>$null
      if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($repoRootUnix)) {
        return $repoRootUnix.Trim()
      }
      throw "WSL bash는 감지됐지만 repo 경로를 변환하지 못했습니다."
    }
    "git-bash" {
      return Convert-WindowsPathToGitBashPath -Path $RepoRoot
    }
    default {
      throw "지원되지 않는 bash 환경입니다. Git Bash 또는 WSL bash를 사용하세요."
    }
  }
}

function Find-GitBashExecutable {
  $candidates = @(
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files (x86)\Git\bin\bash.exe",
    "$env:ProgramFiles\Git\bin\bash.exe",
    "${env:ProgramFiles(x86)}\Git\bin\bash.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
  )

  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    if (Test-Path $candidate -PathType Leaf) { return $candidate }
  }

  $bashCmd = Get-Command bash -ErrorAction SilentlyContinue
  if ($bashCmd -and $bashCmd.Source -match '\\Git\\(usr\\)?bin\\bash\.exe$') {
    return $bashCmd.Source
  }

  return $null
}

function Invoke-HarnessBashScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptName,
    [string[]]$ScriptArguments = @(),
    [switch]$AllowWsl
  )

  $repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

  $allowWslEnv = $env:HAENSS_ALLOW_WSL -eq "1"
  $allowWsl = $AllowWsl.IsPresent -or $allowWslEnv

  $bashPath = Find-GitBashExecutable

  if (-not $bashPath) {
    if ($allowWsl) {
      $bashCmd = Get-Command bash -ErrorAction SilentlyContinue
      if ($bashCmd) { $bashPath = $bashCmd.Source }
    }
  }

  if (-not $bashPath) {
    $msg = @(
      "Git Bash를 찾을 수 없습니다.",
      "",
      "Windows에서는 Git for Windows(Git Bash 포함)를 설치하세요:",
      "  https://git-scm.com/download/win",
      "",
      "WSL을 사용해야 한다면 (권장하지 않음):",
      "  PowerShell:    `$env:HAENSS_ALLOW_WSL='1'; ./scripts/validate.ps1",
      "  영구 설정:     [Environment]::SetEnvironmentVariable('HAENSS_ALLOW_WSL','1','User')"
    ) -join "`n"
    throw $msg
  }

  $flavor = Get-BashFlavor -BashPath $bashPath
  if ($flavor -eq "wsl" -and -not $allowWsl) {
    throw "PATH의 'bash'가 WSL로 감지되었지만 HAENSS_ALLOW_WSL=1이 아닙니다."
  }

  if ($flavor -eq "wsl") {
    Write-Warning "WSL bash를 사용 중 (HAENSS_ALLOW_WSL=1). Docker 연동 이슈 가능."
  }

  $repoRootForBash = Get-RepoRootForBash -BashPath $bashPath -RepoRoot $repoRoot
  $escapedArgs = @($ScriptArguments | ForEach-Object { Format-BashArgument -Value $_ })

  $bashCommand = "cd $(Format-BashArgument -Value $repoRootForBash) && ./scripts/$ScriptName"
  if ($escapedArgs.Count -gt 0) {
    $bashCommand += " " + ($escapedArgs -join " ")
  }

  & $bashPath -lc $bashCommand
  exit $LASTEXITCODE
}
