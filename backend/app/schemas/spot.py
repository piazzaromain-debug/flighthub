# spot.py (schemas) — Schémas Pydantic pour création, lecture, détail d'un spot.
from datetime import datetime
from pydantic import BaseModel, Field


class SpotBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category: str = Field(min_length=1, max_length=50)
    country: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class SpotCreate(SpotBase):
    pass


class SpotUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    country: str | None = None
    city: str | None = None
    lat: float | None = None
    lng: float | None = None


class SpotOut(BaseModel):
    id: int
    title: str
    description: str | None
    category: str
    country: str
    city: str
    lat: float
    lng: float
    author_id: int | None
    score: int
    created_at: datetime
