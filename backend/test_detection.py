
from datetime import datetime

from app.db.database import SessionLocal
from app.models.security_event import SecurityEvent
from app.services.detection_engine import DetectionEngine
from app.services.detection_rules.registry import get_detection_rules
from app.services.incident_service import create_incident


engine = DetectionEngine(get_detection_rules())


test_events = [
    SecurityEvent(
        timestamp=datetime.now(),
        event_type="login_failed",
        severity="medium",
        username="admin",
        source_ip="192.168.1.10",
        failed_attempts=7,
        bytes_transferred=0,
    ),
    SecurityEvent(
        timestamp=datetime.now(),
        event_type="login_failed",
        severity="medium",
        username="sai",
        source_ip="192.168.1.20",
        failed_attempts=3,
        bytes_transferred=0,
    ),
    SecurityEvent(
        timestamp=datetime.now(),
        event_type="data_transfer",
        severity="medium",
        source_ip="10.0.0.5",
        failed_attempts=0,
        bytes_transferred=15_000_000,
    ),
    SecurityEvent(
        timestamp=datetime.now(),
        event_type="port_scan",
        severity="high",
        source_ip="172.16.0.50",
        failed_attempts=0,
        bytes_transferred=0,
    ),
]


db = SessionLocal()

try:

    for index, event in enumerate(test_events, start=1):

        print(f"\n========== EVENT {index} ==========")
        print(f"Event Type: {event.event_type}")

        # Save the security event first
        # This gives the event its database ID.
        db.add(event)
        db.flush()

        print(f"Event ID: {event.id}")

        # Run detection engine
        results = engine.evaluate(event)

        if not results:
            print("No detections.")
            continue

        # Create an incident for every detection
        for result in results:

            print(f"\nRule: {result.rule_name}")
            print(f"Severity: {result.severity}")
            print(f"Confidence: {result.confidence}")
            print(f"Reason: {result.reason}")

            incident = create_incident(
                db=db,
                event=event,
                result=result,
            )

            print(f"Incident Created: {incident.incident_number}")
            print(f"Incident ID: {incident.id}")

finally:
    db.close()

