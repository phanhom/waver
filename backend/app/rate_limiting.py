"""
HTTP /api rate limiting (limits + Starlette middleware) and Socket.IO chat burst control.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from limits import RateLimitItemPerSecond
from limits.storage import memory as memory_storage
from limits.strategies import MovingWindowRateLimiter

_storage = memory_storage.MemoryStorage()
_http_limiter = MovingWindowRateLimiter(_storage)

# sid -> deque of monotonic timestamps (last 1s window) for chat_message
_chat_hits: Dict[str, Deque[float]] = defaultdict(deque)


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    real = request.headers.get("x-real-ip") or request.headers.get("X-Real-IP")
    if real:
        return real.strip()
    if request.client:
        return request.client.host
    return "unknown"


class ApiRateLimitMiddleware(BaseHTTPMiddleware):
    """Apply per-IP QPS limit to /api/* only. Excludes docs and socket.io."""

    EXACT_SKIP = frozenset({"/", "/docs", "/openapi.json", "/redoc", "/favicon.ico"})

    def __init__(self, app, enabled: bool, api_qps: int):
        super().__init__(app)
        self.enabled = enabled
        self.api_qps = max(1, int(api_qps))
        self._rate = RateLimitItemPerSecond(self.api_qps)

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        path = request.url.path
        if path.startswith("/socket.io"):
            return await call_next(request)
        if path in self.EXACT_SKIP:
            return await call_next(request)
        if not self.enabled or not path.startswith("/api"):
            return await call_next(request)

        key = f"api:{client_ip(request)}"
        if not _http_limiter.hit(self._rate, key):
            return JSONResponse(
                {"detail": "Too many requests. Please slow down."},
                status_code=429,
                headers={"Retry-After": "1"},
            )
        return await call_next(request)


def allow_chat_message(sid: str, max_per_second: int) -> bool:
    """Sliding 1s window per Socket.IO session id."""
    max_per_second = max(1, int(max_per_second))
    now = time.monotonic()
    q = _chat_hits[sid]
    while q and q[0] < now - 1.0:
        q.popleft()
    if len(q) >= max_per_second:
        return False
    q.append(now)
    return True
