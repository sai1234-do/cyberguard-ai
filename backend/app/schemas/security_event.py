from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SecurityEventResponse(BaseModel):
    id: int
    timestamp: datetime
    event_type: str
    severity: str
    source_ip: str | None
    destination_ip: str | None
    username: str | None
    country: str | None
    device: str | None
    failed_attempts: int
    bytes_transferred: int
    anomaly_score: float | None
    risk_score: float | None
    is_suspicious: bool
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)