#!/usr/bin/env python3
"""
Simple script to start WAVER backend server
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def start_backend():
    try:
        import uvicorn
        from app.main import app

        print("🚀 Starting WAVER Backend Server...")
        print("📍 Host: 0.0.0.0")
        print("🔌 Port: 18021")
        print("📊 API Docs: http://localhost:18021/docs")
        print("🔄 Reload: Disabled")
        print("📝 Log Level: info")
        print()

        uvicorn.run(app, host='0.0.0.0', port=18021, reload=False, log_level='info')

    except KeyboardInterrupt:
        print("\n👋 Backend server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start backend server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    start_backend()
