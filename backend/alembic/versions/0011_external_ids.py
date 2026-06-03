"""add external_id to tournaments, teams, players, contests, contest_games

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ('tournaments', 'teams', 'players', 'contests', 'contest_games'):
        op.add_column(table, sa.Column('external_id', sa.String(255), nullable=True))
        op.create_unique_constraint(f'uq_{table}_external_id', table, ['external_id'])
        op.create_index(f'ix_{table}_external_id', table, ['external_id'])


def downgrade() -> None:
    for table in ('tournaments', 'teams', 'players', 'contests', 'contest_games'):
        op.drop_index(f'ix_{table}_external_id', table_name=table)
        op.drop_constraint(f'uq_{table}_external_id', table, type_='unique')
        op.drop_column(table, 'external_id')
