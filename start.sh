# WAVER Startup Script
# Port Table:
# Frontend: 18020
# Backend:  18021
# Netease:  18012

# Kill all background processes on exit
trap "kill 0" EXIT

echo "🌊 Starting WAVER (Premium Redesign)..."

# 1. Start Netease API
if [ ! -d "./NeteaseCloudMusicApi" ]; then
    echo "📡 NeteaseCloudMusicApi not found. Downloading maintained Enhanced version..."
    git clone --depth 1 https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git NeteaseCloudMusicApi
    echo "📦 Installing Netease API dependencies..."
    (cd NeteaseCloudMusicApi && npm install --registry=https://registry.npmmirror.com)
fi

echo "🎵 Starting Netease Cloud Music API on port 18012..."
(cd NeteaseCloudMusicApi && PORT=18012 npm start) &

# 2. Start Backend
echo "🚀 Starting FastAPI Backend on port 18021..."
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
(cd backend && uvicorn app.main:sio_app --host 0.0.0.0 --port 18021 --reload) &

# 3. Start Frontend
echo "💻 Starting Next.js Frontend on port 18020..."
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    (cd frontend && npm install --registry=https://registry.npmmirror.com)
fi

# Start frontend development server
(cd frontend && PORT=18020 npm run dev) &

# Keep the script running
wait
