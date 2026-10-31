from pydantic import BaseModel


class IncidentSummaryResponse(BaseModel):
    total_incidents: int

    open_incidents: int
    investigating_incidents: int
    resolved_incidents: int
    closed_incidents: int

    high_severity: int
    medium_severity: int
    low_severity: int

    average_risk_score: float