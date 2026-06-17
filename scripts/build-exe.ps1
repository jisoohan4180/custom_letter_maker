# Build a single double-clickable .exe of the HRD assistant (no Python/Node needed to run).
# Output: release\HRD-Assistant\HRD-Assistant.exe  (copy the whole folder to the target PC)
# Notes:
#  - ASCII-only messages: Windows PowerShell 5.1 mangles non-BOM UTF-8 Korean in .ps1.
#  - Native tools (npm, pyinstaller) log to stderr; under EAP=Stop that aborts the script,
#    so the native-call section runs under EAP=Continue and checks $LASTEXITCODE instead.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"

Write-Host "[1/3] Building frontend (dist) ..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $prevEAP; throw "npm run build failed" }

Write-Host "[2/3] PyInstaller build ... (several minutes)" -ForegroundColor Cyan
& ".\venv\Scripts\pyinstaller.exe" --noconfirm --clean --distpath release --workpath build_pyi hrd-assistant.spec
if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $prevEAP; throw "PyInstaller build failed" }

$ErrorActionPreference = $prevEAP

Write-Host "[3/3] Bundling .env template ..." -ForegroundColor Cyan
Copy-Item ".env.example" "release\HRD-Assistant\.env.example" -Force

Write-Host ""
Write-Host "DONE. Copy the folder release\HRD-Assistant\ to the target PC." -ForegroundColor Green
Write-Host "  1) Copy .env.example -> .env and fill in the values" -ForegroundColor Green
Write-Host "  2) Double-click HRD-Assistant.exe" -ForegroundColor Green
