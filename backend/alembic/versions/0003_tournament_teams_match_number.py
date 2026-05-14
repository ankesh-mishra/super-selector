"""tournament_teams_and_match_number

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── tournament_teams ──────────────────────────────────────────────────────
    op.create_table(
        'tournament_teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tournament_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tournaments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.UniqueConstraint('tournament_id', 'team_id', name='uq_tournament_team'),
    )
    op.create_index('ix_tournament_teams_tournament_id', 'tournament_teams', ['tournament_id'])
    op.create_index('ix_tournament_teams_team_id', 'tournament_teams', ['team_id'])

    # ── contests: add match_number ────────────────────────────────────────────
    op.add_column('contests', sa.Column('match_number', sa.Integer, nullable=True))


def downgrade() -> None:
    op.drop_column('contests', 'match_number')
    op.drop_index('ix_tournament_teams_team_id', table_name='tournament_teams')
    op.drop_index('ix_tournament_teams_tournament_id', table_name='tournament_teams')
    op.drop_table('tournament_teams')
