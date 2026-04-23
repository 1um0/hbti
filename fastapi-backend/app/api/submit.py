"""Submit result API endpoint."""

import logging
from fastapi import APIRouter, HTTPException

from ..config import config
from ..models.schemas import SubmitRequest, SubmitResponse, ErrorResponse
from ..services.tablestore import increment_type_count

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/submitResult", response_model=SubmitResponse)
async def submit_result(data: SubmitRequest):
    """Submit a personality type result.

    Args:
        data: Submit request with personality type

    Returns:
        SubmitResponse on success

    Raises:
        HTTPException: If type is invalid
    """
    type_code = data.type.upper()

    if type_code not in config.VALID_TYPES:
        logger.warning(f"Invalid type submitted: {type_code}")
        raise HTTPException(
            status_code=400,
            detail={
                "ok": False,
                "error": "Invalid type",
                "allowed": list(config.VALID_TYPES)
            }
        )

    try:
        await increment_type_count(type_code)
        logger.info(f"Successfully recorded type: {type_code}")
        return SubmitResponse(ok=True, type=type_code, message="Result saved")
    except Exception as e:
        logger.error(f"Failed to save result: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "ok": False,
                "error": "Failed to save result",
                "detail": str(e)
            }
        )
