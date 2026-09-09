from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
    require_roles
)
from app.auth.schemas import (
    UserCreate,
    UserResponse,
    LoginRequest,
    TokenResponse
)
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token
)
from app.database import get_db
from app.models.user import User


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


ALLOWED_ROLES = {
    "super_admin",
    "brand_admin",
    "investigator",
    "staff"
}


@router.post(
    "/register",
    response_model=UserResponse,
    dependencies=[
        Depends(require_roles("super_admin"))
    ]
)
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    if user.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid user role"
        )

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User email already exists"
        )

    new_user = User(
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get(
    "/users",
    response_model=list[UserResponse],
    dependencies=[
        Depends(require_roles("super_admin"))
    ]
)
def get_users(
    db: Session = Depends(get_db)
):
    return db.query(User).order_by(
        User.id.asc()
    ).all()


@router.get(
    "/me",
    response_model=UserResponse
)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == credentials.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        credentials.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    token = create_access_token(
        user_id=user.id,
        role=user.role
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }
