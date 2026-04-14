# vote.py — Modèle Vote : upvote/downvote d'un utilisateur sur un spot.
from datetime import datetime
from sqlalchemy import Integer, SmallInteger, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (
        UniqueConstraint("spot_id", "user_id", name="uq_vote_spot_user"),
        CheckConstraint("value IN (-1, 1)", name="ck_vote_value"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    spot_id: Mapped[int] = mapped_column(ForeignKey("spots.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    value: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
