from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Team, Player
from app.schemas import TeamOut, PlayerWithTeamOut

router = APIRouter()


@router.get("", response_model=list[TeamOut])
async def list_teams(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Team).order_by(Team.name))
    return result.scalars().all()


@router.get("/{team_id}", response_model=TeamOut)
async def get_team(team_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.get("/{team_id}/players", response_model=list[PlayerWithTeamOut])
async def team_players(team_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Player)
        .options(selectinload(Player.team))
        .where(Player.team_id == team_id, Player.is_active == True)
        .order_by(Player.name)
    )
    return result.scalars().all()
