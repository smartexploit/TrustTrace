from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.models.scan_event import ScanEvent


class VerificationResponse(BaseModel):
    code: str
    registered: bool
    product_name: Optional[str] = None
    batch_id: Optional[str] = None
    status: str
    message: str
    last_scan_flagged: bool = False
    last_scan_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


router = APIRouter(
    prefix="/verify",
    tags=["Verification"]
)


@router.get("/{code}", response_model=VerificationResponse)
def verify_product(
    code: str,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.code == code
    ).first()

    if not product:
        return VerificationResponse(
            code=code,
            registered=False,
            status="UNKNOWN",
            message="This product code is not registered with TrustTrace."
        )

    latest_scan = (
        db.query(ScanEvent)
        .filter(ScanEvent.code == code)
        .order_by(ScanEvent.timestamp.desc())
        .first()
    )

    if latest_scan and latest_scan.flagged:
        return VerificationResponse(
            code=product.code,
            registered=True,
            product_name=product.product_name,
            batch_id=product.batch_id,
            status="SUSPICIOUS",
            message="This product code is registered, but recent scan activity has been flagged for investigation.",
            last_scan_flagged=True,
            last_scan_reason=latest_scan.flag_reason
        )

    return VerificationResponse(
        code=product.code,
        registered=True,
        product_name=product.product_name,
        batch_id=product.batch_id,
        status="AUTHENTIC",
        message="This product code is registered with TrustTrace and no suspicious activity was found in the latest scan record."
    )
