import os

from sqlalchemy import inspect, text

from fastapi import FastAPI

from fastapi.staticfiles import StaticFiles

from fastapi.responses import FileResponse

from app.database import (
    Base,
    engine,
    SessionLocal
)

from app.models.user import User
from app.models.product import Product
from app.models.scan_event import ScanEvent

from app.auth.security import hash_password

from app.routers.auth import (
    router as auth_router
)

from app.routers.products import (
    router as products_router
)

from app.routers.scans import (
    router as scans_router
)

from app.routers.verification import (
    router as verification_router
)


# =========================================================
# DATABASE SETUP
# =========================================================

Base.metadata.create_all(
    bind=engine
)


def migrate_scan_events():
    """
    Add new ScanEvent columns safely without
    deleting existing scan data.
    """

    inspector = inspect(engine)

    if "scan_events" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(
            "scan_events"
        )
    }

    if "location_accuracy" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    ALTER TABLE scan_events
                    ADD COLUMN location_accuracy
                    FLOAT
                    """
                )
            )

        print(
            "Database migration complete: "
            "added scan_events.location_accuracy"
        )


migrate_scan_events()


# =========================================================
# TEMPORARY PRODUCTION ADMIN SEED
# =========================================================

def seed_admin():

    email = os.getenv(
        "TRUSTTRACE_ADMIN_EMAIL"
    )

    password = os.getenv(
        "TRUSTTRACE_ADMIN_PASSWORD"
    )

    if not email or not password:
        return

    db = SessionLocal()

    try:

        existing_user = (
            db.query(User)
            .filter(
                User.email == email
            )
            .first()
        )

        if not existing_user:

            admin = User(
                email=email,
                password_hash=hash_password(
                    password
                ),
                role="super_admin",
                is_active=True
            )

            db.add(admin)
            db.commit()

            print(
                f"Production admin created: {email}"
            )

    finally:
        db.close()


seed_admin()


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="TrustTrace API",
    description=(
        "AI-powered counterfeit and "
        "distribution fraud detection system"
    ),
    version="1.0.0"
)


# =========================================================
# STATIC FILES
# =========================================================

app.mount(
    "/static",
    StaticFiles(
        directory="app/static"
    ),
    name="static"
)


# =========================================================
# WEB PAGES
# =========================================================

@app.get("/")
def dashboard():
    return FileResponse(
        "app/static/index.html"
    )


@app.get("/login")
def login_page():
    return FileResponse(
        "app/static/login.html"
    )


@app.get("/verify")
def verification_page():
    return FileResponse(
        "app/static/verify.html"
    )


@app.get("/qr")
def qr_management_page():
    return FileResponse(
        "app/static/qr.html"
    )


@app.get("/scanner")
def scanner_page():
    return FileResponse(
        "app/static/scanner.html"
    )


# =========================================================
# API ROUTERS
# =========================================================

app.include_router(
    auth_router
)

app.include_router(
    products_router
)

app.include_router(
    scans_router
)

app.include_router(
    verification_router
)