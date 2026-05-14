"""add_tournaments_and_profile

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── tournaments ───────────────────────────────────────────────────────────
    op.create_table(
        'tournaments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('sport', sa.String(20), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── contests: add tournament_id FK ────────────────────────────────────────
    op.add_column(
        'contests',
        sa.Column(
            'tournament_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('tournaments.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.create_index('ix_contests_tournament_id', 'contests', ['tournament_id'])

    # ── users: add team_name ──────────────────────────────────────────────────
    op.add_column('users', sa.Column('team_name', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'team_name')
    op.drop_index('ix_contests_tournament_id', table_name='contests')
    op.drop_column('contests', 'tournament_id')
    op.drop_table('tournaments')
