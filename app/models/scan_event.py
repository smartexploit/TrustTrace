from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from app.database import Base


class ScanEvent(Base):
    __tablename__ = "scan_events"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, ForeignKey("products.code"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    flagged = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(String, nullable=True)

    review_status = Column(
        String,
        nullable=False,
        default="PENDING"
    )

    review_note = Column(
        String,
        nullable=True
    )

    reviewed_at = Column(
        DateTime,
        nullable=True
    )