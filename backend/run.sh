#!/bin/bash
# FastAPI Backend Startup Script for Linux/macOS

echo "Starting FastAPI Backend Service..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run the application
echo "Starting server..."
python main.py

# Read to prevent window from closing
read -p "Press any key to continue..."
