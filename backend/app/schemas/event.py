from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SecurityEventBase(BaseModel):
    timestamp: datetime
    event_type: str
    severity: str
    source_ip: str | None = None
    destination_ip: str | None = None
    username: str | None = None
    country: str | None = None
    device: str | None = None
    failed_attempts: int = 0
    bytes_transferred: int = 0
    anomaly_score: float | None = None
    risk_score: float | None = None
    is_suspicious: bool = False
    description: str | None = None


class SecurityEventResponse(SecurityEventBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecurityEventListResponse(BaseModel):
    items: list[SecurityEventResponse]

    total: int
    page: int
    page_size: int
    total_pages: int