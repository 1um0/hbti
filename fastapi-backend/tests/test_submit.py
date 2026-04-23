"""Unit tests for submit API."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    """Create test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_submit_invalid_type(client):
    """Test submitting an invalid personality type returns 400."""
    response = await client.post("/submitResult", json={"type": "INVALID"})
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["ok"] is False
    assert data["detail"]["error"] == "Invalid type"
    assert "allowed" in data["detail"]


@pytest.mark.asyncio
async def test_submit_missing_type(client):
    """Test submitting without type returns 422."""
    response = await client.post("/submitResult", json={})
    assert response.status_code == 422
