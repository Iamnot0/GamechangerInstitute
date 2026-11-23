"""Create enquiries table.

Revision ID: 0001
Revises:
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "enquiries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("organisation", sa.Text(), nullable=True),
        sa.Column("role_title", sa.Text(), nullable=True),
        sa.Column("role_transition", sa.Text(), nullable=True),
        sa.Column("cohort_size", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("consent_version", sa.Text(), nullable=False),
        sa.Column("consent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idempotency_key", sa.Uuid(), nullable=True),
        sa.Column("status", sa.Text(), server_default="new", nullable=False),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_enquiries")),
        sa.UniqueConstraint("idempotency_key", name=op.f("uq_enquiries_idempotency_key")),
        sa.CheckConstraint("kind IN ('individual', 'organisation', 'general')", name=op.f("ck_enquiries_kind")),
        sa.CheckConstraint(
            "role_transition IN ('first_time_manager', 'founder', 'new_executive', 'successor', 'returner', 'other')",
            name=op.f("ck_enquiries_role_transition"),
        ),
        sa.CheckConstraint("cohort_size BETWEEN 1 AND 500", name=op.f("ck_enquiries_cohort_size")),
        sa.CheckConstraint("status IN ('new', 'contacted', 'closed')", name=op.f("ck_enquiries_status")),
    )
    op.create_index(op.f("ix_enquiries_created_at"), "enquiries", [sa.text("created_at DESC")])
    op.create_index(op.f("ix_enquiries_kind_created_at"), "enquiries", ["kind", sa.text("created_at DESC")])
    op.create_index(op.f("ix_enquiries_email"), "enquiries", ["email"])


def downgrade() -> None:
    op.drop_table("enquiries")
