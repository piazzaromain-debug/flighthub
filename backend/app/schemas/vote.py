# vote.py (schemas) — Schémas Pydantic pour voter et retourner le nouveau score.
from pydantic import BaseModel, Field


class VoteCreate(BaseModel):
    value: int = Field(description="+1 ou -1")


class VoteOut(BaseModel):
    spot_id: int
    score: int
    user_vote: int | None
