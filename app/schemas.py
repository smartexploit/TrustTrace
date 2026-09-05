from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PRODUCT_CODE_PATTERN = r"^TT-[A-Z0-9]{6}$"


class ProductCreate(BaseModel):
    code: str = Field(
        min_length=9,
        max_length=9,
        pattern=PRODUCT_CODE_PATTERN
    )
    product_name: str = Field(
        min_length=1,
        max_length=200
    )
    batch_id: str = Field(
        min_length=1,
        max_length=100
    )


class ProductResponse(BaseModel):
    code: str
    product_name: str
    batch_id: str

    model_config = ConfigDict(from_attributes=True)


class ScanCreate(BaseModel):
    code: str = Field(
        min_length=9,
        max_length=9,
        pattern=PRODUCT_CODE_PATTERN
    )
    timestamp: datetime
    latitude: float = Field(
        ge=-90,
        le=90
    )
    longitude: float = Field(
        ge=-180,
        le=180
    )


class ScanResponse(BaseModel):
    id: int
    code: str
    timestamp: datetime
    latitude: float
    longitude: float
    flagged: bool
    flag_reason: str | None
    review_status: str
    review_note: str | None
    reviewed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ReviewUpdate(BaseModel):
    review_status: Literal["REVIEWED", "DISMISSED"]
    review_note: str | None = Field(
        default=None,
        max_length=500
    )
