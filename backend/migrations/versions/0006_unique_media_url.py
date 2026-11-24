"""One media record per stored file.

Revision ID: 0006
Revises: 0005
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(op.f("uq_media_assets_url"), "media_assets", ["url"])


def downgrade() -> None:
    op.drop_constraint(op.f("uq_media_assets_url"), "media_assets", type_="unique")
