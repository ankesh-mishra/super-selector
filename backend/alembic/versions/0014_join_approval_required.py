"""add join_approval_required to contests

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-04

"""
from alembic import op
import sqlalchemy as sa


revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('contests', sa.Column('join_approval_required', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('contests', 'join_approval_required')
