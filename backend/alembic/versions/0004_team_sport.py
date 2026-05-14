"""team_sport

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('teams', sa.Column('sport', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('teams', 'sport')
