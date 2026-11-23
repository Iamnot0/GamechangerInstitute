"""Count rate-limit and notification windows in PostgreSQL.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rate_limit_windows",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_rate_limit_windows")),
    )
    op.create_index(op.f("ix_rate_limit_windows_expires_at"), "rate_limit_windows", ["expires_at"])


def downgrade() -> None:
    op.drop_table("rate_limit_windows")
