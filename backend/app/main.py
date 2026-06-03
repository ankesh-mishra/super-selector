from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, teams, players, contests, user_teams, leaderboard, admin, tournaments, analytics, external

settings = get_settings()

app = FastAPI(
    title="Super Selector API",
    description="Fantasy Badminton League — Super Selector",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(players.router, prefix="/api/players", tags=["players"])
app.include_router(tournaments.router, prefix="/api/tournaments", tags=["tournaments"])
app.include_router(contests.router, prefix="/api/contests", tags=["contests"])
app.include_router(user_teams.router, prefix="/api/contests", tags=["user-teams"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(external.router, prefix="/api/ext", tags=["external"])


@app.get("/health")
async def health():
    return {"status": "ok"}
