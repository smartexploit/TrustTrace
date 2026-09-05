from sqlalchemy import Column, String
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    code = Column(String, primary_key=True, index=True)
    product_name = Column(String, nullable=False)
    batch_id = Column(String, nullable=False)