import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Tournament, TournamentTeam
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
    return result.scalars().all()


@router.get("/{tournament_id}", response_model=TournamentDetailOut)
async def get_tournament(
    tournament_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Tournament)
        .options(
            selectinload(Tournament.contests),
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
