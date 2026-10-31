from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import Base, engine
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

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