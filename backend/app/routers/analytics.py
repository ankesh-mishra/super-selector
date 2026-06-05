"""Analytics endpoints.

POST /pageview  — public, optional auth. Records one page navigation event.
GET  /summary   — admin only. Returns aggregated metrics.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select, distinct, text, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_optional_current_user, require_admin
from app.models import Contest, ContestJoinRequest, PageView, User, UserTeam

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
    t1h = now - timedelta(hours=1)
    t2h = now - timedelta(hours=2)
    t6h = now - timedelta(hours=6)
    t12h = now - timedelta(hours=12)
    t14h = now - timedelta(hours=14)
    t24h = now - timedelta(hours=24)
    t7d  = now - timedelta(days=7)
    t30d = now - timedelta(days=30)

    async def count_unique_sessions(since: datetime) -> int:
        r = await db.execute(
            select(func.count(distinct(PageView.session_id)))
            .where(PageView.visited_at >= since)
        )
        return r.scalar_one() or 0

    async def count_unique_visitors(since: datetime) -> int:
        # One visitor key per session: user:<id> if authenticated at least once in window, else session:<id>.
        # Then distinct over visitor keys merges multiple sessions for the same logged-in user.
        q = text(
            """
            WITH session_identity AS (
                SELECT DISTINCT ON (pv.session_id)
                    pv.session_id,
                    pv.user_id AS resolved_user_id
                FROM page_views pv
                WHERE pv.visited_at >= :since
                ORDER BY
                    pv.session_id,
                    (pv.user_id IS NOT NULL) DESC,
                    pv.visited_at DESC
            )
            SELECT COUNT(DISTINCT
                CASE
                    WHEN resolved_user_id IS NOT NULL THEN 'user:' || resolved_user_id::text
                    ELSE 'session:' || session_id
                END
            ) AS unique_visitors
            FROM session_identity
            """
        )
        r = await db.execute(q, {"since": since})
        return int(r.scalar_one() or 0)

    async def count_unique_users(since: datetime) -> int:
        r = await db.execute(
            select(func.count(distinct(PageView.user_id)))
            .where(PageView.visited_at >= since)
            .where(PageView.user_id.isnot(None))
        )
        return r.scalar_one() or 0

    async def count_visitors_split(since: datetime | None) -> tuple[int, int]:
        where_clause = "WHERE pv.visited_at >= :since" if since else ""
        q = text(
            f"""
            WITH session_identity AS (
                SELECT DISTINCT ON (pv.session_id)
                    pv.session_id,
                    pv.user_id AS resolved_user_id
                FROM page_views pv
                {where_clause}
                ORDER BY
                    pv.session_id,
                    (pv.user_id IS NOT NULL) DESC,
                    pv.visited_at DESC
            )
            SELECT
                COUNT(
                    CASE WHEN resolved_user_id IS NULL THEN 1 END
                ) AS anonymous_users,
                COUNT(DISTINCT
                    CASE WHEN resolved_user_id IS NOT NULL THEN resolved_user_id END
                ) AS logged_in_users
            FROM session_identity
            """
        )
        params = {"since": since} if since else {}
        r = await db.execute(q, params)
        row = r.one()
        return int(row.anonymous_users or 0), int(row.logged_in_users or 0)

    async def count_account_creators(since: datetime) -> int:
        r = await db.execute(
            select(func.count(User.id))
            .where(User.created_at >= since)
        )
        return int(r.scalar_one() or 0)

    async def count_contest_joiners(since: datetime) -> int:
        r = await db.execute(
            select(func.count(distinct(UserTeam.user_id)))
            .join(Contest, Contest.id == UserTeam.contest_id)
            .outerjoin(
                ContestJoinRequest,
                and_(
                    ContestJoinRequest.contest_id == UserTeam.contest_id,
                    ContestJoinRequest.user_id == UserTeam.user_id,
                ),
            )
            .where(UserTeam.created_at >= since)
            .where(
                or_(
                    Contest.sponsor_id.is_(None),
                    Contest.join_approval_required.is_(False),
                    Contest.sponsor_id == UserTeam.user_id,
                    ContestJoinRequest.status == "APPROVED",
                )
            )
        )
        return int(r.scalar_one() or 0)

    async def count_sponsors(since: datetime) -> int:
        r = await db.execute(
            select(func.count(distinct(Contest.sponsor_id)))
            .where(Contest.sponsor_id.isnot(None))
            .where(Contest.created_at >= since)
        )
        return int(r.scalar_one() or 0)

    async def count_new_user_team_joins(since: datetime | None) -> int:
        q = select(func.count(UserTeam.id))
        if since:
            q = q.where(UserTeam.created_at >= since)
        r = await db.execute(q)
        return int(r.scalar_one() or 0)

    async def count_new_users_sponsoring(since: datetime | None) -> int:
        q = (
            select(func.count(distinct(Contest.sponsor_id)))
            .where(Contest.sponsor_id.isnot(None))
        )
        if since:
            q = q.where(Contest.created_at >= since)
        r = await db.execute(q)
        return int(r.scalar_one() or 0)

    async def count_new_contests_first_team(since: datetime | None) -> int:
        if since:
            q = text(
                """
                SELECT COUNT(*)
                FROM (
                    SELECT ut.contest_id
                    FROM user_teams ut
                    GROUP BY ut.contest_id
                    HAVING MIN(ut.created_at) >= :since
                ) AS first_team_contests
                """
            )
            r = await db.execute(q, {"since": since})
            return int(r.scalar_one() or 0)

        r = await db.execute(select(func.count(distinct(UserTeam.contest_id))))
        return int(r.scalar_one() or 0)

    async def list_live_upcoming_contests_with_teams(limit: int = 25) -> list[dict]:
        q = text(
            """
            SELECT
                c.id,
                c.name,
                c.match_date,
                COUNT(ut.id) AS team_count
            FROM contests c
            JOIN user_teams ut ON ut.contest_id = c.id
            WHERE c.is_completed = FALSE
            GROUP BY c.id, c.name, c.match_date
            ORDER BY team_count DESC, c.match_date ASC
            LIMIT :limit
            """
        )
        r = await db.execute(q, {"limit": limit})
        return [
            {
                "contest_id": str(row.id),
                "contest_name": row.name,
                "match_date": row.match_date.isoformat() if row.match_date else None,
                "team_count": int(row.team_count or 0),
            }
            for row in r.all()
        ]

    async def list_contests_getting_first_team(since: datetime | None, limit: int = 25) -> list[dict]:
        if since:
            q = text(
                """
                WITH first_team AS (
                    SELECT
                        ut.contest_id,
                        MIN(ut.created_at) AS first_team_at
                    FROM user_teams ut
                    GROUP BY ut.contest_id
                    HAVING MIN(ut.created_at) >= :since
                ),
                team_counts AS (
                    SELECT ut.contest_id, COUNT(*) AS team_count
                    FROM user_teams ut
                    GROUP BY ut.contest_id
                )
                SELECT
                    c.id,
                    c.name,
                    c.match_date,
                    ft.first_team_at,
                    COALESCE(tc.team_count, 0) AS team_count
                FROM first_team ft
                JOIN contests c ON c.id = ft.contest_id
                LEFT JOIN team_counts tc ON tc.contest_id = c.id
                ORDER BY ft.first_team_at DESC
                LIMIT :limit
                """
            )
            params = {"since": since, "limit": limit}
        else:
            q = text(
                """
                WITH first_team AS (
                    SELECT
                        ut.contest_id,
                        MIN(ut.created_at) AS first_team_at
                    FROM user_teams ut
                    GROUP BY ut.contest_id
                ),
                team_counts AS (
                    SELECT ut.contest_id, COUNT(*) AS team_count
                    FROM user_teams ut
                    GROUP BY ut.contest_id
                )
                SELECT
                    c.id,
                    c.name,
                    c.match_date,
                    ft.first_team_at,
                    COALESCE(tc.team_count, 0) AS team_count
                FROM first_team ft
                JOIN contests c ON c.id = ft.contest_id
                LEFT JOIN team_counts tc ON tc.contest_id = c.id
                ORDER BY ft.first_team_at DESC
                LIMIT :limit
                """
            )
            params = {"limit": limit}

        r = await db.execute(q, params)
        return [
            {
                "contest_id": str(row.id),
                "contest_name": row.name,
                "match_date": row.match_date.isoformat() if row.match_date else None,
                "first_team_at": row.first_team_at.isoformat() if row.first_team_at else None,
                "team_count": int(row.team_count or 0),
            }
            for row in r.all()
        ]

    async def list_new_accounts(since: datetime | None, limit: int = 25) -> list[dict]:
        q = select(User.id, User.name, User.email, User.created_at).order_by(User.created_at.desc()).limit(limit)
        if since:
            q = q.where(User.created_at >= since)
        r = await db.execute(q)
        return [
            {
                "user_id": str(row.id),
                "name": row.name,
                "email": row.email,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in r.all()
        ]

    async def list_users_creating_first_team(since: datetime | None, limit: int = 25) -> list[dict]:
        if since:
            q = text(
                """
                WITH user_first_team AS (
                    SELECT
                        ut.user_id,
                        MIN(ut.created_at) AS first_team_at
                    FROM user_teams ut
                    GROUP BY ut.user_id
                    HAVING MIN(ut.created_at) >= :since
                ),
                first_team_row AS (
                    SELECT DISTINCT ON (ut.user_id)
                        ut.user_id,
                        ut.contest_id,
                        ut.created_at
                    FROM user_teams ut
                    JOIN user_first_team uft ON uft.user_id = ut.user_id
                    WHERE ut.created_at = uft.first_team_at
                    ORDER BY ut.user_id, ut.created_at ASC, ut.id ASC
                )
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    ftr.created_at AS first_team_at,
                    c.id AS contest_id,
                    c.name AS contest_name
                FROM first_team_row ftr
                JOIN users u ON u.id = ftr.user_id
                JOIN contests c ON c.id = ftr.contest_id
                ORDER BY ftr.created_at DESC
                LIMIT :limit
                """
            )
            params = {"since": since, "limit": limit}
        else:
            q = text(
                """
                WITH user_first_team AS (
                    SELECT
                        ut.user_id,
                        MIN(ut.created_at) AS first_team_at
                    FROM user_teams ut
                    GROUP BY ut.user_id
                ),
                first_team_row AS (
                    SELECT DISTINCT ON (ut.user_id)
                        ut.user_id,
                        ut.contest_id,
                        ut.created_at
                    FROM user_teams ut
                    JOIN user_first_team uft ON uft.user_id = ut.user_id
                    WHERE ut.created_at = uft.first_team_at
                    ORDER BY ut.user_id, ut.created_at ASC, ut.id ASC
                )
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    ftr.created_at AS first_team_at,
                    c.id AS contest_id,
                    c.name AS contest_name
                FROM first_team_row ftr
                JOIN users u ON u.id = ftr.user_id
                JOIN contests c ON c.id = ftr.contest_id
                ORDER BY ftr.created_at DESC
                LIMIT :limit
                """
            )
            params = {"limit": limit}

        r = await db.execute(q, params)
        return [
            {
                "user_id": str(row.id),
                "name": row.name,
                "email": row.email,
                "first_team_at": row.first_team_at.isoformat() if row.first_team_at else None,
                "contest_id": str(row.contest_id),
                "contest_name": row.contest_name,
            }
            for row in r.all()
        ]

    def pct(num: int, den: int) -> float:
        return round((num * 100.0 / den), 2) if den else 0.0

    # Concurrent-ish: sessions active in last 30 minutes
    active_now = await count_unique_sessions(t30m)

    # Unique visitors (merged identity: user_id if present else session_id)
    visitors_2h = await count_unique_visitors(t2h)
    visitors_6h = await count_unique_visitors(t6h)
    visitors_12h = await count_unique_visitors(t12h)
    visitors_24h = await count_unique_visitors(t24h)
    visitors_7d  = await count_unique_visitors(t7d)
    visitors_30d = await count_unique_visitors(t30d)

    # Total all-time unique sessions
    r = await db.execute(select(func.count(distinct(PageView.session_id))))
    visitors_all = r.scalar_one() or 0

    # Funnel actions
    signups_2h = await count_account_creators(t2h)
    signups_6h = await count_account_creators(t6h)
    signups_12h = await count_account_creators(t12h)
    signups_24h = await count_account_creators(t24h)

    joiners_2h = await count_contest_joiners(t2h)
    joiners_6h = await count_contest_joiners(t6h)
    joiners_12h = await count_contest_joiners(t12h)
    joiners_24h = await count_contest_joiners(t24h)

    sponsors_2h = await count_sponsors(t2h)
    sponsors_6h = await count_sponsors(t6h)
    sponsors_12h = await count_sponsors(t12h)
    sponsors_24h = await count_sponsors(t24h)

    # Unique logged-in users
    users_24h = await count_unique_users(t24h)
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

    period_map = {
        "1h": t1h,
        "2h": t2h,
        "6h": t6h,
        "12h": t12h,
        "14h": t14h,
        "alltime": None,
    }
    funnel_over_time = {}
    for period_key, since in period_map.items():
        anonymous_users, logged_in_users = await count_visitors_split(since)
        new_accounts_created = await count_account_creators(since) if since else int((await db.execute(select(func.count(User.id)))).scalar_one() or 0)
        new_user_team_joins = await count_new_user_team_joins(since)
        new_users_sponsoring = await count_new_users_sponsoring(since)
        new_contests_first_team = await count_new_contests_first_team(since)

        funnel_over_time[period_key] = {
            "unique_anonymous_users": anonymous_users,
            "unique_logged_in_users": logged_in_users,
            "new_accounts_created": new_accounts_created,
            "new_user_team_joins": new_user_team_joins,
            "new_users_sponsoring": new_users_sponsoring,
            "new_contests_first_team": new_contests_first_team,
        }

    live_upcoming_with_teams = await list_live_upcoming_contests_with_teams(limit=25)
    analytics_lists_by_period = {}
    for period_key, since in period_map.items():
        analytics_lists_by_period[period_key] = {
            "contests_getting_first_team": await list_contests_getting_first_team(since, limit=25),
            "new_accounts": await list_new_accounts(since, limit=25),
            "users_creating_first_team": await list_users_creating_first_team(since, limit=25),
        }

    return {
        "active_now": active_now,
        "visitors": {
            "last_24h": visitors_24h,
            "last_7d":  visitors_7d,
            "last_30d": visitors_30d,
            "all_time": visitors_all,
        },
        "funnel": {
            "browsers": {
                "last_2h": visitors_2h,
                "last_6h": visitors_6h,
                "last_12h": visitors_12h,
                "last_24h": visitors_24h,
            },
            "account_creators": {
                "last_2h": signups_2h,
                "last_6h": signups_6h,
                "last_12h": signups_12h,
                "last_24h": signups_24h,
            },
            "contest_joiners": {
                "last_2h": joiners_2h,
                "last_6h": joiners_6h,
                "last_12h": joiners_12h,
                "last_24h": joiners_24h,
            },
            "sponsors": {
                "last_2h": sponsors_2h,
                "last_6h": sponsors_6h,
                "last_12h": sponsors_12h,
                "last_24h": sponsors_24h,
            },
            "conversion": {
                "browse_to_account": {
                    "last_2h": pct(signups_2h, visitors_2h),
                    "last_6h": pct(signups_6h, visitors_6h),
                    "last_12h": pct(signups_12h, visitors_12h),
                    "last_24h": pct(signups_24h, visitors_24h),
                },
                "account_to_join": {
                    "last_2h": pct(joiners_2h, signups_2h),
                    "last_6h": pct(joiners_6h, signups_6h),
                    "last_12h": pct(joiners_12h, signups_12h),
                    "last_24h": pct(joiners_24h, signups_24h),
                },
                "join_to_sponsor": {
                    "last_2h": pct(sponsors_2h, joiners_2h),
                    "last_6h": pct(sponsors_6h, joiners_6h),
                    "last_12h": pct(sponsors_12h, joiners_12h),
                    "last_24h": pct(sponsors_24h, joiners_24h),
                },
                "browse_to_sponsor": {
                    "last_2h": pct(sponsors_2h, visitors_2h),
                    "last_6h": pct(sponsors_6h, visitors_6h),
                    "last_12h": pct(sponsors_12h, visitors_12h),
                    "last_24h": pct(sponsors_24h, visitors_24h),
                },
            },
        },
        "logged_in_users": {
            "last_24h": users_24h,
            "last_7d":  users_7d,
            "last_30d": users_30d,
        },
        "total_page_views": total_views,
        "top_pages": top_pages,
        "dau_7d": dau,
        "funnel_over_time": funnel_over_time,
        "analytics_lists": {
            "live_upcoming_with_teams": live_upcoming_with_teams,
            "by_period": analytics_lists_by_period,
        },
    }
