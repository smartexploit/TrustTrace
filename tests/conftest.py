import os

os.environ["DATABASE_URL"] = "sqlite:///./data/test_trusttrace.db"
os.environ["TRUSTTRACE_SECRET_KEY"] = "ci-test-secret-not-used-in-production"

import pytest

from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.auth.security import hash_password


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    users = [
        User(
            email="admin@trusttrace.com",
            password_hash=hash_password("TrustTraceAdmin123!"),
            role="super_admin",
            is_active=True,
        ),
        User(
            email="backend-test@trusttrace.com",
            password_hash=hash_password("BackendTest123!"),
            role="staff",
            is_active=True,
        ),
    ]

    db.add_all(users)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)
