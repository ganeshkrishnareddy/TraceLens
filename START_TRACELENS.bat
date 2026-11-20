@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  TraceLens - starting services
echo ============================================

echo Checking prerequisites...
where python >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python not found on PATH. Install Python 3.10+ and retry.
  exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found on PATH. Install Node 18+ and retry.
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found on PATH. Install npm and retry.
  exit /b 1
)

echo Starting backend (FastAPI / uvicorn) on port 8000 ...
start "TraceLens Backend" /D "%~dp0backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Starting frontend (Vite) on port 5173 ...
start "TraceLens Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

echo.
echo TraceLens URLs:
echo   Frontend app : http://localhost:5173
echo   Backend API  : http://localhost:8000
echo   API docs     : http://localhost:8000/docs
echo   Health check : http://localhost:8000/api/health
echo.
echo Two new windows are running the backend and frontend.
echo Close those windows, or run STOP_TRACELENS.bat, to stop them.
endlocal
