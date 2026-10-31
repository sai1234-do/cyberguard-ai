
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.incident import Incident
from app.schemas.report import IncidentSummaryResponse


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
)


@router.get(
    "/summary",
    response_model=IncidentSummaryResponse,
)
def get_incident_summary(
    db: Session = Depends(get_db),
):
    total_incidents = (
        db.query(Incident)
        .count()
    )

    open_incidents = (
        db.query(Incident)
        .filter(Incident.status == "open")
        .count()
    )

    investigating_incidents = (
        db.query(Incident)
        .filter(Incident.status == "investigating")
        .count()
    )

    resolved_incidents = (
        db.query(Incident)
        .filter(Incident.status == "resolved")
        .count()
    )

    closed_incidents = (
        db.query(Incident)
        .filter(Incident.status == "closed")
        .count()
    )

    high_severity = (
        db.query(Incident)
        .filter(Incident.severity == "high")
        .count()
    )

    medium_severity = (
        db.query(Incident)
        .filter(Incident.severity == "medium")
        .count()
    )

    low_severity = (
        db.query(Incident)
        .filter(Incident.severity == "low")
        .count()
    )

    incidents = (
        db.query(Incident.risk_score)
        .all()
    )

    if incidents:
        average_risk_score = round(
            sum(
                incident.risk_score
                for incident in incidents
            ) / len(incidents),
            2,
        )
    else:
        average_risk_score = 0.0

    return {
        "total_incidents": total_incidents,

        "open_incidents": open_incidents,
        "investigating_incidents": investigating_incidents,
        "resolved_incidents": resolved_incidents,
        "closed_incidents": closed_incidents,

        "high_severity": high_severity,
        "medium_severity": medium_severity,
        "low_severity": low_severity,

        "average_risk_score": average_risk_score,
    }


@router.get("/attack-types")
def get_attack_type_summary(
    db: Session = Depends(get_db),
):
    results = (
        db.query(
            Incident.attack_type,
            func.count(Incident.id),
        )
        .filter(Incident.attack_type.isnot(None))
        .group_by(Incident.attack_type)
        .all()
    )

    return {
        attack_type: count
        for attack_type, count in results
    }


@router.get("/severity")
def get_severity_summary(
    db: Session = Depends(get_db),
):
    results = (
        db.query(
            Incident.severity,
            func.count(Incident.id),
        )
        .group_by(Incident.severity)
        .all()
    )

    return {
        severity: count
        for severity, count in results
    }


@router.get("/risk")
def get_risk_summary(
    db: Session = Depends(get_db),
):
    result = (
        db.query(
            func.avg(Incident.risk_score),
            func.max(Incident.risk_score),
            func.min(Incident.risk_score),
        )
        .first()
    )

    average_risk, maximum_risk, minimum_risk = result

    return {
        "average_risk_score": round(
            average_risk or 0,
            2,
        ),
        "maximum_risk_score": maximum_risk or 0,
        "minimum_risk_score": minimum_risk or 0,
    }

