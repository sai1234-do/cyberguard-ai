import csv
import io
from datetime import datetime

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.security_event import SecurityEvent


REQUIRED_COLUMNS = {
    "timestamp",
    "event_type",
}


def parse_bool(value: str | None) -> bool:
    if value is None:
        return False

    return value.strip().lower() in {
        "true",
        "1",
        "yes",
        "y",
    }


def parse_int(value: str | None, default: int = 0) -> int:
    if value is None or value.strip() == "":
        return default

    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default


def parse_float(
    value: str | None,
) -> float | None:
    if value is None or value.strip() == "":
        return None

    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def parse_timestamp(value: str) -> datetime:
    value = value.strip()

    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(value)
    except ValueError:
        raise ValueError(
            f"Invalid timestamp format: {value}"
        )


async def ingest_security_events(
    file: UploadFile,
    db: Session,
) -> dict:

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided.",
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded CSV file is empty.",
        )

    try:
        decoded_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="CSV file must use UTF-8 encoding.",
        )

    reader = csv.DictReader(
        io.StringIO(decoded_content)
    )

    if not reader.fieldnames:
        raise HTTPException(
            status_code=400,
            detail="CSV file has no header row.",
        )

    csv_columns = {
        column.strip()
        for column in reader.fieldnames
        if column
    }

    missing_columns = REQUIRED_COLUMNS - csv_columns

    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "CSV is missing required columns.",
                "missing_columns": sorted(missing_columns),
                "required_columns": sorted(REQUIRED_COLUMNS),
            },
        )

    events = []
    total_rows = 0
    failed_rows = 0

    for row_number, row in enumerate(reader, start=2):

        total_rows += 1

        try:
            timestamp = parse_timestamp(
                row["timestamp"]
            )

            event_type = (
                row["event_type"] or ""
            ).strip()

            if not event_type:
                raise ValueError(
                    "event_type cannot be empty"
                )

            event = SecurityEvent(
                timestamp=timestamp,
                event_type=event_type,

                severity=(
                    row.get("severity")
                    or "low"
                ).strip().lower(),

                source_ip=(
                    row.get("source_ip")
                    or None
                ),

                destination_ip=(
                    row.get("destination_ip")
                    or None
                ),

                username=(
                    row.get("username")
                    or None
                ),

                country=(
                    row.get("country")
                    or None
                ),

                device=(
                    row.get("device")
                    or None
                ),

                failed_attempts=parse_int(
                    row.get("failed_attempts")
                ),

                bytes_transferred=parse_int(
                    row.get("bytes_transferred")
                ),

                anomaly_score=parse_float(
                    row.get("anomaly_score")
                ),

                risk_score=parse_float(
                    row.get("risk_score")
                ),

                is_suspicious=parse_bool(
                    row.get("is_suspicious")
                ),

                description=(
                    row.get("description")
                    or None
                ),
            )

            events.append(event)

        except Exception as exc:
            failed_rows += 1

            print(
                f"Skipping CSV row {row_number}: {exc}"
            )

    if events:
        db.add_all(events)
        db.commit()

    return {
        "message": "Security events imported successfully.",
        "total_rows": total_rows,
        "inserted_rows": len(events),
        "failed_rows": failed_rows,
    }