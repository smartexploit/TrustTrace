from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.schemas import ProductCreate, ProductResponse


router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


@router.post("/", response_model=ProductResponse)
def register_product(
    product: ProductCreate,
    db: Session = Depends(get_db)
):
    existing_product = db.query(Product).filter(
        Product.code == product.code
    ).first()

    if existing_product:
        raise HTTPException(
            status_code=400,
            detail="Product code already exists"
        )

    new_product = Product(
        code=product.code,
        product_name=product.product_name,
        batch_id=product.batch_id
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return new_product


@router.get("/", response_model=List[ProductResponse])
def get_products(
    db: Session = Depends(get_db)
):
    return (
        db.query(Product)
        .order_by(Product.code.asc())
        .all()
    )