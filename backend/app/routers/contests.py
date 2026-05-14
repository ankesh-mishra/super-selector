import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Contest, ContestGame, ContestGamePlayer, Player, Team, Tournament
from app.schemas import ContestOut, ContestDetailOut

router = APIRouter()


@router.get("", response_model=list[ContestOut])
async def list_contests(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Contest).order_by(Contest.match_date.desc()))
    return result.scalars().all()


@router.get("/{contest_id}", response_model=ContestDetailOut)
async def get_contest(contest_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Contest)
        .options(
            selectinload(Contest.team_a),
            selectinload(Contest.team_b),
            selectinload(Contest.contest_games).selectinload(ContestGame.game_players).selectinload(ContestGamePlayer.player).selectinload(Player.team),
            selectinload(Contest.tournament),
        )
        .where(Contest.id == contest_id)
    )
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    return contest
