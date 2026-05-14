import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Player
from app.schemas import PlayerWithTeamOut

router = APIRouter()


@router.get("", response_model=list[PlayerWithTeamOut])
async def list_players(
    db: Annotated[AsyncSession, Depends(get_db)],
    team_id: Optional[uuid.UUID] = Query(default=None),
    active_only: bool = Query(default=True),
):
    q = select(Player).options(selectinload(Player.team))
    if team_id is not None:
        q = q.where(Player.team_id == team_id)
    if active_only:
        q = q.where(Player.is_active == True)
    q = q.order_by(Player.name)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{player_id}", response_model=PlayerWithTeamOut)
async def get_player(player_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Player).options(selectinload(Player.team)).where(Player.id == player_id)
    )
    player = result.scalar_one_or_none()
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return player
