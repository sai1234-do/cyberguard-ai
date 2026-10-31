from datetime import datetime

from app.db.database import SessionLocal
from app.models.security_event import SecurityEvent
from app.services.detection_result import DetectionResult
from app.services.incident_service import create_incident


db = SessionLocal() ## its important to create a new session for each test to ensure isolation and avoid side effects

try:
    # Create a test security event
    event = SecurityEvent(
        timestamp=datetime.now(),
        event_type="login_failed",
        severity="high",
        username="admin",
        source_ip="192.168.1.10",
        failed_attempts=7,
        bytes_transferred=0,
        description="Multiple failed login attempts detected",
    )

    db.add(event)
    db.flush() # it is used because we need the event.id to be generated before we can create the incident. 
    # flush() sends the pending changes to the database but does not commit them, allowing us to access the generated primary key (event.id) for the newly added SecurityEvent instance.

    # Simulate a detection rule result
    result = DetectionResult(
        detected=True,
        rule_name="Brute Force Detection",
        severity="high",
        confidence=0.95,
        reason="7 failed login attempts detected for the same user.",
    )

    # Create incident
    incident = create_incident(
        db=db,
        event=event,
        result=result,
    )

    print("\n========== INCIDENT CREATED ==========")
    print(f"Incident ID: {incident.id}")
    print(f"Incident Number: {incident.incident_number}")
    print(f"Title: {incident.title}")
    print(f"Severity: {incident.severity}")
    print(f"Risk Score: {incident.risk_score}")
    print(f"Status: {incident.status}")
    print("======================================\n")

finally:
    db.close()