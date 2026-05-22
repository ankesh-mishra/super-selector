"""page_views analytics table

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'page_views',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', sa.String(64), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('page', sa.String(512), nullable=False),
        sa.Column('visited_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_page_views_session_id', 'page_views', ['session_id'])
    op.create_index('ix_page_views_user_id', 'page_views', ['user_id'])
    op.create_index('ix_page_views_visited_at', 'page_views', ['visited_at'])


def downgrade() -> None:
    op.drop_index('ix_page_views_visited_at', table_name='page_views')
    op.drop_index('ix_page_views_user_id', table_name='page_views')
    op.drop_index('ix_page_views_session_id', table_name='page_views')
    op.drop_table('page_views')
