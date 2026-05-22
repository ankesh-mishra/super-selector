"""
Populate player photo_url from players_combined.csv.

Usage (run from backend/):
    DATABASE_URL=postgresql+asyncpg://... python populate_photos.py

Railway note:
    Railway exposes the URL as DATABASE_URL in the form postgresql://...
    This script auto-converts it to the asyncpg scheme if needed.

The CSV must have columns: id, photo_url
Google Drive share URLs (open?id=...) are converted to the lh3 CDN format.
"""

import asyncio
import csv
import os
import re
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────

_raw_url = os.environ.get("DATABASE_URL", "")
if not _raw_url:
    sys.exit("ERROR: DATABASE_URL environment variable is not set.")

# Railway / Render return  postgresql://  — asyncpg requires  postgresql+asyncpg://
DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "players_combined.csv")

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────


def drive_url_to_direct(url: str) -> str:
    """Convert a Google Drive share URL to a direct embeddable image URL.
    lh3.googleusercontent.com/d/<id> is the CDN format that works as <img src>."""
    m = re.search(r"[?&]id=([^&]+)", url)
    if m:
        return f"https://lh3.googleusercontent.com/d/{m.group(1)}"
    return url


# ──────────────────────────────────────────────
# Seed logic
# ──────────────────────────────────────────────


async def seed() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # ── Load CSV ──────────────────────────────
    photo_map: dict[str, str] = {}
    csv_path = os.path.abspath(CSV_PATH)
    if not os.path.exists(csv_path):
        sys.exit(f"ERROR: CSV not found at {csv_path}")

    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            player_id = row["id"].strip()
            raw_url = row["photo_url"].strip()
            if player_id and raw_url:
                photo_map[player_id] = drive_url_to_direct(raw_url)

    print(f"Loaded {len(photo_map)} photo mappings from CSV\n")

    # ── Update DB ─────────────────────────────
    async with async_session() as session:
        updated = 0
        skipped = 0
        for player_id, photo_url in photo_map.items():
            result = await session.execute(
                text("UPDATE players SET photo_url = :url WHERE id = :id"),
                {"url": photo_url, "id": player_id},
            )
            if result.rowcount:
                updated += 1
            else:
                print(f"  ! Player not found: {player_id}")
                skipped += 1
        await session.commit()

    await engine.dispose()

    print(
        f"\nDone."
        f"\n  Photos — updated: {updated}, player not found: {skipped}"
    )


if __name__ == "__main__":
    asyncio.run(seed())
