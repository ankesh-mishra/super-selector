"""add game_code to contest_games

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('contest_games', sa.Column('game_code', sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column('contest_games', 'game_code')
