import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, get_optional_current_user
from app.models import UserTeam, User, Contest, Tournament, ContestJoinRequest
from app.schemas import LeaderboardEntry, OverallLeaderboardEntry

router = APIRouter()


@router.get("/contests/{contest_id}", response_model=list[LeaderboardEntry])
async def contest_leaderboard(
    contest_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Ranked leaderboard for a single contest."""
    result = await db.execute(
        select(UserTeam)
        .options(selectinload(UserTeam.user))
        .join(Contest, Contest.id == UserTeam.contest_id)
        .outerjoin(
            ContestJoinRequest,
            and_(
                ContestJoinRequest.contest_id == UserTeam.contest_id,
                ContestJoinRequest.user_id == UserTeam.user_id,
            ),
        )
        .where(UserTeam.contest_id == contest_id)
        .where(
            or_(
                Contest.sponsor_id.is_(None),
                Contest.join_approval_required.is_(False),
                Contest.sponsor_id == UserTeam.user_id,
                ContestJoinRequest.status == "APPROVED",
            )
        )
        .order_by(UserTeam.total_points.desc())
    )
    user_teams = result.scalars().all()

    entries = []
    for rank, ut in enumerate(user_teams, start=1):
        entries.append(LeaderboardEntry(
            rank=rank,
            user_id=ut.user_id,
            user_name=ut.user.name,
            team_name=ut.user.team_name,
            total_points=ut.total_points,
            contest_id=contest_id,
        ))
    return entries


@router.get("/tournaments/{tournament_id}", response_model=list[OverallLeaderboardEntry])
async def tournament_leaderboard(
    tournament_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)],
):
    """Cumulative leaderboard — sum of points across all contests in a tournament."""
    tournament = await db.get(Tournament, tournament_id)
    if tournament is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")

    result = await db.execute(
        select(
            UserTeam.user_id,
            User.name,
            User.team_name,
            func.sum(UserTeam.total_points).label("total_points"),
            func.count(UserTeam.id).label("contests_entered"),
        )
        .join(User, User.id == UserTeam.user_id)
        .join(Contest, Contest.id == UserTeam.contest_id)
        .outerjoin(
            ContestJoinRequest,
            and_(
                ContestJoinRequest.contest_id == UserTeam.contest_id,
                ContestJoinRequest.user_id == UserTeam.user_id,
            ),
        )
        .where(Contest.tournament_id == tournament_id)
        .where(
            or_(
                Contest.sponsor_id.is_(None),
                Contest.join_approval_required.is_(False),
                Contest.sponsor_id == UserTeam.user_id,
                ContestJoinRequest.status == "APPROVED",
            )
        )
        .group_by(UserTeam.user_id, User.name, User.team_name)
        .order_by(func.sum(UserTeam.total_points).desc())
    )
    rows = result.all()

    entries = []
    for rank, row in enumerate(rows, start=1):
        entries.append(OverallLeaderboardEntry(
            rank=rank,
            user_id=row.user_id,
            user_name=row.name,
            team_name=row.team_name,
            total_points=float(row.total_points or 0),
            contests_entered=row.contests_entered,
        ))
    return entries
