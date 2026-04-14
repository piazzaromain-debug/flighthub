# presences.py (router) — Gestion des présences actives (signalement de voyageurs).
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from ..schemas.presence import PresenceCreate, PresenceOut
from ..middleware.auth import require_role
from ..services.geo_service import active_presences_in_radius

router = APIRouter(prefix="/presences", tags=["presences"])


@router.get("/active", response_model=list[PresenceOut])
async def active(
    lat: float = Query(...), lng: float = Query(...), radius: float = Query(10000),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("lecteur")),
):
    rows = await active_presences_in_radius(db, lat, lng, radius)
    return [dict(r) for r in rows]


@router.post("", response_model=PresenceOut, status_code=201)
async def create_presence(payload: PresenceCreate,
                          db: AsyncSession = Depends(get_db),
                          user: User = Depends(require_role("contributeur"))):
    if payload.ends_at <= payload.starts_at:
        raise HTTPException(400, "ends_at doit être après starts_at")
    if payload.ends_at - payload.starts_at > timedelta(hours=24):
        raise HTTPException(400, "Durée max : 24h")

    sql = text("""
        INSERT INTO presences (user_id, location, message, starts_at, ends_at)
        VALUES (:uid, ST_GeogFromText(:wkt), :msg, :s, :e)
        RETURNING id, user_id,
                  ST_Y(location::geometry) AS lat,
                  ST_X(location::geometry) AS lng,
                  message, starts_at, ends_at, created_at
    """)
    row = (await db.execute(sql, {
        "uid": user.id, "wkt": f"SRID=4326;POINT({payload.lng} {payload.lat})",
        "msg": payload.message, "s": payload.starts_at, "e": payload.ends_at,
    })).mappings().first()
    await db.commit()
    out = dict(row); out["username"] = user.username
    return out


@router.delete("/{presence_id}", status_code=204)
async def delete_presence(presence_id: int,
                          db: AsyncSession = Depends(get_db),
                          user: User = Depends(require_role("contributeur"))):
    existing = (await db.execute(text("SELECT user_id FROM presences WHERE id=:id"),
                                 {"id": presence_id})).first()
    if not existing:
        raise HTTPException(404, "Présence introuvable")
    if user.role != "admin" and existing[0] != user.id:
        raise HTTPException(403, "Seul l'auteur ou un admin peut supprimer cette présence")
    await db.execute(text("DELETE FROM presences WHERE id=:id"), {"id": presence_id})
    await db.commit()
