#!/bin/bash

echo "============================================================"
echo "🛡️  INTELLIHUNT - Cyber Threat Hunting Copilot"
echo "============================================================"
echo ""

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Cleanup function ──────────────────────────────────────────────
cleanup() {
    echo ""
    echo "============================================================"
    echo "🛑 Shutting down all services..."
    echo "============================================================"
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "   ✅ Frontend stopped (PID: $FRONTEND_PID)"
    fi
    
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "   ✅ Backend stopped (PID: $BACKEND_PID)"
    fi
    
    echo ""
    echo "👋 All services stopped. Goodbye!"
    exit 0
}

# Trap Ctrl+C and termination signals
trap cleanup SIGINT SIGTERM

# ─── Check for .env file ───────────────────────────────────────────
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found!"
    echo "   Copy .env.example to .env and add your MongoDB Atlas connection string:"
    echo "   cp .env.example .env"
    echo ""
    exit 1
fi

# ─── Check for virtual environment ──────────────────────────────────
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Creating..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r backend/requirements.txt
else
    source .venv/bin/activate
fi

# Create logs directory
mkdir -p logs

# ─── 1. Start Backend ──────────────────────────────────────────────
echo "🚀 Starting Backend API (http://localhost:8000)..."
echo "   Using MongoDB Atlas (from .env)"
cd backend
DOTENV_PATH="$SCRIPT_DIR/.env"
nohup env DOTENV_PATH="$DOTENV_PATH" "$SCRIPT_DIR/.venv/bin/python" app/main.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
cd ..

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start! Check logs/backend.log"
    cat logs/backend.log
    exit 1
fi

# ─── 2. Start Frontend ─────────────────────────────────────────────
echo "🚀 Starting Frontend Dashboard (http://localhost:8080)..."
cd frontend
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
cd ..

echo ""
echo "============================================================"
echo "✅ ALL SERVICES RUNNING"
echo "============================================================"
echo ""
echo "   🔌 Backend API:   http://localhost:8000"
echo "   📊 Dashboard:     http://localhost:8080"
echo "   📜 Log History:   http://localhost:8080/history"
echo ""
echo "============================================================"
echo "📁 INGESTION OPTIONS"
echo "============================================================"
echo ""
echo "1. Ingest PCAP files:"
echo "   .venv/bin/python ingestion/ingest_pcap.py <file.pcap>"
echo "   .venv/bin/python ingestion/ingest_pcap.py --dir pcaps/"
echo "   .venv/bin/python ingestion/ingest_pcap.py --watch pcaps/"
echo ""
echo "2. Live network capture (requires sudo):"
echo "   sudo .venv/bin/python ingestion/live_capture.py"
echo ""
echo "3. Ingest Kaggle CICIDS2017 dataset:"
echo "   .venv/bin/python ml/ingest_kaggle_data.py -n 50"
echo ""
echo "============================================================"
echo "📝 LOGS"
echo "============================================================"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo ""
echo "Happy Hunting! 🎯"

# Wait for all background processes (keeps script alive for Ctrl+C)
wait
