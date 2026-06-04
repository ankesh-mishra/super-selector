"""
External scoring API.

Allows an external scorer app to submit match results using their own IDs
(external_id) instead of internal UUIDs.

PATCH /api/ext/contests/{ext_contest_id}/games/{ext_game_id}
"""
import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_scorer_or_admin
from app.models import Contest, ContestGame, ContestGamePlayer, Player, Team, User
from app.schemas import ContestGameOut
from app.services.scoring import recalculate_game_scores

router = APIRouter()

# Maps game_code → (game_type, display_name)
GAME_CODE_MAP = {
    "MDA": ("DOUBLES", "Men's Doubles A (5 Pointer)"),
    "MDB": ("DOUBLES", "Men's Doubles B (4 Pointer)"),
    "MDC": ("DOUBLES", "Men's Doubles C (3 Pointer)"),
    "MDD": ("DOUBLES", "Men's Doubles D (2 Pointer)"),
    "MS":  ("SINGLES", "Men's Singles (3 Pointer)"),
    "WD":  ("DOUBLES", "Women's Doubles (4 Pointer)"),
    "MXD": ("DOUBLES", "Mixed Doubles (4 Pointer)"),
}


class ExternalGameScoreUpdate(BaseModel):
    game_code: str                # e.g. MDA, MDB, MXD — identifies the game within the contest
    winning_team_id: str          # UUID or external_id
    game_details: dict            # sets with team UUID/external_id keys in scores/shots
    player_ids: list[str]         # UUID or external_id for each player in the game
    name: Optional[str] = None


@router.patch(
    "/contests/{ext_contest_id}/games",
    response_model=ContestGameOut,
    summary="Submit a game result using contest external ID + game code",
)
async def external_update_game_score(
    ext_contest_id: str,
    body: ExternalGameScoreUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_scorer_or_admin)],
):
    if body.game_code not in GAME_CODE_MAP:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unknown game_code '{body.game_code}'. Valid codes: {', '.join(GAME_CODE_MAP)}")

    # ── 1. Resolve contest (external_id or UUID) ──────────────────────────────
    try:
        contest_uuid = uuid.UUID(ext_contest_id)
        contest_result = await db.execute(select(Contest).where(Contest.id == contest_uuid))
    except (ValueError, AttributeError):
        contest_result = await db.execute(select(Contest).where(Contest.external_id == ext_contest_id))
    contest = contest_result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contest not found: {ext_contest_id!r}")

    # ── 2. Upsert game by contest + game_code ─────────────────────────────────
    game_result = await db.execute(
        select(ContestGame)
        .options(
            selectinload(ContestGame.game_players)
            .selectinload(ContestGamePlayer.player)
            .selectinload(Player.team)
        )
        .where(ContestGame.contest_id == contest.id, ContestGame.game_code == body.game_code)
    )
    game = game_result.scalar_one_or_none()
    if game is None:
        # Auto-create the game — admin doesn't need to pre-create it
        from sqlalchemy import func
        count_result = await db.execute(
            select(func.count()).select_from(ContestGame).where(ContestGame.contest_id == contest.id)
        )
        next_number = (count_result.scalar() or 0) + 1
        game_type, game_name = GAME_CODE_MAP[body.game_code]
        game = ContestGame(
            contest_id=contest.id,
            game_number=next_number,
            game_type=game_type,
            game_code=body.game_code,
            name=body.name or game_name,
        )
        db.add(game)
        await db.flush()

    # ── 3. Resolve winning team (external_id or UUID) ─────────────────────────
    try:
        wt_uuid = uuid.UUID(body.winning_team_id)
        wt_result = await db.execute(select(Team).where(Team.id == wt_uuid))
    except (ValueError, AttributeError):
        wt_result = await db.execute(select(Team).where(Team.external_id == body.winning_team_id))
    winning_team = wt_result.scalar_one_or_none()
    if winning_team is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Team not found: {body.winning_team_id!r}")

    # ── 4. Collect all external team / player IDs from game_details ──────────
    sets = (body.game_details or {}).get("sets", [])
    ext_team_ids = set()
    ext_player_ids = set()
    for s in sets:
        ext_team_ids.update(s.get("scores", {}).keys())
        ext_player_ids.update(s.get("shots", {}).keys())

    # ── 5. Batch-resolve teams ────────────────────────────────────────────────
    team_map: dict[str, str] = {}
    if ext_team_ids:
        teams_result = await db.execute(select(Team).where(Team.external_id.in_(ext_team_ids)))
        team_map = {t.external_id: str(t.id) for t in teams_result.scalars().all()}

    # ── 6. Batch-resolve players (shots + player_ids) ──────────────────────────
    all_ext_player_ids = ext_player_ids | set(body.player_ids)
    player_map: dict[str, str] = {}
    uuid_player_ids: list[uuid.UUID] = []
    if all_ext_player_ids:
        # Separate UUIDs from external_ids
        ext_ids_only = set()
        for pid in all_ext_player_ids:
            try:
                uuid_player_ids.append(uuid.UUID(pid))
            except (ValueError, AttributeError):
                ext_ids_only.add(pid)
        if ext_ids_only:
            players_result = await db.execute(select(Player).where(Player.external_id.in_(ext_ids_only)))
            for p in players_result.scalars().all():
                player_map[p.external_id] = str(p.id)
        for u in uuid_player_ids:
            player_map[str(u)] = str(u)

    # ── 7. Transform game_details: replace external IDs with internal UUIDs ──
    transformed_sets = []
    for s in sets:
        transformed_s: dict = {}

        scores: dict[str, int] = {}
        for ext_id, pts in s.get("scores", {}).items():
            internal_id = team_map.get(ext_id)
            if internal_id is None:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Team not found for external_id: {ext_id!r}")
            scores[internal_id] = pts
        transformed_s["scores"] = scores

        if "shots" in s:
            shots: dict[str, dict] = {}
            for ext_pid, counts in s["shots"].items():
                internal_pid = player_map.get(ext_pid)
                if internal_pid is None:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Player not found for external_id: {ext_pid!r}")
                shots[internal_pid] = counts
            transformed_s["shots"] = shots

        transformed_sets.append(transformed_s)

    # ── 8. Sync ContestGamePlayers ────────────────────────────────────────────
    resolved_player_uuids: list[uuid.UUID] = []
    for pid_str in body.player_ids:
        internal = player_map.get(pid_str)
        if internal is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Player not found: {pid_str!r}")
        resolved_player_uuids.append(uuid.UUID(internal))

    # Clear existing players and re-add (handles re-submissions cleanly)
    await db.execute(delete(ContestGamePlayer).where(ContestGamePlayer.contest_game_id == game.id))
    for pid in resolved_player_uuids:
        db.add(ContestGamePlayer(contest_game_id=game.id, player_id=pid))
    await db.flush()

    # ── 9. Persist score and recalculate ──────────────────────────────────────
    game.winning_team_id = winning_team.id
    game.game_details = {"sets": transformed_sets}
    game.game_code = body.game_code
    if body.name is not None:
        game.name = body.name
    game.updated_at = datetime.now(timezone.utc)

    await db.flush()

    contest_result = await db.execute(select(Contest).where(Contest.id == contest.id))
    saved_contest = contest_result.scalar_one()
    saved_contest.is_locked = True

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
