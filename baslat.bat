@echo off
REM FinansRehber - backend + frontend baslatma
cd /d "%~dp0"

start "FinansRehber API (8000)" cmd /k "cd backend && .venv\Scripts\python -m uvicorn app.main:app --port 8000"
timeout /t 3 /nobreak >nul
start "FinansRehber Web (5173)" cmd /k "cd frontend && npm run dev"
timeout /t 6 /nobreak >nul
start http://localhost:5173
