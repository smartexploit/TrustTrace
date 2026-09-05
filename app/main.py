from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routers.products import router as products_router
from app.routers.scans import router as scans_router
from app.routers.verification import router as verification_router


app = FastAPI(
    title="TrustTrace API",
    description="AI-powered counterfeit and distribution fraud detection system",
    version="1.0.0"
)


app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static"
)


@app.get("/")
def dashboard():
    return FileResponse("app/static/index.html")


@app.get("/verify")
def verification_page():
    return FileResponse("app/static/verify.html")


@app.get("/qr")
def qr_management_page():
    return FileResponse("app/static/qr.html")


@app.get("/scanner")
def scanner_page():
    return FileResponse("app/static/scanner.html")


app.include_router(products_router)
app.include_router(scans_router)
app.include_router(verification_router)
