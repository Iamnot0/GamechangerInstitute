"""Track enquiry updates and staff events.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "enquiries",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("UPDATE enquiries SET updated_at = COALESCE(notified_at, created_at)")
    op.execute(
        """
        CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at := now();
            RETURN NEW;
        END
        $$
        """
    )
    op.execute(
        "CREATE TRIGGER enquiries_set_updated_at BEFORE UPDATE ON enquiries "
        "FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
    )

    op.drop_index(op.f("ix_enquiries_created_at"), table_name="enquiries")
    op.create_index(op.f("ix_enquiries_created_at_id"), "enquiries", [sa.text("created_at DESC"), sa.text("id DESC")])
    op.create_index(
        op.f("ix_enquiries_status_created_at_id"),
        "enquiries",
        ["status", sa.text("created_at DESC"), sa.text("id DESC")],
    )

    op.create_table(
        "enquiry_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("enquiry_id", sa.Uuid(), nullable=False),
        sa.Column("actor_sub", sa.Text(), nullable=False),
        sa.Column("actor_email", sa.Text(), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("from_status", sa.Text(), nullable=True),
        sa.Column("to_status", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_enquiry_events")),
        sa.ForeignKeyConstraint(
            ["enquiry_id"],
            ["enquiries.id"],
            name=op.f("fk_enquiry_events_enquiry_id_enquiries"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint("action IN ('status_changed')", name=op.f("ck_enquiry_events_action")),
        sa.CheckConstraint("from_status IN ('new', 'contacted', 'closed')", name=op.f("ck_enquiry_events_from_status")),
        sa.CheckConstraint("to_status IN ('new', 'contacted', 'closed')", name=op.f("ck_enquiry_events_to_status")),
        sa.CheckConstraint(
            "action <> 'status_changed' OR (from_status IS NOT NULL AND to_status IS NOT NULL)",
            name=op.f("ck_enquiry_events_status_change_complete"),
        ),
        sa.CheckConstraint("char_length(note) <= 1000", name=op.f("ck_enquiry_events_note_length")),
    )
    op.create_index(
        op.f("ix_enquiry_events_enquiry_id_created_at"),
        "enquiry_events",
        ["enquiry_id", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_table("enquiry_events")

    op.drop_index(op.f("ix_enquiries_status_created_at_id"), table_name="enquiries")
    op.drop_index(op.f("ix_enquiries_created_at_id"), table_name="enquiries")
    op.create_index(op.f("ix_enquiries_created_at"), "enquiries", [sa.text("created_at DESC")])

    op.execute("DROP TRIGGER enquiries_set_updated_at ON enquiries")
    op.execute("DROP FUNCTION set_updated_at()")
    op.drop_column("enquiries", "updated_at")
