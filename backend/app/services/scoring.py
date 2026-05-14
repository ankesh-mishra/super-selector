"""
Scoring engine for Super Selector.

When admin submits a game result (winning_team_id + game_details with set scores),
this service:
  1. Derives all scoring events from the game_details and rules_config.
  2. Inserts PlayerScoreEvent rows for each event × each affected user_team_player.
  3. Recalculates user_team_players.points_earned (sum of that player's events).
  4. Recalculates user_teams.total_points (sum of all 11 players' points_earned).

If a game is re-submitted (admin correction), existing events for that game are
deleted first, then re-computed from scratch.
"""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Contest,
    ContestGame,
    ContestGamePlayer,
    Player,
    PlayerScoreEvent,
    UserTeam,
    UserTeamPlayer,
)
from app.rules_config import (
    CAPTAIN_MULTIPLIER,
    DEFAULT_MULTIPLIER,
    SCORING_EVENTS,
    VICE_CAPTAIN_MULTIPLIER,
)


def _get_multiplier(utp: UserTeamPlayer) -> float:
    if utp.is_captain:
        return CAPTAIN_MULTIPLIER
    if utp.is_vice_captain:
        return VICE_CAPTAIN_MULTIPLIER
    return DEFAULT_MULTIPLIER


def _derive_events(
    game: ContestGame,
    contest: "Contest",
    winning_team_id: uuid.UUID,
    losing_team_id: uuid.UUID,
    winning_player_ids: set[uuid.UUID],
    all_game_player_map: dict[uuid.UUID, Player],
) -> list[dict]:
    """
    Returns a list of event dicts:
      {
        "event_type": str,
        "base_points": float,
        "beneficiaries": set[uuid.UUID],   ← player_ids who earn this event
      }
    """
    events: list[dict] = []
    sets: list[dict] = (game.game_details or {}).get("sets", [])

    # ── WIN ──────────────────────────────────────────────────────────────────
    cfg = SCORING_EVENTS.get("WIN", {})
    if cfg.get("enabled"):
        events.append({
            "event_type": "WIN",
            "base_points": float(cfg["points"]),
            "beneficiaries": winning_player_ids,
        })

    # ── STRAIGHT_SET_WIN_BONUS ────────────────────────────────────────────────
    cfg = SCORING_EVENTS.get("STRAIGHT_SET_WIN_BONUS", {})
    if cfg.get("enabled") and len(sets) == 2:
        events.append({
            "event_type": "STRAIGHT_SET_WIN_BONUS",
            "base_points": float(cfg["points"]),
            "beneficiaries": winning_player_ids,
        })

    # ── DOMINANT_SET_BONUS ────────────────────────────────────────────────────
    cfg = SCORING_EVENTS.get("DOMINANT_SET_BONUS", {})
    if cfg.get("enabled"):
        threshold = cfg.get("diff_threshold", 10)
        # Determine which player_ids belong to team_a vs team_b in this game
        team_a_players = {
            pid for pid, p in all_game_player_map.items()
            if p.team_id == contest.team_a_id
        }
        team_b_players = {
            pid for pid, p in all_game_player_map.items()
            if p.team_id == contest.team_b_id
        }
        for s in sets:
            a_pts = s.get("team_a_points", 0)
            b_pts = s.get("team_b_points", 0)
            diff = abs(a_pts - b_pts)
            if diff >= threshold:
                # Award to the side that WON this specific set
                set_winner_players = team_a_players if a_pts > b_pts else team_b_players
                events.append({
                    "event_type": "DOMINANT_SET_BONUS",
                    "base_points": float(cfg["points"]),
                    "beneficiaries": set_winner_players,
                })

    # ── UNDERDOG bonuses ──────────────────────────────────────────────────────
    winning_bid_total = sum(
        p.bid_points for pid, p in all_game_player_map.items()
        if pid in winning_player_ids
    )
    losing_player_ids = set(all_game_player_map.keys()) - winning_player_ids
    losing_bid_total = sum(
        p.bid_points for pid, p in all_game_player_map.items()
        if pid in losing_player_ids
    )

    large_cfg = SCORING_EVENTS.get("UNDERDOG_WIN_LARGE", {})
    small_cfg = SCORING_EVENTS.get("UNDERDOG_WIN_SMALL", {})

    if losing_bid_total > 0:
        large_threshold = large_cfg.get("bid_ratio_threshold", 0.50)
        small_threshold = small_cfg.get("bid_ratio_threshold", 0.75)

        if large_cfg.get("enabled") and winning_bid_total <= losing_bid_total * large_threshold:
            events.append({
                "event_type": "UNDERDOG_WIN_LARGE",
                "base_points": float(large_cfg["points"]),
                "beneficiaries": winning_player_ids,
            })
        elif small_cfg.get("enabled") and winning_bid_total <= losing_bid_total * small_threshold:
            events.append({
                "event_type": "UNDERDOG_WIN_SMALL",
                "base_points": float(small_cfg["points"]),
                "beneficiaries": winning_player_ids,
            })

    return events


async def recalculate_game_scores(
    game: ContestGame,
    db: AsyncSession,
) -> None:
    """
    Delete existing score events for this game, then recompute and persist fresh ones.
    Updates user_team_players.points_earned and user_teams.total_points accordingly.
    """
    contest_id = game.contest_id

    # ── Delete old events for this game ──────────────────────────────────────
    await db.execute(
        delete(PlayerScoreEvent).where(PlayerScoreEvent.contest_game_id == game.id)
    )
    await db.flush()

    if game.winning_team_id is None:
        # No result yet — nothing to compute
        await _refresh_totals(contest_id, db)
        return

    # ── Load game players with their Player records ───────────────────────────
    gp_result = await db.execute(
        select(ContestGamePlayer)
        .options(selectinload(ContestGamePlayer.player))
        .where(ContestGamePlayer.contest_game_id == game.id)
    )
    game_players: list[ContestGamePlayer] = gp_result.scalars().all()
    all_game_player_map: dict[uuid.UUID, Player] = {gp.player_id: gp.player for gp in game_players}

    # Determine winning vs losing player sets
    winning_player_ids = {
        gp.player_id for gp in game_players
        if gp.player.team_id == game.winning_team_id
    }

    # Determine losing team id
    contest_result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = contest_result.scalar_one()
    losing_team_id = (
        contest.team_b_id if game.winning_team_id == contest.team_a_id else contest.team_a_id
    )

    # ── Derive events from rules ──────────────────────────────────────────────
    events = _derive_events(
        game, contest, game.winning_team_id, losing_team_id,
        winning_player_ids, all_game_player_map,
    )

    # ── Load all user_team_players for players involved in this contest ───────
    all_player_ids = list(all_game_player_map.keys())
    utp_result = await db.execute(
        select(UserTeamPlayer)
        .join(UserTeam)
        .where(
            UserTeam.contest_id == contest_id,
            UserTeamPlayer.player_id.in_(all_player_ids),
        )
    )
    utps: list[UserTeamPlayer] = utp_result.scalars().all()

    # Group by player_id for lookup
    utp_by_player: dict[uuid.UUID, list[UserTeamPlayer]] = {}
    for utp in utps:
        utp_by_player.setdefault(utp.player_id, []).append(utp)

    # ── Insert score events ───────────────────────────────────────────────────
    for event in events:
        for player_id in event["beneficiaries"]:
            for utp in utp_by_player.get(player_id, []):
                multiplier = _get_multiplier(utp)
                points_awarded = event["base_points"] * multiplier
                db.add(PlayerScoreEvent(
                    user_team_player_id=utp.id,
                    contest_game_id=game.id,
                    event_type=event["event_type"],
                    base_points=event["base_points"],
                    multiplier_applied=multiplier,
                    points_awarded=points_awarded,
                ))

    await db.flush()

    # ── Refresh materialized totals ───────────────────────────────────────────
    await _refresh_totals(contest_id, db)
    await db.commit()


async def recalculate_contest_totals(contest_id: uuid.UUID, db: AsyncSession) -> None:
    """Public wrapper — recompute all user team totals for a contest from existing events."""
    await _refresh_totals(contest_id, db)


async def _refresh_totals(contest_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Recalculate points_earned on every user_team_player and total_points on
    every user_team for the given contest, based on current score events.
    """
    # Load all user_teams for the contest with their players and events
    ut_result = await db.execute(
        select(UserTeam)
        .options(
            selectinload(UserTeam.players).selectinload(UserTeamPlayer.score_events)
        )
        .where(UserTeam.contest_id == contest_id)
    )
    user_teams: list[UserTeam] = ut_result.scalars().all()

    for ut in user_teams:
        team_total = 0.0
        for utp in ut.players:
            player_total = sum(e.points_awarded for e in utp.score_events)
            utp.points_earned = player_total
            team_total += player_total
        ut.total_points = team_total

    await db.flush()
