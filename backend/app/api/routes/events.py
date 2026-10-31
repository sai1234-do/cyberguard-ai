import csv
import io
from datetime import datetime
from math import ceil

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.security_event import SecurityEvent
from app.models.user import User
from app.schemas.event import (
    SecurityEventListResponse,
    SecurityEventResponse,
)
from app.services.detection_engine import DetectionEngine
from app.services.detection_rules.registry import get_detection_rules
from app.services.incident_service import create_incident


router = APIRouter(
    prefix="/events",
    tags=["Security Events"],
)


# ============================================================
# CSV UPLOAD
# ============================================================

@router.post("/upload")
async def upload_security_events(
    file: UploadFile = File(...),

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file selected.",
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported.",
        )

    try:
        contents = await file.read()
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must use UTF-8 encoding.",
        )

    try:
        reader = csv.DictReader(io.StringIO(decoded))

        if not reader.fieldnames:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file is empty or has no header row.",
            )

        required_columns = {
            "timestamp",
            "event_type",
            "severity",
        }

        missing_columns = required_columns - set(reader.fieldnames)

        if missing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Missing required columns: "
                    + ", ".join(sorted(missing_columns))
                ),
            )

        detection_engine = DetectionEngine(
            get_detection_rules()
        )

        events_created = 0
        incidents_created = 0

        for row_number, row in enumerate(reader, start=2):

            try:
                timestamp = datetime.fromisoformat(
                    row["timestamp"].strip()
                )

                event = SecurityEvent(
                    timestamp=timestamp,
                    event_type=row["event_type"].strip(),
                    severity=row["severity"].strip(),

                    source_ip=(
                        row.get("source_ip") or None
                    ),

                    destination_ip=(
                        row.get("destination_ip") or None
                    ),

                    username=(
                        row.get("username") or None
                    ),

                    country=(
                        row.get("country") or None
                    ),

                    device=(
                        row.get("device") or None
                    ),

                    failed_attempts=int(
                        row.get("failed_attempts") or 0
                    ),

                    bytes_transferred=int(
                        row.get("bytes_transferred") or 0
                    ),

                    description=(
                        row.get("description") or None
                    ),
                )

            except (ValueError, TypeError) as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Invalid data on CSV row "
                        f"{row_number}: {exc}"
                    ),
                )

            db.add(event)
            db.flush()

            events_created += 1

            detection_results = detection_engine.evaluate(
                event
            )

            if detection_results:

                event.is_suspicious = True

                highest_confidence = max(
                    result.confidence
                    for result in detection_results
                )

                event.risk_score = (
                    highest_confidence * 100
                )

                for result in detection_results:

                    create_incident(
                        db=db,
                        event=event,
                        result=result,
                    )

                    incidents_created += 1

        db.commit()

        return {
            "message": "Security data uploaded successfully.",
            "filename": file.filename,
            "events_created": events_created,
            "incidents_created": incidents_created,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process CSV: {exc}",
        )


# ============================================================
# GET SECURITY EVENTS
# ============================================================

@router.get(
    "",
    response_model=SecurityEventListResponse,
)
def get_security_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),

    search: str | None = Query(
        None,
        description=(
            "Search event type, username, source IP, "
            "destination IP, country, or description"
        ),
    ),

    severity: str | None = Query(
        None,
        description="Filter by severity",
    ),

    event_type: str | None = Query(
        None,
        description="Filter by event type",
    ),

    is_suspicious: bool | None = Query(
        None,
        description="Filter suspicious events",
    ),

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),
):
    query = select(SecurityEvent)

    # SEARCH
    if search:
        search_pattern = f"%{search}%"

        query = query.where(
            or_(
                SecurityEvent.event_type.ilike(
                    search_pattern
                ),
                SecurityEvent.username.ilike(
                    search_pattern
                ),
                SecurityEvent.source_ip.ilike(
                    search_pattern
                ),
                SecurityEvent.destination_ip.ilike(
                    search_pattern
                ),
                SecurityEvent.country.ilike(
                    search_pattern
                ),
                SecurityEvent.description.ilike(
                    search_pattern
                ),
            )
        )

    # SEVERITY FILTER
    if severity:
        query = query.where(
            SecurityEvent.severity == severity
        )

    # EVENT TYPE FILTER
    if event_type:
        query = query.where(
            SecurityEvent.event_type == event_type
        )

    # SUSPICIOUS FILTER
    if is_suspicious is not None:
        query = query.where(
            SecurityEvent.is_suspicious == is_suspicious
        )

    # COUNT
    count_query = select(
        func.count()
    ).select_from(
        query.subquery()
    )

    total = db.scalar(count_query) or 0

    # PAGINATION
    total_pages = ceil(total / page_size) if total else 0

    offset = (page - 1) * page_size

    query = (
        query
        .order_by(SecurityEvent.timestamp.desc())
        .offset(offset)
        .limit(page_size)
    )

    events = db.scalars(query).all()

    return SecurityEventListResponse(
        items=events,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ============================================================
# GET SINGLE EVENT
# ============================================================

@router.get(
    "/{event_id}",
    response_model=SecurityEventResponse,
)
def get_security_event(
    event_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),
):
    event = db.get(
        SecurityEvent,
        event_id,
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Security event not found",
        )

    return event