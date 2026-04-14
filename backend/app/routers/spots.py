# spots.py (router) — CRUD spots et requêtes géospatiales.
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from ..schemas.spot import SpotCreate, SpotOut, SpotUpdate
from ..middleware.auth import get_current_user, require_role
from ..services.geo_service import spots_in_radius, spots_in_bbox

router = APIRouter(prefix="/spots", tags=["spots"])


def _row_to_out(row) -> dict:
    return dict(row)


@router.get("", response_model=list[SpotOut])
async def list_spots(
    country: str | None = None,
    city: str | None = None,
    category: str | None = None,
    min_lat: float | None = None,
    min_lng: float | None = None,
    max_lat: float | None = None,
    max_lng: float | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("lecteur")),
):
    if None not in (min_lat, min_lng, max_lat, max_lng):
        rows = await spots_in_bbox(db, min_lat, min_lng, max_lat, max_lng)
        return [_row_to_out(r) for r in rows]

    clauses = []
    params: dict = {}
    if country:
        clauses.append("country = :country"); params["country"] = country
    if city:
        clauses.append("city = :city"); params["city"] = city
    if category:
        clauses.append("category = :category"); params["category"] = category
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = text(f"""
        SELECT id, title, description, category, country, city,
               ST_Y(location::geometry) AS lat,
               ST_X(location::geometry) AS lng,
               author_id, score, created_at
        FROM spots {where}
        ORDER BY score DESC, created_at DESC
    """)
    rows = (await db.execute(sql, params)).mappings().all()
    return [_row_to_out(r) for r in rows]


@router.get("/nearby", response_model=list[SpotOut])
async def nearby(
    lat: float = Query(...), lng: float = Query(...), radius: float = Query(5000),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("lecteur")),
):
    rows = await spots_in_radius(db, lat, lng, radius)
    return [_row_to_out(r) for r in rows]


@router.get("/{spot_id}", response_model=SpotOut)
async def get_spot(spot_id: int, db: AsyncSession = Depends(get_db),
                   _: User = Depends(require_role("lecteur"))):
    sql = text("""
        SELECT id, title, description, category, country, city,
               ST_Y(location::geometry) AS lat,
               ST_X(location::geometry) AS lng,
               author_id, score, created_at
        FROM spots WHERE id = :id
    """)
    row = (await db.execute(sql, {"id": spot_id})).mappings().first()
    if not row:
        raise HTTPException(404, "Spot introuvable")
    return _row_to_out(row)


@router.post("", response_model=SpotOut, status_code=201)
async def create_spot(payload: SpotCreate, db: AsyncSession = Depends(get_db),
                      user: User = Depends(require_role("contributeur"))):
    sql = text("""
        INSERT INTO spots (title, description, category, country, city, location, author_id, score)
        VALUES (:title, :description, :category, :country, :city,
                ST_GeogFromText(:wkt), :author_id, 0)
        RETURNING id, title, description, category, country, city,
                  ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
                  author_id, score, created_at
    """)
    row = (await db.execute(sql, {
        "title": payload.title, "description": payload.description,
        "category": payload.category, "country": payload.country, "city": payload.city,
        "wkt": f"SRID=4326;POINT({payload.lng} {payload.lat})",
        "author_id": user.id,
    })).mappings().first()
    await db.commit()
    return _row_to_out(row)


@router.put("/{spot_id}", response_model=SpotOut)
async def update_spot(spot_id: int, payload: SpotUpdate,
                      db: AsyncSession = Depends(get_db),
                      user: User = Depends(require_role("contributeur"))):
    existing = (await db.execute(text("SELECT author_id FROM spots WHERE id=:id"),
                                 {"id": spot_id})).first()
    if not existing:
        raise HTTPException(404, "Spot introuvable")
    if user.role != "admin" and existing[0] != user.id:
        raise HTTPException(403, "Seul l'auteur ou un admin peut modifier ce spot")

    fields = []
    params: dict = {"id": spot_id}
    for f in ["title", "description", "category", "country", "city"]:
        v = getattr(payload, f)
        if v is not None:
            fields.append(f"{f} = :{f}")
            params[f] = v
    if payload.lat is not None and payload.lng is not None:
        fields.append("location = ST_GeogFromText(:wkt)")
        params["wkt"] = f"SRID=4326;POINT({payload.lng} {payload.lat})"
    if not fields:
        raise HTTPException(400, "Aucun champ à mettre à jour")

    sql = text(f"""
        UPDATE spots SET {', '.join(fields)} WHERE id = :id
        RETURNING id, title, description, category, country, city,
                  ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
                  author_id, score, created_at
    """)
    row = (await db.execute(sql, params)).mappings().first()
    await db.commit()
    return _row_to_out(row)


@router.delete("/{spot_id}", status_code=204)
async def delete_spot(spot_id: int, db: AsyncSession = Depends(get_db),
                      user: User = Depends(require_role("contributeur"))):
    existing = (await db.execute(text("SELECT author_id FROM spots WHERE id=:id"),
                                 {"id": spot_id})).first()
    if not existing:
        raise HTTPException(404, "Spot introuvable")
    if user.role != "admin" and existing[0] != user.id:
        raise HTTPException(403, "Seul l'auteur ou un admin peut supprimer ce spot")
    await db.execute(text("DELETE FROM spots WHERE id=:id"), {"id": spot_id})
    await db.commit()
