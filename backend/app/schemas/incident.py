from datetime import datetime

from pydantic import BaseModel, ConfigDict


class IncidentResponse(BaseModel):
    id: int
    incident_number: str
    title: str
    description: str | None
    severity: str
    status: str
    risk_score: float
    attack_type: str | None
    assigned_to: int | None
    ai_summary: str | None
    ai_recommendations: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


from typing import Literal


class IncidentStatusUpdate(BaseModel):
    status: Literal[
        "open",
        "investigating",
        "resolved",
        "closed",
    ]

class IncidentAssignmentUpdate(BaseModel):
    assigned_to: int