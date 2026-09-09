from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import Base, engine
from app.models.user import User
from app.models.product import Product
from app.models.scan_event import ScanEvent

from app.routers.auth import router as auth_router
from app.routers.products import router as products_router
from app.routers.scans import router as scans_router
from app.routers.verification import router as verification_router


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="TrustTrace API",
    description="AI-powered counterfeit and distribution fraud detection system",
    version="1.0.0"
)


# Serve static files
app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static"
)


# =========================
# Web Pages
# =========================

@app.get("/")
def dashboard():
    return FileResponse("app/static/index.html")


@app.get("/login")
def login_page():
    return FileResponse("app/static/login.html")


@app.get("/verify")
def verification_page():
    return FileResponse("app/static/verify.html")


@app.get("/qr")
def qr_management_page():
    return FileResponse("app/static/qr.html")


@app.get("/scanner")
def scanner_page():
    return FileResponse("app/static/scanner.html")


# =========================
# API Routers
# =========================

app.include_router(auth_router)
app.include_router(products_router)
app.include_router(scans_router)
app.include_router(verification_router)