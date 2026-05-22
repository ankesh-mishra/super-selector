import uuid
from collections import defaultdict
from typing import Annotated, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Player, UserTeamPlayer, UserTeam, User, PlayerScoreEvent, Contest
from app.schemas import (
    PlayerWithTeamOut, PlayerTrendingOut, PlayerByPointsOut,
    PlayerDetailOut, PlayerContestStatsOut, PlayerGameEventOut, PlayerSelectorOut,
)

router = APIRouter()


@router.get("/trending", response_model=list[PlayerTrendingOut])
async def trending_players(
    db: Annotated[AsyncSession, Depends(get_db)],
    tournament_id: Optional[uuid.UUID] = Query(default=None),
):
    """Players ranked by total selection count. Optionally scoped to a tournament."""
    count_q = (
        select(UserTeamPlayer.player_id, func.count(UserTeamPlayer.id).label("cnt"))
        .join(UserTeam, UserTeam.id == UserTeamPlayer.user_team_id)
    )
    if tournament_id:
        count_q = (
            count_q
            .join(Contest, Contest.id == UserTeam.contest_id)
            .where(Contest.tournament_id == tournament_id)
        )
    count_result = await db.execute(
        count_q
        .group_by(UserTeamPlayer.player_id)
        .order_by(func.count(UserTeamPlayer.id).desc())
        .limit(8)
    )
    rows = count_result.all()

    if not rows:
        return []

    player_ids = [r.player_id for r in rows]
    count_map = {r.player_id: int(r.cnt) for r in rows}

    player_result = await db.execute(
        select(Player)
        .options(selectinload(Player.team))
        .where(Player.id.in_(player_ids))
    )
    players_by_id = {p.id: p for p in player_result.scalars().all()}

    out = []
    for player_id in player_ids:
        player = players_by_id.get(player_id)
        if player is None:
            continue
        p_out = PlayerTrendingOut.model_validate(player)
        p_out.selection_count = count_map[player_id]
        out.append(p_out)
    return out


@router.get("/by-points", response_model=list[PlayerByPointsOut])
async def players_by_points(
    db: Annotated[AsyncSession, Depends(get_db)],
    tournament_id: Optional[uuid.UUID] = Query(default=None),
):
    """All active players ranked by total base points. Optionally scoped to a tournament."""
    deduped_q = (
        select(
            UserTeamPlayer.player_id.label("player_id"),
            PlayerScoreEvent.base_points.label("base_points"),
        )
        .join(PlayerScoreEvent, PlayerScoreEvent.user_team_player_id == UserTeamPlayer.id)
    )
    if tournament_id:
        deduped_q = (
            deduped_q
            .join(UserTeam, UserTeam.id == UserTeamPlayer.user_team_id)
            .join(Contest, Contest.id == UserTeam.contest_id)
            .where(Contest.tournament_id == tournament_id)
        )
    deduped = (
        deduped_q
        .distinct(UserTeamPlayer.player_id, PlayerScoreEvent.contest_game_id, PlayerScoreEvent.event_type)
        .order_by(UserTeamPlayer.player_id, PlayerScoreEvent.contest_game_id, PlayerScoreEvent.event_type)
    ).subquery()

    pts_subq = (
        select(deduped.c.player_id, func.sum(deduped.c.base_points).label("total_points"))
        .group_by(deduped.c.player_id)
    ).subquery()

    # When filtering by tournament, restrict player list to teams in that tournament.
    player_q = (
        select(Player, func.coalesce(pts_subq.c.total_points, 0.0).label("total_points"))
        .options(selectinload(Player.team))
        .outerjoin(pts_subq, pts_subq.c.player_id == Player.id)
        .where(Player.is_active == True)
    )
    if tournament_id:
        teams_subq = (
            select(Contest.team_a_id.label("team_id")).where(Contest.tournament_id == tournament_id)
            .union(select(Contest.team_b_id.label("team_id")).where(Contest.tournament_id == tournament_id))
        ).subquery()
        player_q = player_q.where(Player.team_id.in_(select(teams_subq.c.team_id)))

    rows = await db.execute(player_q.order_by(func.coalesce(pts_subq.c.total_points, 0.0).desc()))

    out = []
    for player, total_points in rows:
        p_out = PlayerByPointsOut.model_validate(player)
        p_out.total_points = float(total_points)
        out.append(p_out)
    return out


@router.get("", response_model=list[PlayerWithTeamOut])
async def list_players(
    db: Annotated[AsyncSession, Depends(get_db)],
    team_id: Optional[uuid.UUID] = Query(default=None),
    active_only: bool = Query(default=True),
):
    q = select(Player).options(selectinload(Player.team))
    if team_id is not None:
        q = q.where(Player.team_id == team_id)
    if active_only:
        q = q.where(Player.is_active == True)
    q = q.order_by(Player.name)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{player_id}/stats", response_model=PlayerDetailOut)
async def get_player_stats(player_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    """Full player detail: selectors + per-contest points breakdown."""
    result = await db.execute(
        select(Player).options(selectinload(Player.team)).where(Player.id == player_id)
    )
    player = result.scalar_one_or_none()
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")

    utp_result = await db.execute(
        select(UserTeamPlayer)
        .options(
            selectinload(UserTeamPlayer.user_team).selectinload(UserTeam.user),
            selectinload(UserTeamPlayer.user_team).selectinload(UserTeam.contest),
            selectinload(UserTeamPlayer.score_events).selectinload(PlayerScoreEvent.contest_game),
        )
        .where(UserTeamPlayer.player_id == player_id)
    )
    utps = utp_result.scalars().all()

    # Selectors: group by user, count contests
    user_map: dict = defaultdict(lambda: {"user_name": "", "team_name": None, "count": 0})
    for utp in utps:
        u = utp.user_team.user
        key = str(u.id)
        user_map[key]["user_name"] = u.name
        user_map[key]["team_name"] = u.team_name
        user_map[key]["count"] += 1

    selectors = sorted(
        [PlayerSelectorOut(user_name=v["user_name"], team_name=v["team_name"], selection_count=v["count"])
         for v in user_map.values()],
        key=lambda s: s.selection_count, reverse=True,
    )

    # Contest stats: one representative UTP per contest (base_points are identical across selectors)
    contest_utp_map: dict = {}
    for utp in utps:
        cid = str(utp.user_team.contest_id)
        if cid not in contest_utp_map:
            contest_utp_map[cid] = utp

    contest_stats = []
    for utp in contest_utp_map.values():
        c = utp.user_team.contest
        events = [
            PlayerGameEventOut(
                event_type=e.event_type,
                base_points=e.base_points,
                multiplier_applied=e.multiplier_applied,
                points_awarded=e.points_awarded,
                game_name=e.contest_game.name if e.contest_game else None,
                game_number=e.contest_game.game_number if e.contest_game else None,
            )
            for e in utp.score_events
        ]
        contest_stats.append(PlayerContestStatsOut(
            contest_id=c.id,
            contest_name=c.name,
            match_date=c.match_date,
            is_locked=c.is_locked,
            is_completed=c.is_completed,
            total_base_points=sum(e.base_points for e in utp.score_events),
            events=events,
        ))

    contest_stats.sort(key=lambda cs: cs.match_date, reverse=True)

    p_out = PlayerDetailOut.model_validate(player)
    p_out.total_selections = len(utps)
    p_out.contests = contest_stats
    p_out.selectors = selectors
    return p_out


@router.get("/{player_id}/photo")
async def proxy_player_photo(player_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    """Proxy the player's profile photo from Google Drive, avoiding browser CORS/ORB issues."""
    result = await db.execute(select(Player.photo_url).where(Player.id == player_id))
    photo_url = result.scalar_one_or_none()
    if not photo_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No photo for this player")

    async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
        try:
            resp = await client.get(photo_url)
            resp.raise_for_status()
        except httpx.HTTPError:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not fetch photo")

    content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
    return Response(
        content=resp.content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/{player_id}", response_model=PlayerWithTeamOut)
async def get_player(player_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Player).options(selectinload(Player.team)).where(Player.id == player_id)
    )
    player = result.scalar_one_or_none()
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return player
