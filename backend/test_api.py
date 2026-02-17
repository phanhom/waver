#!/usr/bin/env python3
"""
Simple API test script to verify backend services are working
"""
import asyncio
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_api():
    print("🧪 Testing WAVER Backend API...")

    try:
        from app.main import app
        print("✅ Backend app imported successfully")

        # Test basic endpoints that don't require external services
        from app.routers.music import router

        print("✅ Music router imported successfully")
        print("✅ API routes loaded")

        # List all routes
        routes = []
        for route in app.routes:
            if hasattr(route, 'path'):
                routes.append(route.path)

        print(f"📋 Available routes: {len(routes)}")
        for route in sorted(routes)[:10]:  # Show first 10 routes
            print(f"  - {route}")

        print("\n🎉 Backend API test completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Backend API test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_api())
    sys.exit(0 if success else 1)
