"""FastAPI application entry point."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import config
from .api import submit_router, stats_router, auth_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="HBTI API",
    description="HBTI 徒步人格测试后端 API",
    version="2.0",
    docs_url="/docs" if config.ALLOW_ORIGIN == "*" else None,
    redoc_url="/redoc" if config.ALLOW_ORIGIN == "*" else None
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.ALLOW_ORIGIN] if config.ALLOW_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Date", "x-fc-request-id"]
)

# Include routers
app.include_router(submit_router)
app.include_router(stats_router)
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "HBTI API", "version": "2.0"}