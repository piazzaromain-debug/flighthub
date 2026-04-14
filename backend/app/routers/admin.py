# admin.py (router) — Gestion utilisateurs réservée aux admins.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from ..schemas.user import UserOut, RoleUpdate
from ..middleware.auth import require_role

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ROLES = {"lecteur", "contributeur", "admin"}


@router.get("/users", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db),
                     _: User = Depends(require_role("admin"))):
    users = (await db.execute(select(User).order_by(User.id))).scalars().all()
    return [UserOut.model_validate(u) for u in users]


@router.put("/users/{user_id}/role", response_model=UserOut)
async def update_role(user_id: int, payload: RoleUpdate,
                      db: AsyncSession = Depends(get_db),
                      _: User = Depends(require_role("admin"))):
    if payload.role not in VALID_ROLES:
        raise HTTPException(400, f"Rôle invalide. Valides: {VALID_ROLES}")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db),
                      admin: User = Depends(require_role("admin"))):
    if user_id == admin.id:
        raise HTTPException(400, "Impossible de se supprimer soi-même")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    await db.delete(user)
    await db.commit()
