from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Contest, ContestJoinRequest, User, UserTeam
from app.schemas import (
    LoginRequest, MyContestOut, RegisterRequest,
    TokenResponse, UserOut, UserProfileUpdate,
)

router = APIRouter()
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _create_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new email/password account (used locally and as Google auth fallback)."""
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    hashed = pwd_context.hash(body.password)
    user = User(email=body.email, name=body.name, hashed_password=hashed, team_name=body.team_name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=_create_jwt(str(user.id)))


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Email + password login."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or user.hashed_password is None or not pwd_context.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return TokenResponse(access_token=_create_jwt(str(user.id)))


@router.get("/me", response_model=UserOut)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    """Return the currently authenticated user."""
    return current_user


@router.patch("/profile", response_model=UserOut)
async def update_profile(
    body: UserProfileUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update the current user's profile (name, team_name)."""
    if body.name is not None:
        current_user.name = body.name
    if body.team_name is not None:
        current_user.team_name = body.team_name
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/my-contests", response_model=list[MyContestOut])
async def my_contests(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return all contests the current user has entered, with basic contest info."""
    result = await db.execute(
        select(UserTeam)
        .options(
            selectinload(UserTeam.contest).options(
                selectinload(Contest.team_a),
                selectinload(Contest.team_b),
                selectinload(Contest.tournament),
            )
        )
        .join(Contest, Contest.id == UserTeam.contest_id)
        .outerjoin(
            ContestJoinRequest,
            and_(
                ContestJoinRequest.contest_id == UserTeam.contest_id,
                ContestJoinRequest.user_id == UserTeam.user_id,
            ),
        )
        .where(UserTeam.user_id == current_user.id)
        .where(
            or_(
                Contest.sponsor_id.is_(None),
                Contest.join_approval_required.is_(False),
                Contest.sponsor_id == UserTeam.user_id,
                ContestJoinRequest.status == "APPROVED",
            )
        )
        .order_by(UserTeam.created_at.desc())
    )
    user_teams = result.scalars().all()

    if not user_teams:
        return []

    # For each contest, get total participants and this user's rank
    contest_ids = [ut.contest_id for ut in user_teams]

    # Total participants per contest
    totals_result = await db.execute(
        select(UserTeam.contest_id, func.count(UserTeam.id).label("total"))
        .join(Contest, Contest.id == UserTeam.contest_id)
        .outerjoin(
            ContestJoinRequest,
            and_(
                ContestJoinRequest.contest_id == UserTeam.contest_id,
                ContestJoinRequest.user_id == UserTeam.user_id,
            ),
        )
        .where(UserTeam.contest_id.in_(contest_ids))
        .where(
            or_(
                Contest.sponsor_id.is_(None),
                Contest.join_approval_required.is_(False),
                Contest.sponsor_id == UserTeam.user_id,
                ContestJoinRequest.status == "APPROVED",
            )
        )
        .group_by(UserTeam.contest_id)
    )
    totals = {row.contest_id: row.total for row in totals_result.all()}

    # For each contest, count users with strictly more points → rank
    rank_map = {}
    for ut in user_teams:
        better_result = await db.execute(
            select(func.count(UserTeam.id))
            .join(Contest, Contest.id == UserTeam.contest_id)
            .outerjoin(
                ContestJoinRequest,
                and_(
                    ContestJoinRequest.contest_id == UserTeam.contest_id,
                    ContestJoinRequest.user_id == UserTeam.user_id,
                ),
            )
            .where(
                UserTeam.contest_id == ut.contest_id,
                UserTeam.total_points > ut.total_points,
            )
            .where(
                or_(
                    Contest.sponsor_id.is_(None),
                    Contest.join_approval_required.is_(False),
                    Contest.sponsor_id == UserTeam.user_id,
                    ContestJoinRequest.status == "APPROVED",
                )
            )
        )
        rank_map[ut.contest_id] = better_result.scalar() + 1

    out = []
    for ut in user_teams:
        out.append(MyContestOut(
            id=ut.id,
            contest=ut.contest,
            total_points=ut.total_points,
            created_at=ut.created_at,
            rank=rank_map.get(ut.contest_id),
            total_participants=totals.get(ut.contest_id, 1),
        ))
    return out
