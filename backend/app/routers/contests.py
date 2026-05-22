import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Contest, ContestGame, ContestGamePlayer, Player, Team, UserTeam
from app.schemas import ContestOut, ContestDetailOut, ContestCardOut

router = APIRouter()


@router.get("/trending", response_model=list[ContestCardOut])
async def trending_contests(db: Annotated[AsyncSession, Depends(get_db)]):
    """Open/live contests with participant counts — sorted by live first, then participants desc, then earliest date."""
    # Auto-lock any contest whose match_date has passed
    await db.execute(
        update(Contest)
        .where(Contest.match_date <= datetime.now(timezone.utc))
        .where(Contest.is_locked == False)  # noqa: E712
        .where(Contest.is_completed == False)  # noqa: E712
        .values(is_locked=True)
    )
    await db.commit()

    result = await db.execute(
        select(Contest)
        .options(
            selectinload(Contest.team_a).selectinload(Team.players),
            selectinload(Contest.team_b).selectinload(Team.players),
            selectinload(Contest.tournament),
        )
        .where(Contest.is_completed == False)
        .limit(20)
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

    cards = [
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
            team_a_captain_name=next((p.name for p in c.team_a.players if p.is_real_captain), None),
            team_b_captain_name=next((p.name for p in c.team_b.players if p.is_real_captain), None),
            prize=c.prize,
        )
        for c in contests
    ]

    cards.sort(key=lambda x: (
        0 if (x.is_locked and not x.is_completed) else 1,  # live first
        -x.participant_count,                               # most participants
        x.match_date,                                       # earliest date
    ))

    return cards[:8]


@router.get("", response_model=list[ContestOut])
async def list_contests(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Contest).order_by(Contest.match_date.desc()))
    return result.scalars().all()


@router.get("/{contest_id}", response_model=ContestDetailOut)
async def get_contest(contest_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Contest)
        .options(
            selectinload(Contest.team_a).selectinload(Team.players),
            selectinload(Contest.team_b).selectinload(Team.players),
            selectinload(Contest.contest_games).selectinload(ContestGame.game_players).selectinload(ContestGamePlayer.player).selectinload(Player.team),
            selectinload(Contest.tournament),
        )
        .where(Contest.id == contest_id)
    )
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    out = ContestDetailOut.model_validate(contest)
    out.team_a_captain_name = next((p.name for p in contest.team_a.players if p.is_real_captain), None)
    out.team_b_captain_name = next((p.name for p in contest.team_b.players if p.is_real_captain), None)
    return out
