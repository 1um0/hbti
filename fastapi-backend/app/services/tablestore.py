"""Tablestore service for HBTI statistics."""

import logging
import time
from typing import Dict
from tablestore import OTSClient, Condition, RowExistenceExpectation

from ..config import config

logger = logging.getLogger(__name__)


def normalize_long_value(raw_value) -> int:
    """Normalize Tablestore Long type to Python int."""
    if raw_value is None:
        return 0
    if isinstance(raw_value, int):
        return raw_value
    if isinstance(raw_value, float):
        return int(raw_value) if raw_value.is_integer() else 0
    if isinstance(raw_value, str):
        try:
            parsed = float(raw_value)
            return int(parsed) if parsed.is_integer() else 0
        except (ValueError, TypeError):
            return 0
    if hasattr(raw_value, 'toNumber'):
        try:
            return int(raw_value.toNumber())
        except (ValueError, TypeError):
            return 0
    if hasattr(raw_value, '__int__'):
        return int(raw_value)
    return 0


def find_attribute_value(attributes: list, key: str):
    """Find attribute value from Tablestore row attributes."""
    if not isinstance(attributes, list):
        return None
    for item in attributes:
        if not item:
            continue
        if isinstance(item, dict):
            if 'name' in item and item['name'] == key:
                return item.get('value')
            if key in item:
                return item[key]
            if 'columnName' in item and item['columnName'] == key:
                return item.get('value', item.get('columnValue'))
        if isinstance(item, (list, tuple)) and len(item) >= 2 and item[0] == key:
            return item[1]
    return None


def create_client() -> OTSClient:
    """Create Tablestore client from environment configuration."""
    options = {
        'endpoint': config.OTS_ENDPOINT,
        'instancename': config.OTS_INSTANCE,
    }
    if config.OTS_ACCESS_KEY_ID and config.OTS_ACCESS_KEY_SECRET:
        options['access_key_id'] = config.OTS_ACCESS_KEY_ID
        options['access_key_secret'] = config.OTS_ACCESS_KEY_SECRET
    return OTSClient(options)


async def increment_type_count(type_code: str) -> int:
    """Increment count for a personality type."""
    client = create_client()
    primary_key = [
        ('scope', 'global'),
        ('type', type_code)
    ]

    current_count = 0
    try:
        _, row_data = client.get_row(
            table_name=config.OTS_TABLE,
            primary_key=primary_key
        )
        if row_data and row_data.row:
            attributes = row_data.row.attribute_columns or row_data.row.attributes or []
            raw_count = find_attribute_value(attributes, 'count')
            current_count = normalize_long_value(raw_count)
    except Exception as e:
        logger.warning(f"get_row failed, may be new type: {e}")

    next_count = current_count + 1
    attribute_columns = [
        ('count', next_count),
        ('updatedAt', int(time.time() * 1000))
    ]

    client.put_row(
        table_name=config.OTS_TABLE,
        primary_key=primary_key,
        attribute_columns=attribute_columns,
        condition=Condition(RowExistenceExpectation.IGNORE)
    )
    return next_count


async def get_all_stats() -> Dict[str, int]:
    """Get counts for all personality types."""
    client = create_client()
    counts = {}

    for type_code in config.VALID_TYPES:
        primary_key = [
            ('scope', 'global'),
            ('type', type_code)
        ]
        try:
            _, row_data = client.get_row(
                table_name=config.OTS_TABLE,
                primary_key=primary_key
            )
            if row_data and row_data.row:
                attributes = row_data.row.attribute_columns or row_data.row.attributes or []
                raw_count = find_attribute_value(attributes, 'count')
                counts[type_code] = normalize_long_value(raw_count)
            else:
                counts[type_code] = 0
        except Exception as e:
            logger.warning(f"Failed to get stats for {type_code}: {e}")
            counts[type_code] = 0

    return counts
