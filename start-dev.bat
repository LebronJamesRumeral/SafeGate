@echo off
REM SafeGate Development Server Startup Script
REM Starts both FastAPI backend and Next.js frontend in separate windows

echo ========================================
echo   SafeGate Development Server
echo ========================================
echo.
echo Starting backend and frontend servers...
echo.

REM Start FastAPI Backend in a new window
echo [1/2] Starting FastAPI Backend on port 8000...
start cmd /k "cd backend && python main.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start Next.js Frontend in a new window
echo [2/2] Starting Next.js Frontend on port 3000...
start cmd /k "npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/api/docs
echo.
echo Press Ctrl+C in each window to stop the servers.
echo ========================================
