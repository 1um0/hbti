"""API package."""
from .submit import router as submit_router
from .stats import router as stats_router
from .auth import router as auth_router

__all__ = ["submit_router", "stats_router", "auth_router"]
