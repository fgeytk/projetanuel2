"""Durcissement HTTP : rate-limiting en mémoire, en-têtes de sécurité, logs JSON."""

import json
import logging
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Depends, HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware


class SlidingWindowLimiter:
    """Limiteur par clé (scope + IP). Suffisant pour un déploiement mono-process ;
    derrière plusieurs workers chaque process a sa propre fenêtre (limite effective
    = limite × workers), ce qui reste un garde-fou anti-bruteforce acceptable."""

    def __init__(self):
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, limit: int, window_seconds: float) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - window_seconds:
                hits.popleft()
            if len(hits) >= limit:
                return False
            hits.append(now)
            return True


_limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(scope: str, limit: int, window_seconds: float):
    """Dépendance FastAPI : 429 si la fenêtre est dépassée pour cette IP."""

    def dependency(request: Request):
        if not _limiter.allow(f"{scope}:{client_ip(request)}", limit, window_seconds):
            raise HTTPException(
                status_code=429,
                detail="Trop de tentatives. Réessaie dans quelques minutes.",
            )

    return Depends(dependency)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if request.url.path.startswith("/api"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        extra = getattr(record, "http", None)
        if extra:
            payload["http"] = extra
        return json.dumps(payload, ensure_ascii=False)


def setup_logging(level: str = "INFO"):
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


class RequestLogMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger("quiz.access")

    async def dispatch(self, request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        self.logger.info(
            "%s %s -> %s",
            request.method,
            request.url.path,
            response.status_code,
            extra={
                "http": {
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": duration_ms,
                    "ip": client_ip(request),
                }
            },
        )
        return response
