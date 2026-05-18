import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Contest, ContestGame, ContestGamePlayer, Player, UserTeam
from app.schemas import ContestOut, ContestDetailOut, ContestCardOut

router = APIRouter()


@router.get("/trending", response_model=list[ContestCardOut])
async def trending_contests(db: Annotated[AsyncSession, Depends(get_db)]):
    """Open upcoming contests with participant counts — public, no auth required."""
    result = await db.execute(
        select(Contest)
        .options(
            selectinload(Contest.team_a),
            selectinload(Contest.team_b),
            selectinload(Contest.tournament),
        )
        .where(Contest.is_completed == False, Contest.is_locked == False)
        .order_by(Contest.match_date.asc())
        .limit(8)
    )
    contests = result.scalars().all()

    if not contests:
        return []

    contest_ids = [c.id for c in contests]
    count_result = await db.execute(
        select(UserTeam.contest_id, func.count(UserTeam.id).label("cnt"))
        .where(UserTeam.contest_id.in_(contest_ids))
        .group_by(UserTeam.contest_id)
    )
    count_map = {row.contest_id: int(row.cnt) for row in count_result.all()}

    return [
        ContestCardOut(
            id=c.id,
            name=c.name,
            match_date=c.match_date,
            is_locked=c.is_locked,
            is_completed=c.is_completed,
            participant_count=count_map.get(c.id, 0),
            tournament_name=c.tournament.name if c.tournament else None,
            team_a_name=c.team_a.name,
            team_b_name=c.team_b.name,
        )
        for c in contests
    ]


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
