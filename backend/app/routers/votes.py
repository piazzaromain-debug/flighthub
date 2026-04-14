# votes.py (router) — Voter sur un spot (toggle / inversion).
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User, Vote, Spot
from ..schemas.vote import VoteCreate, VoteOut
from ..middleware.auth import require_role

router = APIRouter(tags=["votes"])


@router.post("/spots/{spot_id}/vote", response_model=VoteOut)
async def vote(spot_id: int, payload: VoteCreate,
               db: AsyncSession = Depends(get_db),
               user: User = Depends(require_role("lecteur"))):
    if payload.value not in (-1, 1):
        raise HTTPException(400, "Valeur doit être -1 ou +1")

    spot = (await db.execute(select(Spot).where(Spot.id == spot_id))).scalar_one_or_none()
    if not spot:
        raise HTTPException(404, "Spot introuvable")

    existing = (await db.execute(
        select(Vote).where(Vote.spot_id == spot_id, Vote.user_id == user.id)
    )).scalar_one_or_none()

    user_vote: int | None
    if existing is None:
        db.add(Vote(spot_id=spot_id, user_id=user.id, value=payload.value))
        user_vote = payload.value
    elif existing.value == payload.value:
        await db.delete(existing)
        user_vote = None
    else:
        existing.value = payload.value
        user_vote = payload.value

    await db.flush()
    new_score = (await db.execute(
        text("SELECT COALESCE(SUM(value),0) FROM votes WHERE spot_id=:id"),
        {"id": spot_id},
    )).scalar_one()
    await db.execute(text("UPDATE spots SET score=:s WHERE id=:id"),
                     {"s": int(new_score), "id": spot_id})
    await db.commit()
    return VoteOut(spot_id=spot_id, score=int(new_score), user_vote=user_vote)
