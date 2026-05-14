"""
Team selection validator.
All rules are driven by rules_config.py — change values there, not here.
"""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Contest, GenderEnum, Player
from app.rules_config import (
    TEAM_SIZE,
    MAX_PLAYERS_FROM_ONE_TEAM,
    MIN_FEMALE_PLAYERS,
    MAX_TOTAL_BID_POINTS,
    MUST_PICK_ONE_REAL_CAPTAIN,
    CAPTAIN_COUNT,
    VICE_CAPTAIN_COUNT,
)
from app.schemas import UserTeamPlayerIn


class TeamValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


async def validate_team_selection(
    contest: Contest,
    selections: list[UserTeamPlayerIn],
    db: AsyncSession,
) -> list[Player]:
    """
    Validate the 11-player selection against all configured rules.
    Returns the resolved Player objects if valid.
    Raises TeamValidationError with a descriptive message on any rule failure.
    """
    # ── Rule: contest must be open ────────────────────────────────────────────
    if contest.is_locked:
        raise TeamValidationError("Contest is locked. Team selection is closed.")

    # ── Rule: exactly TEAM_SIZE players ──────────────────────────────────────
    if len(selections) != TEAM_SIZE:
        raise TeamValidationError(f"Exactly {TEAM_SIZE} players must be selected (got {len(selections)}).")

    # ── Rule: no duplicate players ────────────────────────────────────────────
    player_ids = [s.player_id for s in selections]
    if len(set(player_ids)) != len(player_ids):
        raise TeamValidationError("Duplicate players found in selection.")

    # ── Rule: exactly 1 captain and 1 vice captain ────────────────────────────
    captains = [s for s in selections if s.is_captain]
    vcs = [s for s in selections if s.is_vice_captain]
    if len(captains) != CAPTAIN_COUNT:
        raise TeamValidationError(f"Exactly {CAPTAIN_COUNT} captain must be designated.")
    if len(vcs) != VICE_CAPTAIN_COUNT:
        raise TeamValidationError(f"Exactly {VICE_CAPTAIN_COUNT} vice captain must be designated.")
    if captains[0].player_id == vcs[0].player_id:
        raise TeamValidationError("Captain and vice captain must be different players.")

    # ── Fetch player records ──────────────────────────────────────────────────
    result = await db.execute(
        select(Player)
        .options(selectinload(Player.team))
        .where(Player.id.in_(player_ids))
    )
    players_fetched: list[Player] = result.scalars().all()

    if len(players_fetched) != TEAM_SIZE:
        raise TeamValidationError("One or more player IDs are invalid.")

    player_map: dict[UUID, Player] = {p.id: p for p in players_fetched}

    # ── Rule: all players must belong to team_a or team_b of this contest ─────
    valid_team_ids = {contest.team_a_id, contest.team_b_id}
    for p in players_fetched:
        if p.team_id not in valid_team_ids:
            raise TeamValidationError(
                f"Player '{p.name}' does not belong to either team in this contest."
            )
        if not p.is_active:
            raise TeamValidationError(f"Player '{p.name}' is not active.")

    # ── Rule: max MAX_PLAYERS_FROM_ONE_TEAM from a single team ───────────────
    from collections import Counter
    team_counts = Counter(p.team_id for p in players_fetched)
    for team_id, count in team_counts.items():
        if count > MAX_PLAYERS_FROM_ONE_TEAM:
            raise TeamValidationError(
                f"Maximum {MAX_PLAYERS_FROM_ONE_TEAM} players allowed from one team "
                f"(selected {count} from one team)."
            )

    # ── Rule: minimum MIN_FEMALE_PLAYERS female players ───────────────────────
    female_count = sum(1 for p in players_fetched if p.gender == GenderEnum.FEMALE)
    if female_count < MIN_FEMALE_PLAYERS:
        raise TeamValidationError(
            f"At least {MIN_FEMALE_PLAYERS} female players required (selected {female_count})."
        )

    # ── Rule: total bid points ≤ MAX_TOTAL_BID_POINTS ─────────────────────────
    total_bid = sum(p.bid_points for p in players_fetched)
    if total_bid > MAX_TOTAL_BID_POINTS:
        raise TeamValidationError(
            f"Total bid points {total_bid} exceeds the maximum of {MAX_TOTAL_BID_POINTS}."
        )

    # ── Rule: must include exactly one real team captain ─────────────────────
    if MUST_PICK_ONE_REAL_CAPTAIN:
        real_captains_picked = [p for p in players_fetched if p.is_real_captain]
        if len(real_captains_picked) != 1:
            raise TeamValidationError(
                f"Exactly 1 real team captain must be selected "
                f"(found {len(real_captains_picked)} in selection)."
            )

    # Return players in the same order as selections
    return [player_map[pid] for pid in player_ids]
