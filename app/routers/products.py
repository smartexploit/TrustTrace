from io import BytesIO
from typing import List
from urllib.parse import quote

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
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


@router.get("/{code}/qr")
def generate_product_qr(
    code: str,
    request: Request,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.code == code
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product code not registered"
        )

    verification_url = (
        f"{str(request.base_url).rstrip('/')}/verify?code={quote(product.code)}"
    )

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4
    )
    qr.add_data(verification_url)
    qr.make(fit=True)

    image = qr.make_image(fill_color="black", back_color="white")
    image_buffer = BytesIO()
    image.save(image_buffer, format="PNG")
    image_buffer.seek(0)

    return StreamingResponse(
        image_buffer,
        media_type="image/png",
        headers={
            "Content-Disposition": (
                f'inline; filename="{product.code}-trusttrace-qr.png"'
            )
        }
    )
