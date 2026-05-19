import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Contest, ContestGame, Tournament, TournamentTeam
from app.schemas import TournamentDetailOut, TournamentOut

router = APIRouter()


@router.get("", response_model=list[TournamentOut])
async def list_tournaments(
    db: Annotated[AsyncSession, Depends(get_db)],
    sport: Optional[str] = Query(None),
    active: Optional[bool] = Query(None),
):
    q = select(Tournament).order_by(Tournament.created_at.desc())
    if sport:
        q = q.where(Tournament.sport == sport)
    if active is not None:
        q = q.where(Tournament.is_active == active)
    result = await db.execute(q)
    tournaments = result.scalars().all()

    if not tournaments:
        return []

    # Count total ContestGame records per tournament
    t_ids = [t.id for t in tournaments]
    count_result = await db.execute(
        select(Contest.tournament_id, func.count(ContestGame.id).label("cnt"))
        .join(ContestGame, ContestGame.contest_id == Contest.id, isouter=True)
        .where(Contest.tournament_id.in_(t_ids))
        .group_by(Contest.tournament_id)
    )
    count_map = {row.tournament_id: int(row.cnt) for row in count_result.all()}

    out = []
    for t in tournaments:
        t_out = TournamentOut.model_validate(t)
        t_out.total_games = count_map.get(t.id, 0)
        out.append(t_out)
    return out


@router.get("/{tournament_id}", response_model=TournamentDetailOut)
async def get_tournament(
    tournament_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Tournament)
        .options(
            selectinload(Tournament.contests).selectinload(Contest.team_a),
            selectinload(Tournament.contests).selectinload(Contest.team_b),
            selectinload(Tournament.tournament_teams).selectinload(TournamentTeam.team),
        )
        .where(Tournament.id == tournament_id)
    )
    tournament = result.scalar_one_or_none()
    if tournament is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")
    out = TournamentDetailOut.model_validate(tournament)
    out.teams = [tt.team for tt in tournament.tournament_teams]
    return out
