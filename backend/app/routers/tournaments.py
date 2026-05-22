import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Contest, ContestGame, Tournament, TournamentTeam, UserTeam
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
            selectinload(Tournament.contests).selectinload(Contest.contest_games).selectinload(ContestGame.winning_team),
            selectinload(Tournament.tournament_teams).selectinload(TournamentTeam.team),
        )
        .where(Tournament.id == tournament_id)
    )
    tournament = result.scalar_one_or_none()
    if tournament is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")

    # Compute participant counts per contest
    contest_ids = [c.id for c in tournament.contests]
    pc_map: dict = {}
    if contest_ids:
        pc_result = await db.execute(
            select(UserTeam.contest_id, func.count(UserTeam.id).label('cnt'))
            .where(UserTeam.contest_id.in_(contest_ids))
            .group_by(UserTeam.contest_id)
        )
        pc_map = {row.contest_id: int(row.cnt) for row in pc_result.all()}

    contest_map = {c.id: c for c in tournament.contests}

    out = TournamentDetailOut.model_validate(tournament)
    for c_out in out.contests:
        c_out.participant_count = pc_map.get(c_out.id, 0)
        # Compute winning team name from game results
        c_model = contest_map[c_out.id]
        if c_model.is_completed and c_model.contest_games:
            wins: dict = {}
            for g in c_model.contest_games:
                if g.winning_team_id:
                    wins[g.winning_team_id] = wins.get(g.winning_team_id, 0) + 1
            if wins:
                winner_id = max(wins, key=wins.get)
                if winner_id == c_model.team_a_id:
                    c_out.winning_team_name = c_model.team_a.name
                elif winner_id == c_model.team_b_id:
                    c_out.winning_team_name = c_model.team_b.name
    out.teams = [tt.team for tt in tournament.tournament_teams]
    return out
