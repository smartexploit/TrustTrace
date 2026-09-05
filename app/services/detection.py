from math import radians, sin, cos, sqrt, atan2
from datetime import datetime, timedelta, timezone
import re

from sqlalchemy.orm import Session

from app.models.scan_event import ScanEvent


# Impossible travel settings
IMPOSSIBLE_TRAVEL_DISTANCE_KM = 100.0
IMPOSSIBLE_TRAVEL_TIME_MINUTES = 30.0

# High-frequency settings
HIGH_FREQUENCY_SCAN_COUNT = 5
HIGH_FREQUENCY_WINDOW_MINUTES = 10.0

# Product code format
PRODUCT_CODE_PATTERN = r"^TT-[A-Z0-9]{6}$"


def calculate_distance_km(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float
) -> float:
    """Calculate the approximate distance between two coordinates."""

    earth_radius_km = 6371.0

    lat1 = radians(latitude1)
    lat2 = radians(latitude2)

    delta_lat = radians(latitude2 - latitude1)
    delta_lon = radians(longitude2 - longitude1)

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )

    return earth_radius_km * c


def check_impossible_travel(
    db: Session,
    code: str,
    timestamp: datetime,
    latitude: float,
    longitude: float
) -> str | None:
    """Check whether a product moved an unrealistic distance too quickly."""

    # Normalize incoming timestamp to UTC-aware datetime.
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(
            tzinfo=timezone.utc
        )
    else:
        timestamp = timestamp.astimezone(
            timezone.utc
        )

    previous_scan = (
        db.query(ScanEvent)
        .filter(
            ScanEvent.code == code,
            ScanEvent.timestamp < timestamp
        )
        .order_by(ScanEvent.timestamp.desc())
        .first()
    )

    if not previous_scan:
        return None

    # Normalize stored timestamp to UTC-aware datetime.
    previous_timestamp = previous_scan.timestamp

    if previous_timestamp.tzinfo is None:
        previous_timestamp = previous_timestamp.replace(
            tzinfo=timezone.utc
        )
    else:
        previous_timestamp = previous_timestamp.astimezone(
            timezone.utc
        )

    time_difference = (
        timestamp - previous_timestamp
    )

    time_difference_minutes = (
        time_difference.total_seconds() / 60
    )

    distance_km = calculate_distance_km(
        previous_scan.latitude,
        previous_scan.longitude,
        latitude,
        longitude
    )

    if (
        distance_km >= IMPOSSIBLE_TRAVEL_DISTANCE_KM
        and time_difference_minutes <= IMPOSSIBLE_TRAVEL_TIME_MINUTES
    ):
        return (
            f"Impossible travel: approximately "
            f"{distance_km:.1f} km in "
            f"{time_difference_minutes:.1f} minutes"
        )

    return None


def check_high_frequency(
    db: Session,
    code: str,
    timestamp: datetime
) -> str | None:
    """Check whether a product code has been scanned too frequently."""

    # Normalize timestamp to UTC-aware datetime.
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(
            tzinfo=timezone.utc
        )
    else:
        timestamp = timestamp.astimezone(
            timezone.utc
        )

    window_start = timestamp - timedelta(
        minutes=HIGH_FREQUENCY_WINDOW_MINUTES
    )

    recent_scan_count = (
        db.query(ScanEvent)
        .filter(
            ScanEvent.code == code,
            ScanEvent.timestamp >= window_start,
            ScanEvent.timestamp <= timestamp
        )
        .count()
    )

    # Include the scan that is about to be created.
    total_scan_count = recent_scan_count + 1

    if total_scan_count >= HIGH_FREQUENCY_SCAN_COUNT:
        return (
            f"High scan frequency: {total_scan_count} scans "
            f"within {HIGH_FREQUENCY_WINDOW_MINUTES:.0f} minutes"
        )

    return None


def check_code_format(code: str) -> str | None:
    """Check whether a product code follows the TrustTrace format."""

    if not re.fullmatch(
        PRODUCT_CODE_PATTERN,
        code
    ):
        return (
            f"Invalid product code format: '{code}'. "
            "Expected format TT-ABC123"
        )

    return None