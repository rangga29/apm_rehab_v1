@echo off
REM APM Rehab Kiosk - Windows Builder
REM Jalankan dari Windows CMD atau PowerShell

pushd \\wsl.localhost\Ubuntu\home\rangg\projects\apm_rehab_v1 2>nul
if %ERRORLEVEL% neq 0 pushd \\wsl$\Ubuntu\home\rangg\projects\apm_rehab_v1 2>nul

echo ============================================
echo  APM Rehab Kiosk - Windows Builder
echo ============================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Install dari: https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js:
call node -v
echo [INFO] npm:
call npm -v
echo.

set "BUILD_DIR=%TEMP%\apm_rehab_build"

echo [STEP 1/5] Membersihkan build directory...
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
mkdir "%BUILD_DIR%"
echo   Done!

echo [STEP 2/5] Menyalin project ke Windows temp...
robocopy "%CD%" "%BUILD_DIR%" /E /XD node_modules release .git dist dist-electron /NFL /NDL /NJH /NJS /NC /NS /NP
echo   Done!
echo.

echo [STEP 3/5] Installing dependencies...
cd /d "%BUILD_DIR%"
call npm install
echo.

echo [STEP 4/5] Building Electron app (unpacked)...
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Vite build gagal!
    pause
    exit /b 1
)
call npx electron-builder --dir --win
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Electron build gagal!
    pause
    exit /b 1
)
echo.

echo ============================================
echo  BUILD SELESAI!
echo  Output: %BUILD_DIR%\release\win-unpacked
echo ============================================
echo.

echo [STEP 5/5] Menjalankan aplikasi...
if exist "%BUILD_DIR%\release\win-unpacked\APM Rehab Kiosk.exe" (
    echo  Membuka: APM Rehab Kiosk.exe
    start "" "%BUILD_DIR%\release\win-unpacked\APM Rehab Kiosk.exe"
) else (
    echo  Mencari .exe...
    for /r "%BUILD_DIR%\release\win-unpacked" %%f in (*.exe) do (
        echo  Membuka: %%f
        start "" "%%f"
        goto done
    )
)

:done
echo.
echo Aplikasi sudah dibuka!
echo File ada di: %BUILD_DIR%\release\win-unpacked\
popd
pause
