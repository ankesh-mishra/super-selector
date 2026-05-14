"""initial_schema

Revision ID: 0001
Revises:
Create Date: 2026-04-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('avatar_url', sa.Text, nullable=True),
        sa.Column('is_admin', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('hashed_password', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # ── teams ─────────────────────────────────────────────────────────────────
    op.create_table(
        'teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_teams_name', 'teams', ['name'], unique=True)

    # ── players ───────────────────────────────────────────────────────────────
    op.create_table(
        'players',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('teams.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('gender', sa.String(10), nullable=False),  # MALE / FEMALE
        sa.Column('bid_points', sa.Integer, nullable=False, server_default='0'),
        sa.Column('is_real_captain', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_players_team_id', 'players', ['team_id'])

    # ── contests ──────────────────────────────────────────────────────────────
    op.create_table(
        'contests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('team_a_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('teams.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('team_b_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('teams.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('match_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('registration_cutoff', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_locked', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_completed', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── contest_games ─────────────────────────────────────────────────────────
    op.create_table(
        'contest_games',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contest_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('contests.id', ondelete='CASCADE'), nullable=False),
        sa.Column('game_number', sa.Integer, nullable=False),
        sa.Column('game_type', sa.String(10), nullable=False),  # DOUBLES / SINGLES
        sa.Column('winning_team_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('teams.id', ondelete='SET NULL'), nullable=True),
        sa.Column('game_details', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('contest_id', 'game_number', name='uq_contest_game_number'),
    )
    op.create_index('ix_contest_games_contest_id', 'contest_games', ['contest_id'])

    # ── contest_game_players ──────────────────────────────────────────────────
    op.create_table(
        'contest_game_players',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contest_game_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('contest_games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('player_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('players.id', ondelete='RESTRICT'), nullable=False),
        sa.UniqueConstraint('contest_game_id', 'player_id', name='uq_game_player'),
    )
    op.create_index('ix_contest_game_players_game_id', 'contest_game_players', ['contest_game_id'])
    op.create_index('ix_contest_game_players_player_id', 'contest_game_players', ['player_id'])

    # ── user_teams ────────────────────────────────────────────────────────────
    op.create_table(
        'user_teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('contest_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('contests.id', ondelete='CASCADE'), nullable=False),
        sa.Column('total_points', sa.Float, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'contest_id', name='uq_user_contest'),
    )
    op.create_index('ix_user_teams_user_id', 'user_teams', ['user_id'])
    op.create_index('ix_user_teams_contest_id', 'user_teams', ['contest_id'])

    # ── user_team_players ─────────────────────────────────────────────────────
    op.create_table(
        'user_team_players',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_team_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('user_teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('player_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('players.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('is_captain', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_vice_captain', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('points_earned', sa.Float, nullable=False, server_default='0'),
    )
    op.create_index('ix_user_team_players_user_team_id', 'user_team_players', ['user_team_id'])
    op.create_index('ix_user_team_players_player_id', 'user_team_players', ['player_id'])

    # ── player_score_events ───────────────────────────────────────────────────
    op.create_table(
        'player_score_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_team_player_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('user_team_players.id', ondelete='CASCADE'), nullable=False),
        sa.Column('contest_game_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('contest_games.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('base_points', sa.Float, nullable=False),
        sa.Column('multiplier_applied', sa.Float, nullable=False, server_default='1.0'),
        sa.Column('points_awarded', sa.Float, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_player_score_events_utp_id', 'player_score_events', ['user_team_player_id'])
    op.create_index('ix_player_score_events_game_id', 'player_score_events', ['contest_game_id'])


def downgrade() -> None:
    op.drop_table('player_score_events')
    op.drop_table('user_team_players')
    op.drop_table('user_teams')
    op.drop_table('contest_game_players')
    op.drop_table('contest_games')
    op.drop_table('contests')
    op.drop_table('players')
    op.drop_table('teams')
    op.drop_table('users')
