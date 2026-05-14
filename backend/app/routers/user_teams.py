import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Contest, Player, User, UserTeam, UserTeamPlayer
from app.schemas import UserTeamCreate, UserTeamOut
from app.services.team_validator import TeamValidationError, validate_team_selection
router = APIRouter()


@router.post("/{contest_id}/my-team", response_model=UserTeamOut, status_code=status.HTTP_201_CREATED)
async def create_user_team(
    contest_id: uuid.UUID,
    body: UserTeamCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Load contest
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")

    if contest.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contest is locked. Team cannot be created.")

    # One team per user per contest
    existing = await db.execute(
        select(UserTeam).where(
            UserTeam.user_id == current_user.id,
            UserTeam.contest_id == contest_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already created a team for this contest.",
        )

    # Validate selection
    try:
        players = await validate_team_selection(contest, body.players, db)
    except TeamValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.message)

    # Persist
    player_lookup = {p.id: p for p in players}
    user_team = UserTeam(user_id=current_user.id, contest_id=contest_id)
    db.add(user_team)
    await db.flush()

    for sel in body.players:
        utp = UserTeamPlayer(
            user_team_id=user_team.id,
            player_id=sel.player_id,
            is_captain=sel.is_captain,
            is_vice_captain=sel.is_vice_captain,
        )
        db.add(utp)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(UserTeam)
        .options(
            selectinload(UserTeam.players)
            .selectinload(UserTeamPlayer.player)
            .selectinload(Player.team)
        )
        .where(UserTeam.id == user_team.id)
    )
    return result.scalar_one()


@router.get("/{contest_id}/my-team", response_model=UserTeamOut)
async def get_my_team(
    contest_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(UserTeam)
        .options(
            selectinload(UserTeam.players)
            .selectinload(UserTeamPlayer.player)
            .selectinload(Player.team)
        )
        .where(
            UserTeam.user_id == current_user.id,
            UserTeam.contest_id == contest_id,
        )
    )
    user_team = result.scalar_one_or_none()
    if user_team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No team found for this contest")
    return user_team


@router.put("/{contest_id}/my-team", response_model=UserTeamOut)
async def update_user_team(
    contest_id: uuid.UUID,
    body: UserTeamCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Load contest
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")

    if contest.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contest is locked. Team cannot be edited.")

    # Find existing team
    result = await db.execute(
        select(UserTeam).where(
            UserTeam.user_id == current_user.id,
            UserTeam.contest_id == contest_id,
        )
    )
    user_team = result.scalar_one_or_none()
    if user_team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No team found for this contest")

    # Validate new selection
    try:
        await validate_team_selection(contest, body.players, db)
    except TeamValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.message)

    # Replace player selections
    await db.execute(delete(UserTeamPlayer).where(UserTeamPlayer.user_team_id == user_team.id))

    for sel in body.players:
        db.add(UserTeamPlayer(
            user_team_id=user_team.id,
            player_id=sel.player_id,
            is_captain=sel.is_captain,
            is_vice_captain=sel.is_vice_captain,
        ))

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(UserTeam)
        .options(
            selectinload(UserTeam.players)
            .selectinload(UserTeamPlayer.player)
            .selectinload(Player.team)
        )
        .where(UserTeam.id == user_team.id)
    )
    return result.scalar_one()


@router.get("/{contest_id}/teams/{user_id}", response_model=UserTeamOut)
async def get_user_team_by_user(
    contest_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """View a user's team — only allowed once the contest is locked (or for own team)."""
    if user_id != current_user.id:
        result = await db.execute(select(Contest).where(Contest.id == contest_id))
        contest = result.scalar_one_or_none()
        if contest is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
        if not contest.is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Team selections are hidden until the contest is locked.",
            )

    result = await db.execute(
        select(UserTeam)
        .options(
            selectinload(UserTeam.user),
            selectinload(UserTeam.players)
            .selectinload(UserTeamPlayer.player)
            .selectinload(Player.team),
        )
        .where(UserTeam.user_id == user_id, UserTeam.contest_id == contest_id)
    )
    user_team = result.scalar_one_or_none()
    if user_team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return user_team
