
import json

from fastapi import APIRouter, Depends, HTTPException
from groq import Groq
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.roles import UserRole, require_roles
from app.db.database import SessionLocal
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.security_event import SecurityEvent
from app.models.user import User
from app.schemas.incident import (
    IncidentResponse,
    IncidentStatusUpdate,
    IncidentAssignmentUpdate,
)
from app.schemas.security_event import SecurityEventResponse


router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def find_incident(db: Session, incident_id: int) -> Incident:
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return incident


@router.get("/", response_model=list[IncidentResponse])
def get_incidents(db: Session = Depends(get_db)):
    return (
        db.query(Incident)
        .order_by(Incident.created_at.desc())
        .all()
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
):
    return find_incident(db, incident_id)


@router.get(
    "/{incident_id}/events",
    response_model=list[SecurityEventResponse],
)
def get_incident_events(
    incident_id: int,
    db: Session = Depends(get_db),
):
    find_incident(db, incident_id)

    return (
        db.query(SecurityEvent)
        .join(
            IncidentEvent,
            IncidentEvent.event_id == SecurityEvent.id,
        )
        .filter(IncidentEvent.incident_id == incident_id)
        .order_by(SecurityEvent.timestamp.desc())
        .all()
    )


@router.patch(
    "/{incident_id}/status",
    response_model=IncidentResponse,
)
def update_incident_status(
    incident_id: int,
    status_data: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.ADMIN,
            UserRole.SECURITY_ANALYST,
        )
    ),
):
    incident = find_incident(db, incident_id)
    incident.status = status_data.status

    db.commit()
    db.refresh(incident)
    return incident


@router.patch(
    "/{incident_id}/assign",
    response_model=IncidentResponse,
)
def assign_incident(
    incident_id: int,
    assignment_data: IncidentAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.ADMIN,
            UserRole.SECURITY_ANALYST,
        )
    ),
):
    incident = find_incident(db, incident_id)

    user = db.query(User).filter(
        User.id == assignment_data.assigned_to
    ).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot assign incident to an inactive user",
        )

    incident.assigned_to = user.id

    db.commit()
    db.refresh(incident)
    return incident


@router.post(
    "/{incident_id}/analyze",
    response_model=IncidentResponse,
)
def analyze_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.ADMIN,
            UserRole.SECURITY_ANALYST,
        )
    ),
):
    # 1. Verify the selected incident.
    incident = find_incident(db, incident_id)

    # 2. Verify Groq configuration before making a request.
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "Groq API key is not configured. "
                "Add GROQ_API_KEY to the backend .env file."
            ),
        )

    # 3. Retrieve only evidence linked to this incident.
    events = (
        db.query(SecurityEvent)
        .join(
            IncidentEvent,
            IncidentEvent.event_id == SecurityEvent.id,
        )
        .filter(IncidentEvent.incident_id == incident_id)
        .order_by(SecurityEvent.timestamp.desc())
        .limit(30)
        .all()
    )

    evidence = [
        {
            "event_id": event.id,
            "timestamp": (
                event.timestamp.isoformat()
                if event.timestamp else None
            ),
            "event_type": event.event_type,
            "severity": event.severity,
            "source_ip": event.source_ip,
            "destination_ip": event.destination_ip,
            "username": event.username,
            "country": event.country,
            "device": event.device,
            "failed_attempts": event.failed_attempts,
            "bytes_transferred": event.bytes_transferred,
            "anomaly_score": event.anomaly_score,
            "risk_score": event.risk_score,
            "is_suspicious": event.is_suspicious,
            "description": event.description,
        }
        for event in events
    ]

    incident_context = {
        "incident_number": incident.incident_number,
        "title": incident.title,
        "description": incident.description,
        "severity": incident.severity,
        "status": incident.status,
        "risk_score": incident.risk_score,
        "attack_type": incident.attack_type,
        "related_event_count": len(evidence),
        "related_events": evidence,
    }

    # 4. Ask Groq for an evidence-grounded analysis.
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a cybersecurity incident response "
                        "assistant supporting a human security analyst. "
                        "Analyze only the supplied incident and evidence. "
                        "Do not invent facts, claim actions have been "
                        "performed, or treat missing data as proof. "
                        "Distinguish observed evidence from hypotheses. "
                        "Provide practical, defensive recommendations. "
                        "Return valid JSON with exactly these keys: "
                        '"summary" (a concise incident explanation) and '
                        '"recommendations" (an array of 3 to 5 '
                        "prioritized defensive actions)."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        incident_context,
                        ensure_ascii=False,
                    ),
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1200,
        )

        content = completion.choices[0].message.content

        if not content:
            raise ValueError("Groq returned an empty response.")

        result = json.loads(content)

        summary = result.get("summary")
        recommendations = result.get("recommendations")

        if (
            not isinstance(summary, str)
            or not summary.strip()
            or not isinstance(recommendations, list)
            or not recommendations
            or not all(
                isinstance(item, str) and item.strip()
                for item in recommendations
            )
        ):
            raise ValueError(
                "Groq returned an invalid analysis structure."
            )

        # 5. Save the analysis to this incident only.
        incident.ai_summary = summary.strip()
        incident.ai_recommendations = "\n".join(
            f"{index}. {item.strip()}"
            for index, item in enumerate(recommendations, start=1)
        )

        db.commit()
        db.refresh(incident)

        return incident

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()

        # Keep detailed provider errors in the backend logs,
        # rather than exposing credentials or internals to clients.
        print(f"Incident AI analysis failed: {type(exc).__name__}: {exc}")

        raise HTTPException(
            status_code=502,
            detail=(
                "AI analysis failed. Check the backend terminal "
                "for the provider error, then retry."
            ),
        ) from exc
