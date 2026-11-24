"""Create self-hosted staff authentication tables and seed initial admins.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-24
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_INITIAL_ADMINS: tuple[str, ...] = (
    "admin@gamechanger.institute",
    "sevenklaw@gmail.com",
)


def upgrade() -> None:
    op.create_table(
        "staff_users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), server_default="staff", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_signed_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_staff_users")),
        sa.UniqueConstraint("email", name=op.f("uq_staff_users_email")),
        sa.CheckConstraint("role IN ('admin', 'staff')", name=op.f("ck_staff_users_role")),
        sa.CheckConstraint("char_length(email) BETWEEN 3 AND 254", name=op.f("ck_staff_users_email_length")),
        sa.CheckConstraint("email = lower(email)", name=op.f("ck_staff_users_email_lowercase")),
    )

    op.create_table(
        "staff_login_codes",
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("code_hash", sa.Text(), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("email", name=op.f("pk_staff_login_codes")),
        sa.CheckConstraint("char_length(email) BETWEEN 3 AND 254", name=op.f("ck_staff_login_codes_email_length")),
        sa.CheckConstraint("char_length(code_hash) = 64", name=op.f("ck_staff_login_codes_code_hash_length")),
        sa.CheckConstraint("attempts >= 0", name=op.f("ck_staff_login_codes_attempts_nonnegative")),
    )
    op.create_index(op.f("ix_staff_login_codes_expires_at"), "staff_login_codes", ["expires_at"])

    op.create_table(
        "staff_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_staff_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_staff_sessions_token_hash")),
        sa.ForeignKeyConstraint(
            ["user_id"], ["staff_users.id"], name=op.f("fk_staff_sessions_user_id_staff_users"), ondelete="CASCADE"
        ),
        sa.CheckConstraint("char_length(token_hash) = 64", name=op.f("ck_staff_sessions_token_hash_length")),
    )
    op.create_index(op.f("ix_staff_sessions_user_id"), "staff_sessions", ["user_id"])
    op.create_index(op.f("ix_staff_sessions_expires_at"), "staff_sessions", ["expires_at"])

    connection = op.get_bind()
    for email in _INITIAL_ADMINS:
        connection.execute(
            sa.text(
                "INSERT INTO staff_users (id, email, role) VALUES (:id, :email, 'admin') ON CONFLICT (email) DO NOTHING"
            ),
            {"id": uuid.uuid7(), "email": email},
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_staff_sessions_expires_at"), table_name="staff_sessions")
    op.drop_index(op.f("ix_staff_sessions_user_id"), table_name="staff_sessions")
    op.drop_table("staff_sessions")
    op.drop_index(op.f("ix_staff_login_codes_expires_at"), table_name="staff_login_codes")
    op.drop_table("staff_login_codes")
    op.drop_table("staff_users")
