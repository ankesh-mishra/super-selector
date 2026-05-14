"""
Seed teams into the `teams` table and register them in `tournament_teams`
for an existing tournament.

Usage (run from backend/):
    DATABASE_URL=postgresql+asyncpg://... TOURNAMENT_NAME="My Tournament" python seed_teams.py

Railway note:
    Railway exposes the URL as DATABASE_URL in the form postgresql://...
    This script auto-converts it to the asyncpg scheme if needed.
"""
import asyncio
import os
import sys

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models import Team, Tournament, TournamentTeam, SportEnum

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────

_raw_url = os.environ.get("DATABASE_URL", "")
if not _raw_url:
    sys.exit("ERROR: DATABASE_URL environment variable is not set.")

# Railway / Render return  postgresql://  — asyncpg requires  postgresql+asyncpg://
DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

TOURNAMENT_NAME = os.environ.get("TOURNAMENT_NAME", "")

# ──────────────────────────────────────────────
# Teams to seed
# ──────────────────────────────────────────────

TEAMS = [
    ("Assetz Challengers",       SportEnum.BADMINTON),
    ("Assetz Endless Rally",     SportEnum.BADMINTON),
    ("Backhand Brigade",         SportEnum.BADMINTON),
    ("Big Dawgs",                SportEnum.BADMINTON),
    ("Club Shakti",              SportEnum.BADMINTON),
    ("Court Commanders",         SportEnum.BADMINTON),
    ("Dhurandhar Smash Squad",   SportEnum.BADMINTON),
    ("Mavericks 63",             SportEnum.BADMINTON),
    ("Netflicks & Kill",         SportEnum.BADMINTON),
    ("Shuttle Strikers",         SportEnum.BADMINTON),
    ("Smash Syndicate",          SportEnum.BADMINTON),
    ("Supersonic",               SportEnum.BADMINTON),
]


# ──────────────────────────────────────────────
# Seed logic
# ──────────────────────────────────────────────

async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:

        # ── Resolve tournament ──────────────────
        if TOURNAMENT_NAME:
            result = await session.execute(
                select(Tournament).where(Tournament.name == TOURNAMENT_NAME)
            )
            tournament = result.scalar_one_or_none()
            if not tournament:
                sys.exit(f"ERROR: Tournament '{TOURNAMENT_NAME}' not found in the database.")
        else:
            # Fall back to the single active tournament
            result = await session.execute(
                select(Tournament).where(Tournament.is_active == True).limit(1)
            )
            tournament = result.scalar_one_or_none()
            if not tournament:
                sys.exit("ERROR: No active tournament found. Set TOURNAMENT_NAME env var to specify one.")

        print(f"Tournament: {tournament.name} ({tournament.id})\n")

        # ── Upsert teams & link to tournament ──
        teams_inserted = 0
        teams_skipped = 0
        links_inserted = 0
        links_skipped = 0

        for team_name, sport in TEAMS:
            # Upsert team
            result = await session.execute(select(Team).where(Team.name == team_name))
            team = result.scalar_one_or_none()
            if not team:
                team = Team(name=team_name, sport=sport)
                session.add(team)
                await session.flush()
                print(f"  + Team created : {team_name}")
                teams_inserted += 1
            else:
                print(f"  ~ Team exists  : {team_name}")
                teams_skipped += 1

            # Link team to tournament
            result = await session.execute(
                select(TournamentTeam).where(
                    TournamentTeam.tournament_id == tournament.id,
                    TournamentTeam.team_id == team.id,
                )
            )
            link = result.scalar_one_or_none()
            if not link:
                session.add(TournamentTeam(tournament_id=tournament.id, team_id=team.id))
                print(f"    → Linked to tournament")
                links_inserted += 1
            else:
                print(f"    → Already linked")
                links_skipped += 1

        await session.commit()

    await engine.dispose()

    print(
        f"\nDone."
        f"\n  Teams   — inserted: {teams_inserted}, already existed: {teams_skipped}"
        f"\n  Links   — inserted: {links_inserted}, already existed: {links_skipped}"
    )


if __name__ == "__main__":
    asyncio.run(seed())
