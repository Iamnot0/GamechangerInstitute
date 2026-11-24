"""Give every post a kind (article, video or document) and let a video be an uploaded file.

Posts written before kinds existed become videos when they are only a YouTube link (with at most a
thumbnail), documents when they are only a PDF, and articles otherwise, so that each already meets the
rules of its kind. Sorting them is not an edit, so their `updated_at` is left as it was. The downgrade
drops uploaded video addresses.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("kind", sa.Text(), server_default="article", nullable=False))
    op.execute("ALTER TABLE posts DISABLE TRIGGER posts_set_updated_at")
    op.execute(
        "UPDATE posts SET kind = 'video' WHERE youtube_id IS NOT NULL AND body = '' AND document_url IS NULL "
        "AND event_date IS NULL AND (SELECT count(*) FROM post_photos WHERE post_photos.post_id = posts.id) <= 1"
    )
    op.execute(
        "UPDATE posts SET kind = 'document' WHERE document_url IS NOT NULL AND body = '' AND youtube_id IS NULL "
        "AND event_date IS NULL AND NOT EXISTS (SELECT 1 FROM post_photos WHERE post_photos.post_id = posts.id)"
    )
    op.execute("ALTER TABLE posts ENABLE TRIGGER posts_set_updated_at")
    op.alter_column("posts", "kind", server_default=None)
    op.create_check_constraint(op.f("ck_posts_kind"), "posts", "kind IN ('article', 'video', 'document')")
    op.add_column("posts", sa.Column("video_url", sa.Text(), nullable=True))
    op.create_unique_constraint(op.f("uq_posts_video_url"), "posts", ["video_url"])
    op.create_check_constraint(op.f("ck_posts_video_url_length"), "posts", "char_length(video_url) <= 2048")
    op.create_check_constraint(op.f("ck_posts_one_video_source"), "posts", "num_nonnulls(youtube_id, video_url) <= 1")


def downgrade() -> None:
    op.drop_constraint(op.f("ck_posts_one_video_source"), "posts", type_="check")
    op.drop_constraint(op.f("ck_posts_video_url_length"), "posts", type_="check")
    op.drop_constraint(op.f("uq_posts_video_url"), "posts", type_="unique")
    op.drop_column("posts", "video_url")
    op.drop_constraint(op.f("ck_posts_kind"), "posts", type_="check")
    op.drop_column("posts", "kind")
