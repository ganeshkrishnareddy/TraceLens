@echo off
setlocal

echo ============================================
echo  TraceLens - stopping services
echo ============================================

echo Checking ports 8000 (backend) and 5173 (frontend) ...
for %%P in (8000 5173) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P" ^| findstr "LISTENING"') do (
    echo Stopping PID %%A listening on port %%P
    taskkill /PID %%A /F >nul 2>&1
    if errorlevel 1 echo   [WARN] Could not stop PID %%A
  )
)

echo.
echo TraceLens services stopped.
endlocal
