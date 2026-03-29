# WAVER Startup Script
# Port Table:
# Frontend: 19000
# Backend:  19001
# Netease API: 19002 (Docker)

# Kill all background processes on exit
trap "kill 0" EXIT

echo "🌊 Starting WAVER (Premium Redesign)..."

# 1. Start Netease API with Docker (always)
echo "🎵 Starting Netease Cloud Music API (Docker) on port 19002..."
if docker ps -a | grep -q waver-netease-api; then
    echo "📦 Starting existing netease-api container..."
    docker start waver-netease-api
else
    echo "📦 Creating and starting netease-api container..."
    docker run -d \
        --name waver-netease-api \
        -p 19002:3000 \
        -e PORT=3000 \
        --restart unless-stopped \
        moefurina/ncm-api
fi

# Wait for API to be ready
echo "⏳ Waiting for Netease API to be ready..."
sleep 3

# 2. Start Backend
echo "🚀 Starting FastAPI Backend on port 19001..."
if [ ! -d "backend/venv" ]; then
    echo "📦 Setting up Python virtual environment..."
    # Use pyenv specific version if available, otherwise default python3
    if command -v pyenv >/dev/null 2>&1; then
        echo "Using pyenv python 3.12.11..."
        export PYENV_VERSION=3.12.11
        eval "$(pyenv init -)"
    fi
    
    python3 -m venv backend/venv
    source backend/venv/bin/activate
    pip install -r backend/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
else
    echo "🔧 Activating existing virtual environment..."
    source backend/venv/bin/activate
    # Ensure dependencies are up to date
    pip install -r backend/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
fi

# Start backend server
(cd backend && uvicorn app.main:sio_app --host 0.0.0.0 --port 19001 --reload) &

# 3. Start Frontend
echo "💻 Starting Next.js Frontend on port 19000..."
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    (cd frontend && npm install --registry=https://registry.npmmirror.com)
fi

# Start frontend development server
(cd frontend && PORT=19000 npm run dev) &

# Keep the script running
wait
