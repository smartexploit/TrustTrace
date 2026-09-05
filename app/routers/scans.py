from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.models.scan_event import ScanEvent
from app.schemas import (
    ScanCreate,
    ScanResponse,
    ReviewUpdate
)
from app.services.detection import (
    check_impossible_travel,
    check_high_frequency,
    check_code_format
)


router = APIRouter(
    prefix="/scan",
    tags=["Scans"]
)


@router.post("/", response_model=ScanResponse)
def log_scan(
    scan: ScanCreate,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.code == scan.code
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product code not registered"
        )

    flag_reasons = []

    code_format_reason = check_code_format(scan.code)

    if code_format_reason:
        flag_reasons.append(code_format_reason)

    impossible_travel_reason = check_impossible_travel(
        db=db,
        code=scan.code,
        timestamp=scan.timestamp,
        latitude=scan.latitude,
        longitude=scan.longitude
    )

    if impossible_travel_reason:
        flag_reasons.append(impossible_travel_reason)

    high_frequency_reason = check_high_frequency(
        db=db,
        code=scan.code,
        timestamp=scan.timestamp
    )

    if high_frequency_reason:
        flag_reasons.append(high_frequency_reason)

    flag_reason = "; ".join(flag_reasons) if flag_reasons else None

    scan_event = ScanEvent(
        code=scan.code,
        timestamp=scan.timestamp,
        latitude=scan.latitude,
        longitude=scan.longitude,
        flagged=bool(flag_reasons),
        flag_reason=flag_reason,
        review_status="PENDING" if flag_reasons else "REVIEWED"
    )

    db.add(scan_event)
    db.commit()
    db.refresh(scan_event)

    return scan_event


@router.get("/", response_model=List[ScanResponse])
def get_scans(
    db: Session = Depends(get_db)
):
    return (
        db.query(ScanEvent)
        .order_by(ScanEvent.timestamp.desc())
        .all()
    )


@router.get("/flags", response_model=List[ScanResponse])
def get_flagged_scans(
    db: Session = Depends(get_db)
):
    return (
        db.query(ScanEvent)
        .filter(ScanEvent.flagged.is_(True))
        .order_by(ScanEvent.timestamp.desc())
        .all()
    )


@router.patch(
    "/{scan_id}/review",
    response_model=ScanResponse
)
def review_scan(
    scan_id: int,
    review: ReviewUpdate,
    db: Session = Depends(get_db)
):
    allowed_statuses = {
        "REVIEWED",
        "DISMISSED"
    }

    if review.review_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Review status must be REVIEWED or DISMISSED"
        )

    scan_event = db.query(ScanEvent).filter(
        ScanEvent.id == scan_id
    ).first()

    if not scan_event:
        raise HTTPException(
            status_code=404,
            detail="Scan event not found"
        )

    scan_event.review_status = review.review_status
    scan_event.review_note = review.review_note
    scan_event.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(scan_event)

    return scan_event