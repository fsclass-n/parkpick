from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LoginIn(BaseModel):
    email: str
    password: str


class SignupIn(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str
    name: str = Field(min_length=1, max_length=100)
    plate: str | None = None


class TestLoginIn(BaseModel):
    kind: Literal["user", "test_admin"]


class AdminKeyIn(BaseModel):
    admin_key: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    name: str
    role: str
    provider: str
    plate: str | None = None
    created_at: datetime
    last_login_at: datetime | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    plate: str | None = None


class RoleUpdateIn(BaseModel):
    role: Literal["user", "admin"]


class SpaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    floor: str
    zone: str
    kind: str
    status: str
    x: int
    y: int
    occupied_since: datetime | None = None
    updated_at: datetime


class SpaceUpdateIn(BaseModel):
    kind: Literal["normal", "disabled", "ev", "reserved"] | None = None
    status: Literal["empty", "occupied"] | None = None


class EventUpdateIn(BaseModel):
    status: Literal["open", "resolved"]


class CameraIn(BaseModel):
    name: str
    floor: str
    zone: str
    stream_url: str | None = None
    roi: list = []
    active: bool = True


class ModelConfigIn(BaseModel):
    version: str
    conf_threshold: float = Field(ge=0.05, le=0.95)
    metrics: dict = {}


class ReportIn(BaseModel):
    period: Literal["daily", "weekly"] = "daily"


class OccupancyItem(BaseModel):
    space: str
    occupied: bool
    plate: str | None = None
    confidence: float = 0.0


class IngestIn(BaseModel):
    camera: str
    items: list[OccupancyItem]
