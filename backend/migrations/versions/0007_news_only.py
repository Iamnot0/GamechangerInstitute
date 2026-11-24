"""Keep only news posts, with their photos, video link and PDF.

The downgrade recreates what was dropped, empty: posts keep their rows but lose their photos, video
link and PDF, and the deleted media rows and content blocks do not come back. Posts written since
may have no body or summary, so the old length checks return unvalidated.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_BLOCK_KEYS = "('success_stories', 'client_logos', 'founder', 'stewards', 'platforms', 'patron')"
_PHOTO_FACTS = ("content_type", "size_bytes", "width", "height")


def upgrade() -> None:
    op.drop_table("content_revisions")
    op.drop_table("content_blocks")

    op.drop_column("posts", "cover_media_id")
    op.drop_column("posts", "video_media_id")
    op.drop_column("posts", "summary")
    op.drop_constraint(op.f("ck_posts_body_length"), "posts", type_="check")
    op.create_check_constraint(op.f("ck_posts_body_length"), "posts", "char_length(body) <= 10000")
    op.add_column("posts", sa.Column("youtube_id", sa.Text(), nullable=True))
    op.create_check_constraint(op.f("ck_posts_youtube_id_length"), "posts", "char_length(youtube_id) = 11")
    op.add_column("posts", sa.Column("document_url", sa.Text(), nullable=True))
    op.add_column("posts", sa.Column("document_name", sa.Text(), nullable=True))
    op.add_column("posts", sa.Column("document_size_bytes", sa.BigInteger(), nullable=True))
    op.create_unique_constraint(op.f("uq_posts_document_url"), "posts", ["document_url"])
    op.create_check_constraint(op.f("ck_posts_document_url_length"), "posts", "char_length(document_url) <= 2048")
    op.create_check_constraint(
        op.f("ck_posts_document_name_length"), "posts", "char_length(document_name) BETWEEN 1 AND 120"
    )
    op.create_check_constraint(
        op.f("ck_posts_document_size_bytes"), "posts", "document_size_bytes BETWEEN 1 AND 20971520"
    )
    op.create_check_constraint(
        op.f("ck_posts_document_complete"),
        "posts",
        "num_nonnulls(document_url, document_name, document_size_bytes) IN (0, 3)",
    )

    op.create_table(
        "post_photos",
        sa.Column("post_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("media_id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("post_id", "position", name=op.f("pk_post_photos")),
        sa.UniqueConstraint("media_id", name=op.f("uq_post_photos_media_id")),
        sa.ForeignKeyConstraint(
            ["post_id"], ["posts.id"], name=op.f("fk_post_photos_post_id_posts"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["media_id"],
            ["media_assets.id"],
            name=op.f("fk_post_photos_media_id_media_assets"),
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint("position BETWEEN 0 AND 11", name=op.f("ck_post_photos_position")),
    )

    op.execute(
        "DELETE FROM media_assets "
        "WHERE NOT EXISTS (SELECT 1 FROM post_photos WHERE post_photos.media_id = media_assets.id)"
    )
    op.drop_column("media_assets", "kind")
    op.drop_column("media_assets", "youtube_id")
    op.drop_column("media_assets", "title")
    for column in _PHOTO_FACTS:
        op.alter_column("media_assets", column, nullable=False)
    op.drop_constraint(op.f("ck_media_assets_alt_length"), "media_assets", type_="check")
    op.create_check_constraint(op.f("ck_media_assets_alt_length"), "media_assets", "char_length(alt) BETWEEN 1 AND 300")


def downgrade() -> None:
    op.drop_table("post_photos")

    op.drop_constraint(op.f("ck_media_assets_alt_length"), "media_assets", type_="check")
    op.create_check_constraint(op.f("ck_media_assets_alt_length"), "media_assets", "char_length(alt) <= 300")
    for column in _PHOTO_FACTS:
        op.alter_column("media_assets", column, nullable=True)
    op.add_column("media_assets", sa.Column("kind", sa.Text(), server_default="image", nullable=False))
    op.alter_column("media_assets", "kind", server_default=None)
    op.add_column("media_assets", sa.Column("title", sa.Text(), server_default="", nullable=False))
    op.alter_column("media_assets", "title", server_default=None)
    op.add_column("media_assets", sa.Column("youtube_id", sa.Text(), nullable=True))
    op.create_check_constraint(op.f("ck_media_assets_kind"), "media_assets", "kind IN ('image', 'video')")
    op.create_check_constraint(op.f("ck_media_assets_title_length"), "media_assets", "char_length(title) <= 120")
    op.create_check_constraint(
        op.f("ck_media_assets_youtube_id_length"), "media_assets", "char_length(youtube_id) = 11"
    )
    op.create_check_constraint(
        op.f("ck_media_assets_kind_fields"),
        "media_assets",
        "(kind = 'image' AND youtube_id IS NULL AND width IS NOT NULL AND height IS NOT NULL AND alt <> '') "
        "OR (kind = 'video' AND youtube_id IS NOT NULL AND content_type IS NULL AND size_bytes IS NULL "
        "AND width IS NULL AND height IS NULL AND alt = '' AND title <> '')",
    )
    op.create_index(
        op.f("ix_media_assets_kind_created_at_id"),
        "media_assets",
        ["kind", sa.text("created_at DESC"), sa.text("id DESC")],
    )

    op.drop_column("posts", "document_size_bytes")
    op.drop_column("posts", "document_name")
    op.drop_column("posts", "document_url")
    op.drop_column("posts", "youtube_id")
    op.drop_constraint(op.f("ck_posts_body_length"), "posts", type_="check")
    op.create_check_constraint(
        op.f("ck_posts_body_length"), "posts", "char_length(body) BETWEEN 1 AND 10000", postgresql_not_valid=True
    )
    op.add_column("posts", sa.Column("summary", sa.Text(), server_default="", nullable=False))
    op.alter_column("posts", "summary", server_default=None)
    op.create_check_constraint(
        op.f("ck_posts_summary_length"),
        "posts",
        "char_length(summary) BETWEEN 1 AND 300",
        postgresql_not_valid=True,
    )
    op.add_column("posts", sa.Column("cover_media_id", sa.Uuid(), nullable=True))
    op.add_column("posts", sa.Column("video_media_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        op.f("fk_posts_cover_media_id_media_assets"),
        "posts",
        "media_assets",
        ["cover_media_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        op.f("fk_posts_video_media_id_media_assets"),
        "posts",
        "media_assets",
        ["video_media_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(op.f("ix_posts_cover_media_id"), "posts", ["cover_media_id"])
    op.create_index(op.f("ix_posts_video_media_id"), "posts", ["video_media_id"])

    op.create_table(
        "content_blocks",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("draft", postgresql.JSONB(), nullable=True),
        sa.Column("published", postgresql.JSONB(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("draft_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("draft_updated_by_email", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_by_email", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_content_blocks")),
        sa.CheckConstraint(f"key IN {_BLOCK_KEYS}", name=op.f("ck_content_blocks_key")),
        sa.CheckConstraint("version >= 1", name=op.f("ck_content_blocks_version")),
        sa.CheckConstraint("jsonb_typeof(draft) = 'object'", name=op.f("ck_content_blocks_draft_object")),
        sa.CheckConstraint("jsonb_typeof(published) = 'object'", name=op.f("ck_content_blocks_published_object")),
        sa.CheckConstraint("(draft IS NULL) = (draft_updated_at IS NULL)", name=op.f("ck_content_blocks_draft_stamp")),
        sa.CheckConstraint(
            "(published IS NULL) = (published_at IS NULL)", name=op.f("ck_content_blocks_published_stamp")
        ),
    )
    op.create_table(
        "content_revisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("published_by_sub", sa.Text(), nullable=False),
        sa.Column("published_by_email", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_content_revisions")),
        sa.CheckConstraint(f"key IN {_BLOCK_KEYS}", name=op.f("ck_content_revisions_key")),
        sa.CheckConstraint("jsonb_typeof(data) = 'object'", name=op.f("ck_content_revisions_data_object")),
    )
    op.create_index(
        op.f("ix_content_revisions_key_published_at"), "content_revisions", ["key", sa.text("published_at DESC")]
    )
