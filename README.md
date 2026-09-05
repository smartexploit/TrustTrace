# TrustTrace

**AI-powered product authenticity and distribution fraud detection system.**

TrustTrace is a FastAPI-based product verification platform that uses unique product codes, QR verification, scan-event monitoring, and detection intelligence to identify potentially suspicious product activity.

## Features

- Product registration and management
- QR code generation and mobile verification
- Product authenticity verification
- Scan event logging
- Impossible-travel detection
- High-frequency scan detection
- Flagged scan investigation
- Scan review workflow
- PostgreSQL production persistence
- FastAPI REST API and Swagger documentation
- Responsive web dashboard

## Technology Stack

Python · FastAPI · SQLAlchemy · PostgreSQL · Pydantic · Uvicorn · QRCode · Pillow · HTML · CSS · JavaScript · Pytest

## Project Structure

```text
TrustTrace/
├── app/
│   ├── models/
│   ├── routers/
│   ├── services/
│   ├── static/
│   ├── database.py
│   ├── schemas.py
│   └── main.py
├── tests/
├── docs/
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
└── requirements.txt
Local Setup
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload

Dashboard:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs
Detection Intelligence
Impossible Travel

Detects unrealistic product movement.

Threshold: 100 km or more within 30 minutes or less.

High-Frequency Scanning

Detects unusually frequent scans of the same product.

Threshold: 5 or more scans within 10 minutes.

API
Method    Endpoint    Purpose
GET    /    Dashboard
GET    /verify    Verification page
GET    /qr    QR management
GET    /scanner    Scanner
GET    /products/    List products
POST    /products/    Register product
GET    /products/{code}/qr    Generate QR
GET    /scan/    List scans
POST    /scan/    Log scan
GET    /scan/flags    Flagged scans
PATCH    /scan/{scan_id}/review    Review scan
GET    /verify/{code}    Verify product
Product Codes

TrustTrace codes use:

TT-ABC123

Format: TT- followed by six uppercase letters or numbers.

Testing
pytest
python -m py_compile app\main.py app\schemas.py
git diff --check
Production

TrustTrace uses PostgreSQL in production and environment variables for configuration. The current deployment runs on Render.

Never commit .env, passwords, API keys, database credentials, or local database files.

Security

See SECURITY.md.

Contributing

See CONTRIBUTING.md.

License

MIT License.

TrustTrace — Verify products. Detect suspicious activity. Build trust.
