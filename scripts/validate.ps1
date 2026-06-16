param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ScriptArgs = @()
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib/validate-utils.ps1")
. (Join-Path $PSScriptRoot "lib/package-runner.ps1")
. (Join-Path $PSScriptRoot "lib/git-utils.ps1")

Repair-HarnessWindowsEnvironment
Set-Location (Get-HarnessRepoRoot)

$from = ""
if ($ScriptArgs.Count -gt 0) {
  if ($ScriptArgs[0] -match '^--from=(typecheck|lint|test|build|security)$') {
    $from = $Matches[1]
  } else {
    Write-Error "Unknown option: $($ScriptArgs[0])`nUsage: ./scripts/validate.ps1 [--from=typecheck|lint|test|build|security]"
    exit 1
  }
}

$skipInstall = $false
$skipTypecheck = $false
$skipLint = $false
$skipTest = $false
$skipBuild = $false

switch ($from) {
  "typecheck" { $skipInstall = $true }
  "lint" { $skipInstall = $true; $skipTypecheck = $true }
  "test" { $skipInstall = $true; $skipTypecheck = $true; $skipLint = $true }
  "build" { $skipInstall = $true; $skipTypecheck = $true; $skipLint = $true; $skipTest = $true }
  "security" { $skipInstall = $true; $skipTypecheck = $true; $skipLint = $true; $skipTest = $true; $skipBuild = $true }
}

try {
  Initialize-HarnessValidation -RunType "epic"

  if (-not [string]::IsNullOrWhiteSpace($from)) {
    Write-Host " Resuming from: $from"
    Write-Host ""
  }

  $hasPackageJson = Test-HarnessPackageJson

  if ($skipInstall) {
    Invoke-HarnessStepSkip -StepNumber "01" -StepName "install" -Reason "--from"
  } elseif (-not $hasPackageJson) {
    Invoke-HarnessStepSkip -StepNumber "01" -StepName "install" -Reason "no package.json (template state)"
  } else {
    Invoke-HarnessStep -StepNumber "01" -StepName "install" -Command (Get-HarnessInstallCommand)
  }

  if ($skipTypecheck) {
    Invoke-HarnessStepSkip -StepNumber "02" -StepName "typecheck" -Reason "--from"
  } elseif (-not $hasPackageJson) {
    Invoke-HarnessStepSkip -StepNumber "02" -StepName "typecheck" -Reason "no package.json (template state)"
  } else {
    $typecheck = Get-HarnessScriptCommand -ScriptName "typecheck" -OverrideEnvName "HARNESS_TYPECHECK_CMD"
    if ([string]::IsNullOrWhiteSpace($typecheck)) {
      Invoke-HarnessStepSkip -StepNumber "02" -StepName "typecheck" -Reason "no typecheck script"
    } else {
      Invoke-HarnessStep -StepNumber "02" -StepName "typecheck" -Command $typecheck
    }
  }

  if ($skipLint) {
    Invoke-HarnessStepSkip -StepNumber "03" -StepName "lint" -Reason "--from"
  } elseif (-not $hasPackageJson) {
    Invoke-HarnessStepSkip -StepNumber "03" -StepName "lint" -Reason "no package.json (template state)"
  } else {
    $lint = Get-HarnessScriptCommand -ScriptName "lint" -OverrideEnvName "HARNESS_LINT_CMD"
    if ([string]::IsNullOrWhiteSpace($lint)) {
      Invoke-HarnessStepSkip -StepNumber "03" -StepName "lint" -Reason "no lint script"
    } else {
      Invoke-HarnessStep -StepNumber "03" -StepName "lint" -Command $lint
    }
  }

  if ($skipTest) {
    Invoke-HarnessStepSkip -StepNumber "04a" -StepName "test" -Reason "--from"
    Invoke-HarnessStepSkip -StepNumber "04b" -StepName "regression-test" -Reason "--from"
  } elseif (-not $hasPackageJson) {
    Invoke-HarnessStepSkip -StepNumber "04a" -StepName "test" -Reason "no package.json (template state)"
    Invoke-HarnessStepSkip -StepNumber "04b" -StepName "regression-test" -Reason "no package.json (template state)"
  } else {
    $test = Get-HarnessTestCommand
    if ([string]::IsNullOrWhiteSpace($test)) {
      Invoke-HarnessStepSkip -StepNumber "04a" -StepName "test" -Reason "no test script"
    } else {
      Invoke-HarnessStep -StepNumber "04a" -StepName "test" -Command $test
    }

    $regressionFiles = @()
    if (Test-Path -LiteralPath "tests/regression") {
      $regressionFiles = @(Get-ChildItem -LiteralPath "tests/regression" -Recurse -File -ErrorAction SilentlyContinue)
    }

    if ($regressionFiles.Count -eq 0) {
      Invoke-HarnessStepSkip -StepNumber "04b" -StepName "regression-test" -Reason "no tests/regression/ found"
    } else {
      $regression = Get-HarnessRegressionTestCommand
      if ([string]::IsNullOrWhiteSpace($regression)) {
        throw "Regression tests exist, but no vitest/jest runner or HARNESS_REGRESSION_TEST_CMD was found."
      }
      Invoke-HarnessStep -StepNumber "04b" -StepName "regression-test" -Command $regression
    }
  }

  if ($skipBuild) {
    Invoke-HarnessStepSkip -StepNumber "05" -StepName "build" -Reason "--from"
  } elseif (-not $hasPackageJson) {
    Invoke-HarnessStepSkip -StepNumber "05" -StepName "build" -Reason "no package.json (template state)"
  } else {
    $build = Get-HarnessScriptCommand -ScriptName "build" -OverrideEnvName "HARNESS_BUILD_CMD"
    if ([string]::IsNullOrWhiteSpace($build)) {
      Invoke-HarnessStepSkip -StepNumber "05" -StepName "build" -Reason "no build script"
    } else {
      Invoke-HarnessStep -StepNumber "05" -StepName "build" -Command $build
    }
  }

  Write-Host ""
  if ($script:ValidateOutputMode -eq "summary") { Write-Host ("[06] {0,-20} " -f "security") -NoNewline } else { Write-Host "[06] security..." }
  $securityLog = Join-Path $script:ValidateLogDir "06-security.log"
  $securityWarnings = 0
  $securityMessages = New-Object System.Collections.Generic.List[string]
  $sourceFiles = @(Get-HarnessSearchFiles -Path "src")
  if ($sourceFiles.Count -gt 0) {
    $secretMatches = $sourceFiles | Select-String -Pattern "(api[_-]?key|secret|password|token)\s*[:=]\s*['`"][a-zA-Z0-9]{8,}" -CaseSensitive:$false -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "process\.env|\.env\.|\.example|test|mock|fake|dummy" }
    if ($secretMatches) {
      $securityWarnings += 1
      $securityMessages.Add("WARNING: Possible hardcoded secret detected in source code")
      $secretMatches | ForEach-Object { $securityMessages.Add($_.ToString()) }
    }
  }
  $stagedEnv = (& git diff --cached --name-only 2>$null) | Where-Object { $_ -match '^\.env(\.\w+)?$' -and $_ -notmatch '\.example$' }
  if ($stagedEnv) {
    $securityWarnings += 1
    $securityMessages.Add("WARNING: .env file staged for commit")
    $stagedEnv | ForEach-Object { $securityMessages.Add($_) }
  }
  $scriptFiles = @()
  if (Test-Path -LiteralPath "scripts") {
    $scriptFiles = @(Get-ChildItem -LiteralPath "scripts" -Recurse -File -Include "*.sh", "*.ps1" -ErrorAction SilentlyContinue)
  }
  $downVolume = $scriptFiles |
    Where-Object { $_.Name -notin @("validate.ps1", "validate.sh") } |
    Select-String -Pattern "down -v|down --volumes" -ErrorAction SilentlyContinue
  if ($downVolume) {
    $securityWarnings += 1
    $securityMessages.Add("WARNING: docker compose down volume destruction pattern found in scripts")
    $downVolume | ForEach-Object { $securityMessages.Add($_.ToString()) }
  }
  if ($securityWarnings -eq 0) { $securityMessages.Add("Security check: PASSED") } else { $securityMessages.Add("Security check: $securityWarnings warning(s) found") }
  $securityMessages | Set-Content -LiteralPath $securityLog
  $script:ValidateTotalSteps += 1
  $script:ValidatePassedSteps += 1
  if ($script:ValidateOutputMode -eq "summary") {
    if ($securityWarnings -eq 0) { Write-Host "PASSED" } else { Write-Host "WARN ($securityWarnings warning(s)) - log: $securityLog" }
  } else {
    Get-Content -LiteralPath $securityLog
  }

  if ($script:ValidateOutputMode -eq "summary") { Write-Host ("[07] {0,-20} " -f "performance") -NoNewline } else { Write-Host ""; Write-Host "[07] performance..." }
  $perfLog = Join-Path $script:ValidateLogDir "07-performance.log"
  $perfWarnings = 0
  $perfMessages = New-Object System.Collections.Generic.List[string]
  if ($sourceFiles.Count -gt 0) {
    $unbounded = $sourceFiles | Select-String -Pattern "findMany\(\)" -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "take:|limit:|where:" }
    if ($unbounded) {
      $perfWarnings += 1
      $perfMessages.Add("WARNING: findMany() without take/limit may return unbounded results")
      $unbounded | ForEach-Object { $perfMessages.Add($_.ToString()) }
    }
    $lodash = $sourceFiles | Select-String -Pattern "from 'lodash'|from `"lodash`"" -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "lodash/" }
    if ($lodash) {
      $perfWarnings += 1
      $perfMessages.Add("WARNING: Full lodash import; use lodash/specific-function")
      $lodash | ForEach-Object { $perfMessages.Add($_.ToString()) }
    }
  }
  if ($perfWarnings -eq 0) { $perfMessages.Add("Performance check: PASSED") } else { $perfMessages.Add("Performance check: $perfWarnings warning(s) found") }
  $perfMessages | Set-Content -LiteralPath $perfLog
  $script:ValidateTotalSteps += 1
  $script:ValidatePassedSteps += 1
  if ($script:ValidateOutputMode -eq "summary") {
    if ($perfWarnings -eq 0) { Write-Host "PASSED" } else { Write-Host "WARN ($perfWarnings warning(s)) - log: $perfLog" }
  } else {
    Get-Content -LiteralPath $perfLog
  }

  if ($script:ValidateOutputMode -eq "summary") { Write-Host ("[08] {0,-20} " -f "blocking") -NoNewline } else { Write-Host ""; Write-Host "[08] blocking..." }
  $blockingLog = Join-Path $script:ValidateLogDir "08-blocking.log"
  $blockingWarnings = 0
  $blockingMessages = New-Object System.Collections.Generic.List[string]

  # [P1 promoted] Python FastAPI: load_dotenv() 미호출 체크
  # incident: 2026-06-16-python-dotenv-not-loaded
  if (Test-Path -LiteralPath "backend") {
    $pyFiles = @(Get-ChildItem -LiteralPath "backend" -Recurse -File -Include "*.py" -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch '__pycache__|\.pyc|alembic' })
    if ($pyFiles.Count -gt 0) {
      $hasLoadDotenv = $pyFiles | Select-String -Pattern "load_dotenv" -ErrorAction SilentlyContinue
      if (-not $hasLoadDotenv) {
        $blockingWarnings += 1
        $blockingMessages.Add("WARNING [P1]: backend/ Python 소스에 load_dotenv() 호출이 없습니다.")
        $blockingMessages.Add("  .env 파일이 프로덕션에서 로드되지 않습니다.")
        $blockingMessages.Add("  참고: feedback/incidents/2026-06-16-python-dotenv-not-loaded.md")
      }
    }
  }

  # [P6 promoted] Alembic + Base.metadata.create_all() 공존 체크
  # incident: 2026-06-16-alembic-and-create-all-conflict
  if ((Test-Path -LiteralPath "backend/alembic") -and (Test-Path -LiteralPath "backend/app")) {
    $appFiles = @(Get-ChildItem -LiteralPath "backend/app" -Recurse -File -Include "*.py" -ErrorAction SilentlyContinue)
    $hasCreateAll = $appFiles | Select-String -Pattern "\.metadata\.create_all\(" -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch '#' }
    if ($hasCreateAll) {
      $blockingWarnings += 1
      $blockingMessages.Add("WARNING [P6]: backend/alembic/ 존재 시 Base.metadata.create_all() 앱 코드 금지.")
      $blockingMessages.Add("  Alembic과 create_all 공존은 마이그레이션 버전 추적 충돌을 유발합니다.")
      $blockingMessages.Add("  참고: feedback/incidents/2026-06-16-alembic-and-create-all-conflict.md")
      $hasCreateAll | ForEach-Object { $blockingMessages.Add("  " + $_.ToString()) }
    }
  }

  # [Epic2 promoted] 라우터가 ORM 직접 호출 시 WARN (서비스 레이어 우회)
  # incident: 2026-06-17-router-direct-orm-no-service-layer / ADR-0001
  if (Test-Path -LiteralPath "backend/app/routers") {
    $routerFiles = @(Get-ChildItem -LiteralPath "backend/app/routers" -Recurse -File -Include "*.py" -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch '__pycache__' })
    if ($routerFiles.Count -gt 0) {
      $directOrm = $routerFiles | Select-String -Pattern '\bdb\.(query|add|commit|delete|merge|flush)\(' -ErrorAction SilentlyContinue
      if ($directOrm) {
        $blockingWarnings += 1
        $blockingMessages.Add("WARNING [arch]: backend/app/routers/ 에서 ORM(db.query/add/commit 등) 직접 호출 발견.")
        $blockingMessages.Add("  비즈니스 로직은 backend/app/services/ 레이어로 분리하세요 (architecture.md 7절).")
        $blockingMessages.Add("  참고: docs/decisions/ADR-0001-course-service-layer.md")
        $directOrm | ForEach-Object { $blockingMessages.Add("  " + $_.ToString()) }
      }
    }
  }

  if ($blockingWarnings -eq 0) {
    $blockingMessages.Add("Blocking check: PASSED")
  } else {
    $blockingMessages.Add("Blocking check: $blockingWarnings warning(s) found")
  }
  $blockingMessages | Set-Content -LiteralPath $blockingLog
  $script:ValidateTotalSteps += 1
  $script:ValidatePassedSteps += 1
  if ($script:ValidateOutputMode -eq "summary") {
    if ($blockingWarnings -eq 0) { Write-Host "PASSED" } else { Write-Host "WARN ($blockingWarnings warning(s)) - log: $blockingLog" }
  } else {
    Get-Content -LiteralPath $blockingLog
  }

  $exitCode = Complete-HarnessValidation
  exit $exitCode
} catch {
  if ([string]::IsNullOrWhiteSpace($script:ValidateFailedStep)) {
    $script:ValidateFailedStep = "validate"
    $script:ValidateFailedCode = 1
    Write-Error $_
  }
  Complete-HarnessValidation | Out-Null
  exit 1
}
