"""Analytics endpoints.

POST /pageview  — public, optional auth. Records one page navigation event.
GET  /summary   — admin only. Returns aggregated metrics.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select, distinct, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_optional_current_user, require_admin
from app.models import PageView, User

router = APIRouter()


# ── Schema ─────────────────────────────────────────────────────────────────────

class PageViewIn(BaseModel):
    page: str
    session_id: str


# ── POST /pageview ─────────────────────────────────────────────────────────────

@router.post("/pageview", status_code=200)
async def record_pageview(
    body: PageViewIn,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)],
):
    """Fire-and-forget page navigation event. Never fails the caller."""
    try:
        # Sanitise: keep only the pathname (strip query/fragment just in case)
        page = body.page.split("?")[0].split("#")[0][:512]
        session_id = body.session_id[:64]

        pv = PageView(
            id=uuid.uuid4(),
            session_id=session_id,
            user_id=current_user.id if current_user else None,
            page=page,
        )
        db.add(pv)
        await db.commit()
    except Exception:
        # Analytics must never break the app
        pass
    return {"ok": True}


# ── GET /summary ───────────────────────────────────────────────────────────────

@router.get("/summary")
async def analytics_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    """Aggregated analytics metrics for the admin panel."""
    now = datetime.now(timezone.utc)
    t30m = now - timedelta(minutes=30)
    t1d  = now - timedelta(days=1)
    t7d  = now - timedelta(days=7)
    t30d = now - timedelta(days=30)

    async def count_unique_sessions(since: datetime) -> int:
        r = await db.execute(
            select(func.count(distinct(PageView.session_id)))
            .where(PageView.visited_at >= since)
        )
        return r.scalar_one() or 0

    async def count_unique_users(since: datetime) -> int:
        r = await db.execute(
            select(func.count(distinct(PageView.user_id)))
            .where(PageView.visited_at >= since)
            .where(PageView.user_id.isnot(None))
        )
        return r.scalar_one() or 0

    # Concurrent-ish: sessions active in last 30 minutes
    active_now = await count_unique_sessions(t30m)

    # Unique visitors (by session_id) in various windows
    visitors_1d  = await count_unique_sessions(t1d)
    visitors_7d  = await count_unique_sessions(t7d)
    visitors_30d = await count_unique_sessions(t30d)

    # Total all-time unique sessions
    r = await db.execute(select(func.count(distinct(PageView.session_id))))
    visitors_all = r.scalar_one() or 0

    # Unique logged-in users
    users_1d  = await count_unique_users(t1d)
    users_7d  = await count_unique_users(t7d)
    users_30d = await count_unique_users(t30d)

    # Total page views
    r = await db.execute(select(func.count()).select_from(PageView))
    total_views = r.scalar_one() or 0

    # Top 10 pages (all time)
    r = await db.execute(
        select(PageView.page, func.count().label("views"))
        .group_by(PageView.page)
        .order_by(func.count().desc())
        .limit(10)
    )
    top_pages = [{"page": row.page, "views": row.views} for row in r.all()]

    # DAU — unique sessions per day for last 7 days
    r = await db.execute(
        select(
            func.date_trunc("day", PageView.visited_at).label("day"),
            func.count(distinct(PageView.session_id)).label("visitors"),
        )
        .where(PageView.visited_at >= t7d)
        .group_by(text("day"))
        .order_by(text("day"))
    )
    dau = [
        {
            "date": row.day.strftime("%Y-%m-%d") if hasattr(row.day, "strftime") else str(row.day)[:10],
            "visitors": row.visitors,
        }
        for row in r.all()
    ]

    return {
        "active_now": active_now,
        "visitors": {
            "last_24h": visitors_1d,
            "last_7d":  visitors_7d,
            "last_30d": visitors_30d,
            "all_time": visitors_all,
        },
        "logged_in_users": {
            "last_24h": users_1d,
            "last_7d":  users_7d,
            "last_30d": users_30d,
        },
        "total_page_views": total_views,
        "top_pages": top_pages,
        "dau_7d": dau,
    }
