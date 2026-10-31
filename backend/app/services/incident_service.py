import re

from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.security_event import SecurityEvent
from app.services.detection_result import DetectionResult


def create_incident(
    db: Session,
    event: SecurityEvent,
    result: DetectionResult,
) -> Incident:

    # Convert rule name into a clean incident code.
    # Example:
    # "Brute Force Detection"
    # → "BRUTE-FORCE-DETECTION"
    rule_code = re.sub(
        r"[^A-Z0-9]+",
        "-",
        result.rule_name.upper()
    ).strip("-")

    # Example:
    # INC-000007-BRUTE-FORCE-DETECTION
    incident_number = f"INC-{event.id:06d}-{rule_code}"

    incident = Incident(
        incident_number=incident_number,
        title=result.rule_name,
        description=result.reason,
        severity=result.severity,
        status="open",
        risk_score=result.confidence * 100,
        attack_type=result.rule_name,
    )

    db.add(incident)
    db.flush()

    incident_event = IncidentEvent(
        incident_id=incident.id,
        event_id=event.id,
    )

    db.add(incident_event)

    db.commit()
    db.refresh(incident)

    return incident