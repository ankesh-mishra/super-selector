import uuid
from io import BytesIO
from datetime import datetime, timezone
from html import escape
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, Response
from PIL import Image, ImageDraw, ImageOps
import httpx
from sqlalchemy import select, func, update, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Contest, ContestGame, ContestGamePlayer, ContestJoinRequest, Player, Team, User, UserTeam
from app.schemas import ContestOut, ContestDetailOut, ContestCardOut, ContestJoinRequestOut, JoinRequestUpdate, SponsorContestRequest

router = APIRouter()


TEAM_LOGO_MAP = {
    "Assetz Challengers": "Assetz20Challengers.webp",
    "Assetz Endless Rally": "Assetz20Endless20Rally.webp",
    "Backhand Brigade": "Backhand20Brigade.webp",
    "Big Dawgs": "Big20Dawgs.webp",
    "Club Shakti": "Club20Shakti.webp",
    "Court Commanders": "Court20Commanders.webp",
    "Dhurandhar Smash Squad": "Dhurandhar20Smash20Squad.webp",
    "Mavericks 63": "Mavericks2063.webp",
    "Netflicks & Kill": "Netflicks202620Kill.webp",
    "Shuttle Strikers": "Shuttle20Strikers.webp",
    "Smash Syndicate": "Smash20Syndicate.webp",
    "Supersonic": "Supersonic.webp",
}


def _team_logo_rel_path(team_name: str | None) -> str | None:
    filename = TEAM_LOGO_MAP.get(team_name or "")
    return f"/team-logos/{filename}" if filename else None


def _paste_logo(base: Image.Image, logo: Image.Image, box: tuple[int, int, int, int]):
    logo = logo.convert("RGBA")
    fitted = ImageOps.fit(logo, (box[2], box[3]), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", (box[2], box[3]), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, box[2], box[3]), fill=255)
    base.paste(fitted, (box[0], box[1]), mask)


def _paste_rect_logo(base: Image.Image, logo: Image.Image, box: tuple[int, int, int, int]):
    logo = logo.convert("RGBA")
    fitted = ImageOps.contain(logo, (box[2], box[3]), method=Image.Resampling.LANCZOS)
    x = box[0] + (box[2] - fitted.width) // 2
    y = box[1] + (box[3] - fitted.height) // 2
    base.paste(fitted, (x, y), fitted)


async def _fetch_remote_image(client: httpx.AsyncClient, url: str) -> Image.Image | None:
    try:
        r = await client.get(url, timeout=6.0)
        if r.status_code != 200:
            return None
        return Image.open(BytesIO(r.content)).convert("RGBA")
    except Exception:
        return None


def _placeholder_logo(size: int = 240) -> Image.Image:
    img = Image.new("RGBA", (size, size), (15, 22, 35, 255))
    draw = ImageDraw.Draw(img)
    draw.ellipse((8, 8, size - 8, size - 8), outline="#1f3a63", width=6)
    draw.text((size // 2, size // 2), "SS", anchor="mm", fill="#94a3b8", font_size=64)
    return img


@router.get("/share-image/{contest_id}.png")
async def share_contest_image(contest_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    """PNG OG image with both team logos and VS in the middle."""
    settings = get_settings()
    result = await db.execute(
        select(Contest)
        .options(selectinload(Contest.team_a), selectinload(Contest.team_b))
        .where(Contest.id == contest_id)
    )
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=404, detail="Contest not found")

    image = Image.new("RGBA", (1200, 630), "#0b1220")
    draw = ImageDraw.Draw(image)
    draw.ellipse((-80, -120, 500, 420), fill="#12344f")
    draw.ellipse((760, -140, 1280, 380), fill="#173357")
    draw.rounded_rectangle((40, 40, 1160, 590), radius=28, outline="#1f3a63", width=3)
    draw.ellipse((180, 155, 480, 455), fill="#09111e", outline="#274a78", width=8)
    draw.ellipse((720, 155, 1020, 455), fill="#09111e", outline="#274a78", width=8)
    draw.rounded_rectangle((525, 245, 675, 385), radius=28, fill="#102a1f", outline="#10b981", width=4)
    draw.rounded_rectangle((70, 70, 430, 150), radius=20, fill="#0b1a2c", outline="#1f3a63", width=2)
    draw.text((270, 110), "Super Selector", anchor="mm", fill="#e2e8f0", font_size=40)
    draw.text((600, 315), "v", anchor="mm", fill="#ffffff", font_size=68)
    draw.text((600, 535), f"{contest.team_a.name} vs {contest.team_b.name}", anchor="mm", fill="#e2e8f0", font_size=56)

    logo_a_rel = _team_logo_rel_path(contest.team_a.name)
    logo_b_rel = _team_logo_rel_path(contest.team_b.name)
    logo_a_url = f"{settings.frontend_url}{logo_a_rel}" if logo_a_rel else None
    logo_b_url = f"{settings.frontend_url}{logo_b_rel}" if logo_b_rel else None
    app_logo_url = f"{settings.frontend_url}/logo.webp"

    async with httpx.AsyncClient(follow_redirects=True) as client:
        logo_a_img = await _fetch_remote_image(client, logo_a_url) if logo_a_url else None
        logo_b_img = await _fetch_remote_image(client, logo_b_url) if logo_b_url else None
        app_logo_img = await _fetch_remote_image(client, app_logo_url)

    _paste_logo(image, logo_a_img or _placeholder_logo(), (210, 185, 240, 240))
    _paste_logo(image, logo_b_img or _placeholder_logo(), (750, 185, 240, 240))
    if app_logo_img:
        _paste_rect_logo(image, app_logo_img, (88, 82, 56, 56))

    buffer = BytesIO()
    image.convert("RGB").save(buffer, format="PNG", optimize=True)
    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "no-store, max-age=0"},
    )


@router.get("/s/{contest_id}", response_class=HTMLResponse)
@router.get("/share/{contest_id}", response_class=HTMLResponse)
async def share_contest(contest_id: uuid.UUID, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    """Returns an HTML page with Open Graph meta tags for rich WhatsApp / social previews."""
    settings = get_settings()
    result = await db.execute(
        select(Contest)
        .options(selectinload(Contest.team_a), selectinload(Contest.team_b), selectinload(Contest.sponsor))
        .where(Contest.id == contest_id)
    )
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=404, detail="Contest not found")

    dest = f"{settings.frontend_url}/contests/{contest_id}"
    ts = int(datetime.now(timezone.utc).timestamp())
    share_url = str(request.url.replace(query=""))
    title = escape(f"{contest.team_a.name} vs {contest.team_b.name}")
    prize_icons = {"CASH": "💵", "DRINKS": "🍷", "FNB": "🍽️", "GIFTS": "🎁", "OTHERS": "⭐"}
    prize_icon = prize_icons.get(contest.prize_type or "", "🏆")
    prize_line = f"{prize_icon} {escape(contest.prize)}" if contest.prize else ""
    sponsor_line = f"Sponsored/Managed by {escape(contest.sponsor.name)}" if contest.sponsor else ""
    desc_parts = [p for p in [prize_line, sponsor_line] if p]
    description = escape(" · ".join(desc_parts) if desc_parts else "Fantasy contest on SuperSelector")

    image_url = request.url_for("share_contest_image", contest_id=str(contest_id))
    og_image = f"{image_url}?v={ts}"

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{title}</title>
  <meta property="og:type" content="website">
    <meta property="og:site_name" content="Super Selector">
    <meta property="og:url" content="{share_url}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="{og_image}">
    <meta property="og:image:secure_url" content="{og_image}">
    <meta property="og:locale" content="en_IN">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="{share_url}">
    <meta name="twitter:site" content="@superselector">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{og_image}">
    <meta http-equiv="refresh" content="0; url={dest}">
</head>
<body style="background:#080d14;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <a href="{dest}" style="color:#34d399;font-size:1rem">Opening contest…</a>
    <script>window.location.replace("{dest}")</script>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.get("/trending", response_model=list[ContestCardOut])
async def trending_contests(db: Annotated[AsyncSession, Depends(get_db)]):
    """Open/live contests with participant counts — sorted by live first, then participants desc, then earliest date."""
    # Auto-lock any contest whose match_date has passed
    await db.execute(
        update(Contest)
        .where(Contest.match_date <= datetime.now(timezone.utc))
        .where(Contest.is_locked == False)  # noqa: E712
        .where(Contest.is_completed == False)  # noqa: E712
        .values(is_locked=True)
    )
    await db.commit()

    result = await db.execute(
        select(Contest)
        .options(
            selectinload(Contest.team_a).selectinload(Team.players),
            selectinload(Contest.team_b).selectinload(Team.players),
            selectinload(Contest.tournament),
            selectinload(Contest.sponsor),
        )
        .where(Contest.is_completed == False)
        .order_by(Contest.sponsor_id.is_(None), Contest.match_date)
        .limit(20)
    )
    contests = result.scalars().all()

    if not contests:
        return []

    contest_ids = [c.id for c in contests]
    count_result = await db.execute(
        select(UserTeam.contest_id, func.count(UserTeam.id).label("cnt"))
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
    count_map = {row.contest_id: int(row.cnt) for row in count_result.all()}

    cards = [
        ContestCardOut(
            id=c.id,
            name=c.name,
            match_date=c.match_date,
            is_locked=c.is_locked,
            is_completed=c.is_completed,
            participant_count=count_map.get(c.id, 0),
            tournament_name=c.tournament.name if c.tournament else None,
            team_a_name=c.team_a.name,
            team_b_name=c.team_b.name,
            team_a_captain_name=next((p.name for p in c.team_a.players if p.is_real_captain), None),
            team_b_captain_name=next((p.name for p in c.team_b.players if p.is_real_captain), None),
            prize=c.prize,
            prize_type=c.prize_type,
            sponsor_name=c.sponsor.name if c.sponsor else None,
        )
        for c in contests
    ]

    cards.sort(key=lambda x: (
        0 if x.sponsor_name else 1,                         # sponsored first
        0 if (x.is_locked and not x.is_completed) else 1,  # live next
        -x.participant_count,                               # most participants
        x.match_date,                                       # earliest date
    ))

    return cards[:8]


@router.get("", response_model=list[ContestOut])
async def list_contests(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Contest).order_by(Contest.match_date.desc()))
    return result.scalars().all()


@router.get("/{contest_id}", response_model=ContestDetailOut)
async def get_contest(contest_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Contest)
        .options(
            selectinload(Contest.team_a).selectinload(Team.players),
            selectinload(Contest.team_b).selectinload(Team.players),
            selectinload(Contest.contest_games).selectinload(ContestGame.game_players).selectinload(ContestGamePlayer.player).selectinload(Player.team),
            selectinload(Contest.tournament),
            selectinload(Contest.sponsor),
        )
        .where(Contest.id == contest_id)
    )
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    out = ContestDetailOut.model_validate(contest)
    out.team_a_captain_name = next((p.name for p in contest.team_a.players if p.is_real_captain), None)
    out.team_b_captain_name = next((p.name for p in contest.team_b.players if p.is_real_captain), None)
    out.sponsor_name = contest.sponsor.name if contest.sponsor else None
    return out


# ──────────────────────────────────────────────
# Join Requests (sponsor-gated contests)
# ──────────────────────────────────────────────

@router.post("/{contest_id}/join-request", response_model=ContestJoinRequestOut, status_code=status.HTTP_201_CREATED)
async def request_to_join(
    contest_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a join request for a sponsored contest."""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    if not contest.sponsor_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contest does not require join approval")
    if not contest.join_approval_required:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Join approval is not enabled for this contest")
    if contest.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contest is locked")

    # Build team first, then request approval.
    team_result = await db.execute(
        select(UserTeam).where(
            UserTeam.contest_id == contest_id,
            UserTeam.user_id == current_user.id,
        )
    )
    if team_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Build your team first, then request sponsor approval",
        )

    existing = await db.execute(
        select(ContestJoinRequest).where(
            ContestJoinRequest.contest_id == contest_id,
            ContestJoinRequest.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already submitted a join request")

    req = ContestJoinRequest(contest_id=contest_id, user_id=current_user.id, status="PENDING")
    db.add(req)
    await db.commit()
    await db.refresh(req)
    out = ContestJoinRequestOut(
        id=req.id, contest_id=req.contest_id, user_id=req.user_id,
        user_name=current_user.name, status=req.status, created_at=req.created_at,
    )
    return out


@router.get("/{contest_id}/my-join-request", response_model=ContestJoinRequestOut | None)
async def my_join_request(
    contest_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get the current user's join request for a contest (null if none)."""
    result = await db.execute(
        select(ContestJoinRequest)
        .options(selectinload(ContestJoinRequest.user))
        .where(
            ContestJoinRequest.contest_id == contest_id,
            ContestJoinRequest.user_id == current_user.id,
        )
    )
    req = result.scalar_one_or_none()
    if req is None:
        return None
    return ContestJoinRequestOut(
        id=req.id, contest_id=req.contest_id, user_id=req.user_id,
        user_name=req.user.name, status=req.status, created_at=req.created_at,
    )


@router.get("/{contest_id}/join-requests", response_model=list[ContestJoinRequestOut])
async def list_join_requests(
    contest_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all join requests — sponsor or admin only."""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    if contest.sponsor_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the sponsor or an admin can view join requests")

    result = await db.execute(
        select(ContestJoinRequest)
        .options(selectinload(ContestJoinRequest.user))
        .where(ContestJoinRequest.contest_id == contest_id)
        .order_by(ContestJoinRequest.created_at)
    )
    requests = result.scalars().all()
    return [
        ContestJoinRequestOut(
            id=r.id, contest_id=r.contest_id, user_id=r.user_id,
            user_name=r.user.name, status=r.status, created_at=r.created_at,
        )
        for r in requests
    ]


@router.patch("/{contest_id}/join-requests/{user_id}", response_model=ContestJoinRequestOut)
async def update_join_request(
    contest_id: uuid.UUID,
    user_id: uuid.UUID,
    body: JoinRequestUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Approve or reject a join request — sponsor or admin only."""
    if body.status not in ("APPROVED", "REJECTED"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="status must be APPROVED or REJECTED")

    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    if contest.sponsor_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the sponsor or an admin can manage join requests")

    result = await db.execute(
        select(ContestJoinRequest)
        .options(selectinload(ContestJoinRequest.user))
        .where(ContestJoinRequest.contest_id == contest_id, ContestJoinRequest.user_id == user_id)
    )
    req = result.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Join request not found")

    req.status = body.status
    await db.commit()
    await db.refresh(req)
    return ContestJoinRequestOut(
        id=req.id, contest_id=req.contest_id, user_id=req.user_id,
        user_name=req.user.name, status=req.status, created_at=req.created_at,
    )


@router.post("/{contest_id}/sponsor", response_model=ContestOut)
async def self_sponsor_contest(
    contest_id: uuid.UUID,
    body: SponsorContestRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Allow a logged-in user to self-sponsor an unsponsored, open contest."""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    if contest.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contest is locked")
    if contest.sponsor_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This contest already has a sponsor")

    contest.sponsor_id = current_user.id
    contest.sponsor_contact = body.sponsor_contact
    contest.join_approval_required = body.join_approval_required
    if body.prize_type is not None:
        contest.prize_type = body.prize_type
    if body.prize:
        contest.prize = body.prize

    await db.commit()
    await db.refresh(contest)
    out = ContestOut.model_validate(contest)
    out.sponsor_name = current_user.name
    return out
