# ============================================
# APM Rehab Kiosk - Windows Build Script (PowerShell)
# ============================================
# Jalankan dari Windows PowerShell
# Pastikan Node.js sudah terinstall di Windows
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " APM Rehab Kiosk - Windows Builder" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "[INFO] Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "[INFO] npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js tidak ditemukan!" -ForegroundColor Red
    Write-Host "Silakan install dari: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

Write-Host ""

# Try both WSL path formats
$WSL_PROJECT = "\\wsl.localhost\Ubuntu\home\rangg\projects\apm_rehab_v1"
if (-not (Test-Path $WSL_PROJECT)) {
    $WSL_PROJECT = "\\wsl$\Ubuntu\home\rangg\projects\apm_rehab_v1"
}
if (-not (Test-Path $WSL_PROJECT)) {
    Write-Host "[ERROR] Tidak bisa menemukan project di WSL!" -ForegroundColor Red
    Write-Host "Coba akses manual: \\wsl.localhost\Ubuntu\home\rangg\projects\apm_rehab_v1" -ForegroundColor Yellow
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

Write-Host "[INFO] Project: $WSL_PROJECT" -ForegroundColor Green

$BUILD_DIR = Join-Path $env:TEMP "apm_rehab_build"

# Step 1: Clean
Write-Host "[STEP 1/5] Membersihkan build directory..." -ForegroundColor Yellow
if (Test-Path $BUILD_DIR) {
    Remove-Item -Recurse -Force $BUILD_DIR
}
New-Item -ItemType Directory -Path $BUILD_DIR -Force | Out-Null

# Step 2: Copy project (exclude heavy dirs)
Write-Host "[STEP 2/5] Menyalin project ke Windows temp..." -ForegroundColor Yellow
$excludeDirs = @("node_modules", "release", ".git", "dist", "dist-electron")

Get-ChildItem -Path $WSL_PROJECT -Force | Where-Object {
    $_.Name -notin $excludeDirs
} | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination (Join-Path $BUILD_DIR $_.Name) -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination (Join-Path $BUILD_DIR $_.Name) -Force
    }
}
Write-Host "  Done!" -ForegroundColor Green

# Step 3: npm install
Write-Host "[STEP 3/5] Installing dependencies..." -ForegroundColor Yellow
Push-Location $BUILD_DIR
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
} catch {
    Write-Host "[ERROR] npm install gagal: $_" -ForegroundColor Red
    Pop-Location
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

# Step 4: Build
Write-Host "[STEP 4/5] Building Electron app untuk Windows..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
} catch {
    Write-Host "[ERROR] Build gagal: $_" -ForegroundColor Red
    Pop-Location
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

Pop-Location

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " BUILD SELESAI!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Find and show output files
$releaseDir = Join-Path $BUILD_DIR "release"
Write-Host "File yang dihasilkan:" -ForegroundColor Yellow

$exeFile = $null
Get-ChildItem -Path $releaseDir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 1)
    if ($_.Extension -eq ".exe") {
        Write-Host "  [INSTALLER] $($_.Name) ($sizeMB MB)" -ForegroundColor White
        $exeFile = $_.FullName
    }
}

Write-Host ""
Write-Host "Output folder: $releaseDir" -ForegroundColor Cyan
Write-Host ""

# Auto-launch the installer
if ($exeFile) {
    Write-Host "Menjalankan installer..." -ForegroundColor Green
    Start-Process -FilePath $exeFile
} else {
    Write-Host "[INFO] File .exe tidak ditemukan. Cek folder: $releaseDir" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Tekan Enter untuk keluar"
