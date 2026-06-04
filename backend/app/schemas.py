import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models import GenderEnum, GameTypeEnum, SportEnum, PrizeTypeEnum


# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    team_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    team_name: Optional[str] = None
    avatar_url: Optional[str]
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    team_name: Optional[str] = None


# ──────────────────────────────────────────────
# Teams
# ──────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str
    sport: Optional[SportEnum] = None
    external_id: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    external_id: Optional[str] = None


class TeamOut(BaseModel):
    id: uuid.UUID
    name: str
    sport: Optional[SportEnum] = None
    external_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Tournaments
# ──────────────────────────────────────────────

class TournamentCreate(BaseModel):
    name: str
    sport: SportEnum
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True
    external_id: Optional[str] = None


class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    external_id: Optional[str] = None


class TournamentOut(BaseModel):
    id: uuid.UUID
    name: str
    sport: SportEnum
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool
    external_id: Optional[str] = None
    created_at: datetime
    total_games: int = 0

    model_config = {"from_attributes": True}


class TournamentDetailOut(TournamentOut):
    contests: list["ContestBriefOut"] = []
    teams: list["TeamOut"] = []


# ──────────────────────────────────────────────
# Players
# ──────────────────────────────────────────────

class PlayerCreate(BaseModel):
    name: str
    team_id: uuid.UUID
    gender: GenderEnum
    bid_points: int = 0
    is_real_captain: bool = False
    is_active: bool = True
    external_id: Optional[str] = None


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[GenderEnum] = None
    bid_points: Optional[int] = None
    is_real_captain: Optional[bool] = None
    is_active: Optional[bool] = None
    photo_url: Optional[str] = None
    external_id: Optional[str] = None


class PlayerOut(BaseModel):
    id: uuid.UUID
    name: str
    team_id: uuid.UUID
    gender: GenderEnum
    bid_points: int
    is_real_captain: bool
    is_active: bool
    photo_url: Optional[str] = None
    external_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PlayerWithTeamOut(PlayerOut):
    team: TeamOut


class PlayerTrendingOut(PlayerWithTeamOut):
    selection_count: int = 0


class PlayerByPointsOut(PlayerWithTeamOut):
    total_points: float = 0.0


class PlayerGameEventOut(BaseModel):
    event_type: str
    base_points: float
    multiplier_applied: float
    points_awarded: float
    game_name: Optional[str] = None
    game_number: Optional[int] = None

    model_config = {"from_attributes": True}


class PlayerContestStatsOut(BaseModel):
    contest_id: uuid.UUID
    contest_name: str
    match_date: datetime
    is_locked: bool
    is_completed: bool
    total_base_points: float
    events: list[PlayerGameEventOut] = []


class PlayerSelectorOut(BaseModel):
    user_name: str
    team_name: Optional[str] = None
    selection_count: int


class PlayerDetailOut(PlayerWithTeamOut):
    total_selections: int = 0
    contests: list[PlayerContestStatsOut] = []
    selectors: list[PlayerSelectorOut] = []


# ──────────────────────────────────────────────
# Contests
# ──────────────────────────────────────────────

class ContestCreate(BaseModel):
    tournament_id: Optional[uuid.UUID] = None
    team_a_id: uuid.UUID
    team_b_id: uuid.UUID
    match_date: datetime
    registration_cutoff: datetime
    prize: str = 'Winner Badge'
    external_id: Optional[str] = None
    sponsor_id: Optional[uuid.UUID] = None
    sponsor_contact: Optional[str] = None
    prize_type: Optional[PrizeTypeEnum] = None
    join_approval_required: bool = False


class ContestUpdate(BaseModel):
    name: Optional[str] = None
    match_date: Optional[datetime] = None
    registration_cutoff: Optional[datetime] = None
    is_locked: Optional[bool] = None
    is_completed: Optional[bool] = None
    prize: Optional[str] = None
    external_id: Optional[str] = None
    sponsor_id: Optional[uuid.UUID] = None
    sponsor_contact: Optional[str] = None
    prize_type: Optional[PrizeTypeEnum] = None
    join_approval_required: Optional[bool] = None


class ContestCardOut(BaseModel):
    """Lightweight contest card for the homepage trending section."""
    id: uuid.UUID
    name: str
    match_date: datetime
    is_locked: bool
    is_completed: bool
    participant_count: int = 0
    tournament_name: Optional[str] = None
    team_a_name: Optional[str] = None
    team_b_name: Optional[str] = None
    team_a_captain_name: Optional[str] = None
    team_b_captain_name: Optional[str] = None
    prize: str = 'Winner Badge'
    prize_type: Optional[PrizeTypeEnum] = None
    sponsor_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ContestOut(BaseModel):
    id: uuid.UUID
    name: str
    tournament_id: Optional[uuid.UUID] = None
    match_number: Optional[int] = None
    team_a_id: uuid.UUID
    team_b_id: uuid.UUID
    match_date: datetime
    registration_cutoff: datetime
    is_locked: bool
    is_completed: bool
    prize: str = 'Winner Badge'
    external_id: Optional[str] = None
    created_at: datetime
    sponsor_id: Optional[uuid.UUID] = None
    sponsor_name: Optional[str] = None
    sponsor_contact: Optional[str] = None
    prize_type: Optional[PrizeTypeEnum] = None
    join_approval_required: bool = False

    model_config = {"from_attributes": True}


class ContestBriefOut(BaseModel):
    """Minimal contest info with team names — used in My Contests listing."""
    id: uuid.UUID
    name: str
    tournament_id: Optional[uuid.UUID] = None
    tournament_name: Optional[str] = None
    tournament: Optional["TournamentOut"] = None
    match_number: Optional[int] = None
    match_date: datetime
    is_locked: bool
    is_completed: bool
    prize: str = 'Winner Badge'
    prize_type: Optional[PrizeTypeEnum] = None
    sponsor_name: Optional[str] = None
    participant_count: int = 0
    winning_team_name: Optional[str] = None
    team_a: TeamOut
    team_b: TeamOut

    model_config = {"from_attributes": True}


class ContestDetailOut(ContestOut):
    team_a: TeamOut
    team_b: TeamOut
    tournament: Optional["TournamentOut"] = None
    tournament_name: Optional[str] = None
    team_a_captain_name: Optional[str] = None
    team_b_captain_name: Optional[str] = None
    games: list["ContestGameOut"] = Field(default=[], validation_alias="contest_games")

    model_config = {"from_attributes": True, "populate_by_name": True}


# ──────────────────────────────────────────────
# User Teams
# ──────────────────────────────────────────────

class UserTeamPlayerIn(BaseModel):
    player_id: uuid.UUID
    is_captain: bool = False
    is_vice_captain: bool = False


class UserTeamCreate(BaseModel):
    players: list[UserTeamPlayerIn]

    @field_validator("players")
    @classmethod
    def check_length(cls, v: list) -> list:
        if len(v) != 11:
            raise ValueError("Exactly 11 players must be selected")
        return v


class UserTeamPlayerOut(BaseModel):
    id: uuid.UUID
    player_id: uuid.UUID
    is_captain: bool
    is_vice_captain: bool
    points_earned: float
    player: PlayerWithTeamOut

    model_config = {"from_attributes": True}


class UserTeamOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user: Optional["UserOut"] = None
    contest_id: uuid.UUID
    total_points: float
    created_at: datetime
    players: list[UserTeamPlayerOut] = []

    model_config = {"from_attributes": True}


class MyContestOut(BaseModel):
    """UserTeam with lightweight contest info — for the My Contests listing."""
    id: uuid.UUID
    contest: ContestBriefOut
    total_points: float
    created_at: datetime
    rank: Optional[int] = None
    total_participants: int = 0

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Contest Games & Scores
# ──────────────────────────────────────────────

class ContestGameCreate(BaseModel):
    game_type: GameTypeEnum
    game_code: Optional[str] = None
    name: Optional[str] = None
    player_ids: list[uuid.UUID]
    external_id: Optional[str] = None


class ContestGameUpdate(BaseModel):
    winning_team_id: str  # UUID string or external_id
    game_details: dict  # {"sets": [{"scores": {"<team_uuid_or_ext_id>": 21, ...}, "shots": {...}}, ...]}
    player_ids: Optional[list[str]] = None  # UUID strings or external_ids; allow updating players if needed
    game_code: Optional[str] = None
    name: Optional[str] = None
    external_id: Optional[str] = None


class ContestGamePlayerOut(BaseModel):
    player_id: uuid.UUID
    player: PlayerWithTeamOut

    model_config = {"from_attributes": True}


class ContestGameOut(BaseModel):
    id: uuid.UUID
    contest_id: uuid.UUID
    game_number: Optional[int] = None
    game_type: GameTypeEnum
    game_code: Optional[str] = None
    name: Optional[str] = None
    winning_team_id: Optional[uuid.UUID]
    game_details: Optional[dict]
    external_id: Optional[str] = None
    created_at: datetime
    players: list[ContestGamePlayerOut] = Field(default=[], validation_alias="game_players")

    model_config = {"from_attributes": True, "populate_by_name": True}


# ──────────────────────────────────────────────
# Leaderboard
# ──────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    user_name: str
    team_name: Optional[str] = None
    total_points: float
    contest_id: Optional[uuid.UUID] = None


class OverallLeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    user_name: str
    team_name: Optional[str] = None
    total_points: float
    contests_entered: int


ContestBriefOut.model_rebuild()
ContestDetailOut.model_rebuild()
TournamentDetailOut.model_rebuild()


# ──────────────────────────────────────────────
# Contest Join Requests (sponsor approval)
# ──────────────────────────────────────────────

class ContestJoinRequestOut(BaseModel):
    id: uuid.UUID
    contest_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class JoinRequestUpdate(BaseModel):
    status: str  # "APPROVED" or "REJECTED"


class SponsorContestRequest(BaseModel):
    sponsor_contact: Optional[str] = None
    prize_type: Optional[PrizeTypeEnum] = None
    prize: Optional[str] = None
    join_approval_required: bool = False


class UserBriefOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str

    model_config = {"from_attributes": True}
