
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import hash_password
from app.db.database import Base, engine, SessionLocal
from app.models import (
    User,
    SecurityEvent,
    Incident,
    IncidentEvent,
    AuditLog,
)
from app.api.routes.auth import router as auth_router
from app.api.routes.events import router as events_router
from app.api import reports
from app.api import incidents


def create_initial_admin():
    email = settings.ADMIN_EMAIL
    password = settings.ADMIN_PASSWORD
    full_name = settings.ADMIN_FULL_NAME

    configured = [bool(email), bool(password), bool(full_name)]

    if not any(configured):
        return

    if not all(configured):
        raise RuntimeError(
            "ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_FULL_NAME "
            "must all be configured together."
        )

    if len(password) < 12:
        raise RuntimeError(
            "ADMIN_PASSWORD must contain at least 12 characters."
        )

    db = SessionLocal()

    try:
        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            if existing_user.role != "admin":
                raise RuntimeError(
                    "Configured admin email already belongs "
                    "to a non-admin account."
                )
            return

        admin = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )

        db.add(admin)
        db.commit()

    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    create_initial_admin()

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if settings.FRONTEND_ORIGIN:
    origins.extend(
        origin.strip().rstrip("/")
        for origin in settings.FRONTEND_ORIGIN.split(",")
        if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(events_router)
app.include_router(incidents.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {
        "message": "CyberGuard AI backend is running",
        "version": settings.APP_VERSION,
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CyberGuard AI API",
    }
