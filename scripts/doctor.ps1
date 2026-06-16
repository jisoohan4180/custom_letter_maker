# scripts/doctor.ps1
# 개발 환경 사전 점검 스크립트

$ok = $true

Write-Host "`n[doctor] 개발 환경 점검 시작..." -ForegroundColor Cyan

# Python
try {
    $pyVer = python --version 2>&1
    Write-Host "  ✅ Python: $pyVer" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Python 없음 (python 3.11+ 필요)" -ForegroundColor Red
    $ok = $false
}

# Node.js
try {
    $nodeVer = node --version 2>&1
    Write-Host "  ✅ Node.js: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Node.js 없음 (프론트엔드 빌드 필요 시 설치)" -ForegroundColor Yellow
}

# npm
try {
    $npmVer = npm --version 2>&1
    Write-Host "  ✅ npm: $npmVer" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  npm 없음" -ForegroundColor Yellow
}

# .env 파일 존재 확인
if (Test-Path ".env") {
    Write-Host "  ✅ .env 파일 존재" -ForegroundColor Green
} else {
    Write-Host "  ❌ .env 파일 없음 (.env.example 참고해서 생성 필요)" -ForegroundColor Red
    $ok = $false
}

# architecture.md 존재 확인
if (Test-Path "_bmad-output/planning-artifacts/architecture.md") {
    Write-Host "  ✅ architecture.md 존재" -ForegroundColor Green
} else {
    Write-Host "  ❌ architecture.md 없음" -ForegroundColor Red
    $ok = $false
}

# sprint-status.yaml 존재 확인
if (Test-Path "_bmad-output/implementation-artifacts/sprint-status.yaml") {
    Write-Host "  ✅ sprint-status.yaml 존재" -ForegroundColor Green
} else {
    Write-Host "  ❌ sprint-status.yaml 없음" -ForegroundColor Red
    $ok = $false
}

if ($ok) {
    Write-Host "`n[doctor] ✅ 모든 점검 통과 — Phase A 진행 가능`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[doctor] ❌ 점검 실패 항목 있음 — 위 항목 해결 후 재실행`n" -ForegroundColor Red
    exit 1
}
