#!/bin/bash
# SafeGate Development Server Startup Script
# Starts both FastAPI backend and Next.js frontend in separate terminals

echo "========================================"
echo "  SafeGate Development Server"
echo "========================================"
echo ""
echo "Starting backend and frontend servers..."
echo ""

# Start FastAPI Backend
echo "[1/2] Starting FastAPI Backend on port 8000..."
cd backend
python main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Return to root directory
cd ..

# Start Next.js Frontend
echo "[2/2] Starting Next.js Frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  Servers Starting..."
echo "========================================"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/api/docs"
echo ""
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop servers, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "========================================"

# Keep script running
wait
