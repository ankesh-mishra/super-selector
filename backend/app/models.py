import uuid
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text,
    UniqueConstraint, func, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class GenderEnum(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"


class GameTypeEnum(str, enum.Enum):
    DOUBLES = "DOUBLES"
    SINGLES = "SINGLES"


class SportEnum(str, enum.Enum):
    CRICKET = "CRICKET"
    BADMINTON = "BADMINTON"


# ──────────────────────────────────────────────
# Users
# ──────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    team_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # nullable — Google users have NULL, email/password users have bcrypt hash
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_teams: Mapped[list["UserTeam"]] = relationship("UserTeam", back_populates="user")


# ──────────────────────────────────────────────
# Tournaments
# ──────────────────────────────────────────────

class Tournament(Base):
    __tablename__ = "tournaments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sport: Mapped[SportEnum] = mapped_column(String(20), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contests: Mapped[list["Contest"]] = relationship("Contest", back_populates="tournament")
    tournament_teams: Mapped[list["TournamentTeam"]] = relationship("TournamentTeam", back_populates="tournament", cascade="all, delete-orphan")


# ──────────────────────────────────────────────
# TournamentTeam — teams participating in a tournament
# ──────────────────────────────────────────────

class TournamentTeam(Base):
    __tablename__ = "tournament_teams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tournament_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (UniqueConstraint("tournament_id", "team_id", name="uq_tournament_team"),)

    tournament: Mapped["Tournament"] = relationship("Tournament", back_populates="tournament_teams")
    team: Mapped["Team"] = relationship("Team")


# ──────────────────────────────────────────────
# Teams (real badminton teams)
# ──────────────────────────────────────────────

class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    sport: Mapped[SportEnum | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    players: Mapped[list["Player"]] = relationship("Player", back_populates="team")
    contests_as_a: Mapped[list["Contest"]] = relationship("Contest", foreign_keys="Contest.team_a_id", back_populates="team_a")
    contests_as_b: Mapped[list["Contest"]] = relationship("Contest", foreign_keys="Contest.team_b_id", back_populates="team_b")


# ──────────────────────────────────────────────
# Players
# ──────────────────────────────────────────────

class Player(Base):
    __tablename__ = "players"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False, index=True)
    gender: Mapped[GenderEnum] = mapped_column(String(10), nullable=False)
    bid_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Real team captain: bid_points forced to 0 by backend
    is_real_captain: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team: Mapped["Team"] = relationship("Team", back_populates="players")
    user_team_players: Mapped[list["UserTeamPlayer"]] = relationship("UserTeamPlayer", back_populates="player")
    contest_game_players: Mapped[list["ContestGamePlayer"]] = relationship("ContestGamePlayer", back_populates="player")


# ──────────────────────────────────────────────
# Contests
# ──────────────────────────────────────────────

class Contest(Base):
    __tablename__ = "contests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tournament_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tournaments.id", ondelete="SET NULL"), nullable=True, index=True)
    match_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False)
    team_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False)
    match_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    registration_cutoff: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    prize: Mapped[str] = mapped_column(String(255), nullable=False, server_default='Winner Badge')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tournament: Mapped["Tournament | None"] = relationship("Tournament", back_populates="contests")
    team_a: Mapped["Team"] = relationship("Team", foreign_keys=[team_a_id], back_populates="contests_as_a")
    team_b: Mapped["Team"] = relationship("Team", foreign_keys=[team_b_id], back_populates="contests_as_b")
    user_teams: Mapped[list["UserTeam"]] = relationship("UserTeam", back_populates="contest")
    contest_games: Mapped[list["ContestGame"]] = relationship("ContestGame", back_populates="contest")


# ──────────────────────────────────────────────
# UserTeam — a user's fantasy team for one contest
# ──────────────────────────────────────────────

class UserTeam(Base):
    __tablename__ = "user_teams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    contest_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True)
    # Materialized total — sum of all user_team_players.points_earned
    total_points: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "contest_id", name="uq_user_contest"),)

    user: Mapped["User"] = relationship("User", back_populates="user_teams")
    contest: Mapped["Contest"] = relationship("Contest", back_populates="user_teams")
    players: Mapped[list["UserTeamPlayer"]] = relationship("UserTeamPlayer", back_populates="user_team", cascade="all, delete-orphan")


# ──────────────────────────────────────────────
# UserTeamPlayer — each of the 11 picked players
# ──────────────────────────────────────────────

class UserTeamPlayer(Base):
    __tablename__ = "user_team_players"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_teams.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("players.id", ondelete="RESTRICT"), nullable=False, index=True)
    is_captain: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_vice_captain: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Running total of points earned — materialized sum of score events
    points_earned: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    user_team: Mapped["UserTeam"] = relationship("UserTeam", back_populates="players")
    player: Mapped["Player"] = relationship("Player", back_populates="user_team_players")
    score_events: Mapped[list["PlayerScoreEvent"]] = relationship("PlayerScoreEvent", back_populates="user_team_player", cascade="all, delete-orphan")


# ──────────────────────────────────────────────
# PlayerScoreEvent — audit log of every point earned
# ──────────────────────────────────────────────

class PlayerScoreEvent(Base):
    __tablename__ = "player_score_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_team_player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_team_players.id", ondelete="CASCADE"), nullable=False, index=True)
    contest_game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contest_games.id", ondelete="CASCADE"), nullable=False, index=True)
    # e.g. "WIN", "STRAIGHT_SET_WIN_BONUS", "DOMINANT_SET_BONUS", "UNDERDOG_WIN_LARGE"
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    base_points: Mapped[float] = mapped_column(Float, nullable=False)
    # 1.0, 1.5 (VC), or 2.0 (captain)
    multiplier_applied: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    # base_points * multiplier_applied
    points_awarded: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_team_player: Mapped["UserTeamPlayer"] = relationship("UserTeamPlayer", back_populates="score_events")
    contest_game: Mapped["ContestGame"] = relationship("ContestGame", back_populates="score_events")


# ──────────────────────────────────────────────
# ContestGame — one of the 7 games in a contest
# ──────────────────────────────────────────────

class ContestGame(Base):
    __tablename__ = "contest_games"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contest_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True)
    game_number: Mapped[int | None] = mapped_column(Integer, nullable=True)  # auto-assigned
    game_type: Mapped[GameTypeEnum] = mapped_column(String(10), nullable=False)  # DOUBLES or SINGLES
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "Men's Doubles B (4 Pointer)"
    # Null until admin enters the result
    winning_team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    # JSONB: {"sets": [{"team_a_points": 21, "team_b_points": 11}, ...]}
    game_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    contest: Mapped["Contest"] = relationship("Contest", back_populates="contest_games")
    winning_team: Mapped["Team | None"] = relationship("Team", foreign_keys=[winning_team_id])
    game_players: Mapped[list["ContestGamePlayer"]] = relationship("ContestGamePlayer", back_populates="contest_game", cascade="all, delete-orphan")
    score_events: Mapped[list["PlayerScoreEvent"]] = relationship("PlayerScoreEvent", back_populates="contest_game")


# ──────────────────────────────────────────────
# ContestGamePlayer — players who actually played in a game
# ──────────────────────────────────────────────

class ContestGamePlayer(Base):
    __tablename__ = "contest_game_players"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contest_game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contest_games.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("players.id", ondelete="RESTRICT"), nullable=False, index=True)

    __table_args__ = (UniqueConstraint("contest_game_id", "player_id", name="uq_game_player"),)

    contest_game: Mapped["ContestGame"] = relationship("ContestGame", back_populates="game_players")
    player: Mapped["Player"] = relationship("Player", back_populates="contest_game_players")


# ──────────────────────────────────────────────
# Analytics
# ──────────────────────────────────────────────

class PageView(Base):
    __tablename__ = "page_views"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Persistent browser UUID stored in localStorage — ties anon + logged-in events together
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # Null for anonymous visitors; set once the user is authenticated
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # pathname only (no query string) to avoid storing PII
    page: Mapped[str] = mapped_column(String(512), nullable=False)
    visited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
