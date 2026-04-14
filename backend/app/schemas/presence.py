# presence.py (schemas) — Schémas Pydantic pour création et affichage des présences.
from datetime import datetime
from pydantic import BaseModel, Field


class PresenceCreate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    message: str | None = Field(default=None, max_length=500)
    starts_at: datetime
    ends_at: datetime


class PresenceOut(BaseModel):
    id: int
    user_id: int
    username: str | None = None
    lat: float
    lng: float
    message: str | None
    starts_at: datetime
    ends_at: datetime
    created_at: datetime
