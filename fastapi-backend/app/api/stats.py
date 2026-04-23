"""Stats API endpoint."""

import logging
from fastapi import APIRouter

from ..config import config
from ..models.schemas import StatsResponse, RarityInfo
from ..services.tablestore import get_all_stats

logger = logging.getLogger(__name__)
router = APIRouter()


def get_rarity_label(ratio: float) -> str:
    """Get rarity label for a given ratio."""
    if ratio <= 0.02:
        return "极稀有"
    if ratio <= 0.05:
        return "很稀有"
    if ratio <= 0.10:
        return "稀有"
    if ratio <= 0.20:
        return "较少"
    if ratio <= 0.35:
        return "常见"
    return "大众"


@router.get("/getStats", response_model=StatsResponse)
async def get_statistics():
    """Get all personality type statistics."""
    try:
        counts = await get_all_stats()
        total = sum(counts.values())

        ratios = {}
        rarity_by_type = {}

        for type_code in config.VALID_TYPES:
            count = counts.get(type_code, 0)
            ratio = count / total if total > 0 else 0
            ratios[type_code] = round(ratio, 4)
            rarity_by_type[type_code] = RarityInfo(
                label=get_rarity_label(ratio),
                percent=round((1 - ratio) * 100, 1)
            )

        logger.info(f"Stats retrieved: total={total}")
        return StatsResponse(
            ok=True,
            total=total,
            counts=counts,
            ratios=ratios,
            rarityByType=rarity_by_type
        )
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        return StatsResponse(
            ok=False,
            total=0,
            counts={},
            ratios={},
            rarityByType={}
        )
