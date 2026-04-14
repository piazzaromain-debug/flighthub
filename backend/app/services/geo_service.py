# geo_service.py — Helpers SQL PostGIS (rayon, bbox, extraction lat/lng).
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def spots_in_radius(db: AsyncSession, lat: float, lng: float, radius_m: float):
    """Retourne les spots dans un rayon (mètres) autour d'un point."""
    sql = text("""
        SELECT id, title, description, category, country, city,
               ST_Y(location::geometry) AS lat,
               ST_X(location::geometry) AS lng,
               author_id, score, created_at
        FROM spots
        WHERE ST_DWithin(location, ST_GeogFromText(:wkt), :radius)
        ORDER BY score DESC
    """)
    wkt = f"SRID=4326;POINT({lng} {lat})"
    result = await db.execute(sql, {"wkt": wkt, "radius": radius_m})
    return result.mappings().all()


async def spots_in_bbox(db: AsyncSession, min_lat: float, min_lng: float, max_lat: float, max_lng: float):
    sql = text("""
        SELECT id, title, description, category, country, city,
               ST_Y(location::geometry) AS lat,
               ST_X(location::geometry) AS lng,
               author_id, score, created_at
        FROM spots
        WHERE ST_Intersects(
            location::geometry,
            ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326)
        )
    """)
    result = await db.execute(sql, {
        "min_lat": min_lat, "min_lng": min_lng,
        "max_lat": max_lat, "max_lng": max_lng,
    })
    return result.mappings().all()


async def active_presences_in_radius(db: AsyncSession, lat: float, lng: float, radius_m: float):
    sql = text("""
        SELECT p.id, p.user_id, u.username,
               ST_Y(p.location::geometry) AS lat,
               ST_X(p.location::geometry) AS lng,
               p.message, p.starts_at, p.ends_at, p.created_at
        FROM presences p
        JOIN users u ON u.id = p.user_id
        WHERE p.ends_at > NOW()
          AND ST_DWithin(p.location, ST_GeogFromText(:wkt), :radius)
        ORDER BY p.ends_at ASC
    """)
    wkt = f"SRID=4326;POINT({lng} {lat})"
    result = await db.execute(sql, {"wkt": wkt, "radius": radius_m})
    return result.mappings().all()
