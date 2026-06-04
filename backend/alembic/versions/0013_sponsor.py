"""add contest sponsor and join requests

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade():
    # ── sponsor fields on contests ────────────────────────────────────────────
    op.add_column('contests',
        sa.Column('sponsor_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('contests',
        sa.Column('sponsor_contact', sa.Text(), nullable=True))
    op.add_column('contests',
        sa.Column('prize_type', sa.String(20), nullable=True))
    op.create_index('ix_contests_sponsor_id', 'contests', ['sponsor_id'])

    # ── contest_join_requests ─────────────────────────────────────────────────
    op.create_table(
        'contest_join_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('contest_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('contests.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('contest_id', 'user_id', name='uq_contest_join_request'),
    )


def downgrade():
    op.drop_table('contest_join_requests')
    op.drop_index('ix_contests_sponsor_id', table_name='contests')
    op.drop_column('contests', 'prize_type')
    op.drop_column('contests', 'sponsor_contact')
    op.drop_column('contests', 'sponsor_id')
