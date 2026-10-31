from datetime import datetime

from sqlalchemy import String, Integer, Float, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        index=True
    )

    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )

    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="low"
    )

    source_ip: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
        index=True
    )

    destination_ip: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True
    )

    username: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )

    country: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    device: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    failed_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    bytes_transferred: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    anomaly_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    risk_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    is_suspicious: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )