"""Unit tests for stats API."""

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
async def test_get_stats_structure(client):
    """Test getStats response has correct structure."""
    response = await client.get("/getStats")
    # Should return 200 even with Tablestore issues (graceful degradation)
    assert response.status_code == 200
    data = response.json()
    # Check structure
    assert "ok" in data
    assert "total" in data
    assert "counts" in data
    assert "ratios" in data
    assert "rarityByType" in data
