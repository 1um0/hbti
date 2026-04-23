"""Logging middleware."""

import logging
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Log request
        logger.info(f"--> {request.method} {request.url.path}")

        # Process request
        response = await call_next(request)

        # Log response
        duration = (time.time() - start_time) * 1000
        logger.info(f"<-- {response.status_code} ({duration:.2f}ms)")

        return response
