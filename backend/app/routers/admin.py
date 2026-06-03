import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_admin, require_scorer_or_admin
from app.models import (
    Contest, ContestGame, ContestGamePlayer, Player, PlayerScoreEvent, Team, Tournament,
    TournamentTeam, User, UserTeam, UserTeamPlayer
)
from app.schemas import (
    ContestCreate, ContestGameCreate, ContestGameOut, ContestGameUpdate,
    ContestOut, PlayerCreate, PlayerOut, PlayerUpdate, PlayerWithTeamOut,
    TeamCreate, TeamOut, TeamUpdate, TournamentCreate, TournamentDetailOut, TournamentOut, TournamentUpdate, UserTeamOut,
)
from app.services.scoring import recalculate_game_scores, recalculate_contest_totals

router = APIRouter()

# ──────────────────────────────────────────────
# ID resolver — accepts UUID string or external_id
# ──────────────────────────────────────────────

async def resolve_to_uuid(db: AsyncSession, model, value: str) -> uuid.UUID:
    """Resolve a value that is either a UUID string or an external_id to a UUID."""
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        pass
    result = await db.execute(select(model).where(model.external_id == value))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{model.__tablename__} with external_id '{value}' not found",
        )
    return obj.id


# ──────────────────────────────────────────────
# Tournaments
# ──────────────────────────────────────────────

@router.post("/tournaments", response_model=TournamentOut, status_code=status.HTTP_201_CREATED)
async def create_tournament(
    body: TournamentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    tournament = Tournament(**body.model_dump())
    db.add(tournament)
    await db.commit()
    await db.refresh(tournament)
    return tournament


@router.patch("/tournaments/{tournament_id}", response_model=TournamentOut)
async def update_tournament(
    tournament_id: uuid.UUID,
    body: TournamentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    tournament = result.scalar_one_or_none()
    if tournament is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(tournament, key, value)
    await db.commit()
    await db.refresh(tournament)
    return tournament


@router.get("/tournaments/{tournament_id}", response_model=TournamentDetailOut)
async def get_tournament_admin(
    tournament_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
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
    # Attach teams list to the output manually
    out = TournamentDetailOut.model_validate(tournament)
    out.teams = [tt.team for tt in tournament.tournament_teams]
    return out


@router.post("/tournaments/{tournament_id}/teams", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def add_tournament_team(
    tournament_id: uuid.UUID,
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    """Add a team to a tournament's participating teams."""
    team_id = body.get("team_id")
    if not team_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="team_id required")
    team_id = uuid.UUID(str(team_id))

    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")

    existing = await db.execute(
        select(TournamentTeam).where(
            TournamentTeam.tournament_id == tournament_id,
            TournamentTeam.team_id == team_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Team already in tournament")

    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    tt = TournamentTeam(tournament_id=tournament_id, team_id=team_id)
    db.add(tt)
    await db.commit()
    return team


@router.delete("/tournaments/{tournament_id}/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tournament_team(
    tournament_id: uuid.UUID,
    team_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    """Remove a team from a tournament."""
    result = await db.execute(
        select(TournamentTeam).where(
            TournamentTeam.tournament_id == tournament_id,
            TournamentTeam.team_id == team_id,
        )
    )
    tt = result.scalar_one_or_none()
    if tt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not in tournament")
    await db.delete(tt)
    await db.commit()


# ──────────────────────────────────────────────
# Teams
# ──────────────────────────────────────────────

@router.post("/teams", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def create_team(
    body: TeamCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    existing = await db.execute(select(Team).where(Team.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Team name already exists")
    team = Team(name=body.name, sport=body.sport, external_id=body.external_id)
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team


@router.patch("/teams/{team_id}", response_model=TeamOut)
async def update_team(
    team_id: uuid.UUID,
    body: TeamUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(team, key, value)
    await db.commit()
    await db.refresh(team)
    return team


# ──────────────────────────────────────────────
# Players
# ──────────────────────────────────────────────

@router.post("/players", response_model=PlayerWithTeamOut, status_code=status.HTTP_201_CREATED)
async def create_player(
    body: PlayerCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    # Enforce: real captains have bid_points = 0
    bid_points = 0 if body.is_real_captain else body.bid_points
    player = Player(
        name=body.name,
        team_id=body.team_id,
        gender=body.gender,
        bid_points=bid_points,
        is_real_captain=body.is_real_captain,
        is_active=body.is_active,
        external_id=body.external_id,
    )
    db.add(player)
    await db.commit()
    result = await db.execute(
        select(Player).options(selectinload(Player.team)).where(Player.id == player.id)
    )
    return result.scalar_one()


@router.patch("/players/{player_id}", response_model=PlayerWithTeamOut)
async def update_player(
    player_id: uuid.UUID,
    body: PlayerUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    result = await db.execute(
        select(Player).options(selectinload(Player.team)).where(Player.id == player_id)
    )
    player = result.scalar_one_or_none()
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")

    if body.name is not None:
        player.name = body.name
    if body.gender is not None:
        player.gender = body.gender
    if body.is_real_captain is not None:
        player.is_real_captain = body.is_real_captain
    if body.is_active is not None:
        player.is_active = body.is_active
    # Bid points: always forced to 0 for real captains
    if body.bid_points is not None:
        player.bid_points = 0 if player.is_real_captain else body.bid_points
    elif body.is_real_captain is True:
        player.bid_points = 0

    await db.commit()
    await db.refresh(player)
    return player


# ──────────────────────────────────────────────
# Contests
# ──────────────────────────────────────────────

@router.post("/contests", response_model=ContestOut, status_code=status.HTTP_201_CREATED)
async def create_contest(
    body: ContestCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    if body.team_a_id == body.team_b_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="team_a and team_b must be different")

    # Resolve team names for auto-generated name
    team_a_res = await db.execute(select(Team).where(Team.id == body.team_a_id))
    team_a = team_a_res.scalar_one_or_none()
    team_b_res = await db.execute(select(Team).where(Team.id == body.team_b_id))
    team_b = team_b_res.scalar_one_or_none()
    if not team_a or not team_b:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or both teams not found")

    auto_name = f"{team_a.name} v {team_b.name}"

    # Auto-assign sequential match_number within tournament
    match_number = None
    if body.tournament_id:
        count_res = await db.execute(
            select(func.count(Contest.id)).where(Contest.tournament_id == body.tournament_id)
        )
        match_number = (count_res.scalar() or 0) + 1

    contest = Contest(
        name=auto_name,
        tournament_id=body.tournament_id,
        match_number=match_number,
        team_a_id=body.team_a_id,
        team_b_id=body.team_b_id,
        match_date=body.match_date,
        registration_cutoff=body.registration_cutoff,
    )
    db.add(contest)
    await db.commit()
    await db.refresh(contest)
    return contest


@router.patch("/contests/{contest_id}", response_model=ContestOut)
async def update_contest(
    contest_id: uuid.UUID,
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    allowed = {"name", "match_date", "registration_cutoff", "is_locked", "is_completed", "prize"}
    for key, value in body.items():
        if key in allowed:
            setattr(contest, key, value)
    await db.commit()
    await db.refresh(contest)
    return contest


# ──────────────────────────────────────────────
# Contest Games (score entry)
# ──────────────────────────────────────────────

@router.post("/contests/{contest_id}/games", response_model=ContestGameOut, status_code=status.HTTP_201_CREATED)
async def create_game(
    contest_id: uuid.UUID,
    body: ContestGameCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_scorer_or_admin)],
):
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")

    # Auto-assign game_number as count of existing games + 1
    count_result = await db.execute(
        select(func.count()).select_from(ContestGame).where(ContestGame.contest_id == contest_id)
    )
    next_number = (count_result.scalar() or 0) + 1

    game = ContestGame(
        contest_id=contest_id,
        game_number=next_number,
        game_type=body.game_type,
        game_code=body.game_code,
        name=body.name,
        external_id=body.external_id,
    )
    db.add(game)
    await db.flush()

    for pid in body.player_ids:
        db.add(ContestGamePlayer(contest_game_id=game.id, player_id=pid))

    await db.commit()

    result2 = await db.execute(
        select(ContestGame)
        .options(
            selectinload(ContestGame.game_players)
            .selectinload(ContestGamePlayer.player)
            .selectinload(Player.team)
        )
        .where(ContestGame.id == game.id)
        .execution_options(populate_existing=True)
    )
    return result2.scalar_one()


@router.patch("/contests/{contest_id}/games/{game_id}", response_model=ContestGameOut)
async def update_game_score(
    contest_id: str,
    game_id: str,
    body: ContestGameUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_scorer_or_admin)],
):
    # Resolve path params (UUID string or external_id)
    resolved_contest_id = await resolve_to_uuid(db, Contest, contest_id)
    resolved_game_id = await resolve_to_uuid(db, ContestGame, game_id)

    result = await db.execute(
        select(ContestGame)
        .options(selectinload(ContestGame.game_players).selectinload(ContestGamePlayer.player))
        .where(ContestGame.id == resolved_game_id, ContestGame.contest_id == resolved_contest_id)
    )
    game = result.scalar_one_or_none()
    if game is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    # Resolve winning_team_id (UUID string or external_id)
    game.winning_team_id = await resolve_to_uuid(db, Team, body.winning_team_id)

    # Resolve team IDs inside game_details.sets[].scores dict keys
    resolved_details = body.game_details
    if "sets" in resolved_details:
        resolved_sets = []
        for s in resolved_details["sets"]:
            resolved_scores = {}
            for k, v in s.get("scores", {}).items():
                resolved_scores[str(await resolve_to_uuid(db, Team, k))] = v
            resolved_sets.append({**s, "scores": resolved_scores})
        resolved_details = {**resolved_details, "sets": resolved_sets}
    game.game_details = resolved_details

    if body.name is not None:
        game.name = body.name
    if body.game_code is not None:
        game.game_code = body.game_code
    game.updated_at = datetime.now(timezone.utc)

    # Optionally update which players played (UUID strings or external_ids)
    if body.player_ids is not None:
        await db.execute(
            delete(ContestGamePlayer).where(ContestGamePlayer.contest_game_id == game.id)
        )
        for pid_str in body.player_ids:
            pid = await resolve_to_uuid(db, Player, pid_str)
            db.add(ContestGamePlayer(contest_game_id=game.id, player_id=pid))
        await db.flush()

    await db.flush()

    # Trigger scoring recalculation
    await recalculate_game_scores(game, db)

    await db.commit()

    result2 = await db.execute(
        select(ContestGame)
        .options(
            selectinload(ContestGame.game_players)
            .selectinload(ContestGamePlayer.player)
            .selectinload(Player.team)
        )
        .where(ContestGame.id == game.id)
        .execution_options(populate_existing=True)
    )
    return result2.scalar_one()


@router.delete("/contests/{contest_id}/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game(
    contest_id: uuid.UUID,
    game_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_scorer_or_admin)],
):
    result = await db.execute(
        select(ContestGame).where(ContestGame.id == game_id, ContestGame.contest_id == contest_id)
    )
    game = result.scalar_one_or_none()
    if game is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    saved_contest_id = game.contest_id

    # Remove score events first so totals recalculate correctly
    await db.execute(delete(PlayerScoreEvent).where(PlayerScoreEvent.contest_game_id == game_id))
    await db.flush()

    await db.delete(game)
    await db.flush()

    await recalculate_contest_totals(saved_contest_id, db)
    await db.commit()


# ──────────────────────────────────────────────
# View all user teams for a contest
# ──────────────────────────────────────────────

@router.get("/contests/{contest_id}/all-teams", response_model=list[UserTeamOut])
async def all_teams(
    contest_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    result = await db.execute(
        select(UserTeam)
        .options(
            selectinload(UserTeam.user),
            selectinload(UserTeam.players)
            .selectinload(UserTeamPlayer.player)
            .selectinload(Player.team)
        )
        .where(UserTeam.contest_id == contest_id)
        .order_by(UserTeam.total_points.desc())
    )
    return result.scalars().all()
