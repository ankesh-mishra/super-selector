"""game_number_auto_updated_at

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    # Add updated_at column
    op.add_column('contest_games',
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False))

    # Make game_number nullable (will be auto-assigned)
    op.alter_column('contest_games', 'game_number', nullable=True)

    # Drop the unique constraint on (contest_id, game_number) since numbers are auto
    op.drop_constraint('uq_contest_game_number', 'contest_games', type_='unique')


def downgrade():
    op.create_unique_constraint('uq_contest_game_number', 'contest_games', ['contest_id', 'game_number'])
    op.alter_column('contest_games', 'game_number', nullable=False)
    op.drop_column('contest_games', 'updated_at')
