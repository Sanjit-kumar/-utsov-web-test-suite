@echo off
REM ============================================================
REM UTSOV Test Suite — Windows Task Scheduler Setup
REM Run this script as Administrator to schedule daily tests
REM Tests will run at 8:00 AM and 11:00 PM every day
REM ============================================================

echo.
echo  Setting up UTSOV Test Suite scheduled tasks...
echo.

SET SCRIPT_DIR=%~dp0
SET NODE_PATH=node
SET RUNNER=%SCRIPT_DIR%run-tests.js

REM ── Morning run: 8:00 AM daily ────────────────────────────
SCHTASKS /CREATE /F /TN "UTSOV-Tests-Morning" ^
  /TR "\"%NODE_PATH%\" \"%RUNNER%\"" ^
  /SC DAILY /ST 08:00 ^
  /RL HIGHEST ^
  /RU "%USERNAME%"

IF %ERRORLEVEL% EQU 0 (
    echo  [OK] Morning task created: UTSOV-Tests-Morning - runs at 08:00 AM daily
) ELSE (
    echo  [ERR] Failed to create morning task. Run as Administrator?
)

REM ── Nightly run: 11:00 PM daily ───────────────────────────
SCHTASKS /CREATE /F /TN "UTSOV-Tests-Nightly" ^
  /TR "\"%NODE_PATH%\" \"%RUNNER%\"" ^
  /SC DAILY /ST 23:00 ^
  /RL HIGHEST ^
  /RU "%USERNAME%"

IF %ERRORLEVEL% EQU 0 (
    echo  [OK] Nightly task created: UTSOV-Tests-Nightly - runs at 11:00 PM daily
) ELSE (
    echo  [ERR] Failed to create nightly task. Run as Administrator?
)

echo.
echo  Tasks registered. To verify, open Windows Task Scheduler and look for:
echo    - UTSOV-Tests-Morning (08:00 AM daily)
echo    - UTSOV-Tests-Nightly (11:00 PM daily)
echo.
echo  To remove tasks later, run:
echo    SCHTASKS /DELETE /TN "UTSOV-Tests-Morning" /F
echo    SCHTASKS /DELETE /TN "UTSOV-Tests-Nightly" /F
echo.
pause
