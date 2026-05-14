"""contest_game_name

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('contest_games', sa.Column('name', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('contest_games', 'name')
