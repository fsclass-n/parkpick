from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(190), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="user")  # user | admin | test_admin
    provider: Mapped[str] = mapped_column(String(20), default="local")  # local | google | naver | kakao
    plate: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ParkingLot(Base):
    __tablename__ = "parking_lots"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    address: Mapped[str] = mapped_column(String(200))
    floors: Mapped[list] = mapped_column(JSON)
    entrance: Mapped[dict] = mapped_column(JSON)  # {"x": .., "y": ..}


class Space(Base):
    __tablename__ = "spaces"
    id: Mapped[int] = mapped_column(primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("parking_lots.id"), index=True)
    floor: Mapped[str] = mapped_column(String(10), index=True)
    zone: Mapped[str] = mapped_column(String(10))
    code: Mapped[str] = mapped_column(String(20), unique=True)
    kind: Mapped[str] = mapped_column(String(20), default="normal")  # normal | disabled | ev | reserved
    status: Mapped[str] = mapped_column(String(20), default="empty")  # empty | occupied
    plate: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    x: Mapped[int] = mapped_column(Integer)
    y: Mapped[int] = mapped_column(Integer)
    occupied_since: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Camera(Base):
    __tablename__ = "cameras"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    floor: Mapped[str] = mapped_column(String(10))
    zone: Mapped[str] = mapped_column(String(10))
    stream_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    roi: Mapped[list] = mapped_column(JSON, default=list)  # [{"space": "B1-A01", "polygon": [[x,y],...]}]
    active: Mapped[bool] = mapped_column(default=True)


class ParkingEvent(Base):
    __tablename__ = "parking_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(30))  # long_parking | illegal_parking | wrong_way
    severity: Mapped[str] = mapped_column(String(10), default="medium")  # low | medium | high
    space_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    plate: Mapped[str | None] = mapped_column(String(20), nullable=True)
    camera: Mapped[str | None] = mapped_column(String(100), nullable=True)
    message: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(20), default="open")  # open | resolved
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class EntryLog(Base):
    __tablename__ = "entry_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    plate: Mapped[str] = mapped_column(String(20), index=True)
    space_code: Mapped[str] = mapped_column(String(20))
    entered_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    exited_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    plate_confidence: Mapped[float] = mapped_column(Float, default=0.0)


class ModelConfig(Base):
    __tablename__ = "model_configs"
    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[str] = mapped_column(String(50))
    conf_threshold: Mapped[float] = mapped_column(Float, default=0.45)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    period: Mapped[str] = mapped_column(String(10))  # daily | weekly
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20), default="template")  # gemini | template
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_email: Mapped[str] = mapped_column(String(190))
    action: Mapped[str] = mapped_column(String(50))
    target: Mapped[str] = mapped_column(String(200))
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
