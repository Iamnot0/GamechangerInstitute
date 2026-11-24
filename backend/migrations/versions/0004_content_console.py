"""Store the media library, editable content blocks and news posts.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_BLOCK_KEYS = "('success_stories', 'client_logos', 'founder', 'stewards', 'platforms', 'patron')"


def upgrade() -> None:
    op.create_table(
        "media_assets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("content_type", sa.Text(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("alt", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("youtube_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by_sub", sa.Text(), nullable=False),
        sa.Column("created_by_email", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_media_assets")),
        sa.CheckConstraint("kind IN ('image', 'video')", name=op.f("ck_media_assets_kind")),
        sa.CheckConstraint(
            "content_type IN ('image/jpeg', 'image/png', 'image/webp')", name=op.f("ck_media_assets_content_type")
        ),
        sa.CheckConstraint("size_bytes BETWEEN 1 AND 10485760", name=op.f("ck_media_assets_size_bytes")),
        sa.CheckConstraint("width BETWEEN 1 AND 12000", name=op.f("ck_media_assets_width")),
        sa.CheckConstraint("height BETWEEN 1 AND 12000", name=op.f("ck_media_assets_height")),
        sa.CheckConstraint("char_length(url) <= 2048", name=op.f("ck_media_assets_url_length")),
        sa.CheckConstraint("char_length(alt) <= 300", name=op.f("ck_media_assets_alt_length")),
        sa.CheckConstraint("char_length(title) <= 120", name=op.f("ck_media_assets_title_length")),
        sa.CheckConstraint("char_length(youtube_id) = 11", name=op.f("ck_media_assets_youtube_id_length")),
        sa.CheckConstraint(
            "(kind = 'image' AND youtube_id IS NULL AND width IS NOT NULL AND height IS NOT NULL AND alt <> '') "
            "OR (kind = 'video' AND youtube_id IS NOT NULL AND content_type IS NULL AND size_bytes IS NULL "
            "AND width IS NULL AND height IS NULL AND alt = '' AND title <> '')",
            name=op.f("ck_media_assets_kind_fields"),
        ),
    )
    op.create_index(
        op.f("ix_media_assets_created_at_id"), "media_assets", [sa.text("created_at DESC"), sa.text("id DESC")]
    )
    op.create_index(
        op.f("ix_media_assets_kind_created_at_id"),
        "media_assets",
        ["kind", sa.text("created_at DESC"), sa.text("id DESC")],
    )

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

    op.create_table(
        "posts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=True),
        sa.Column("cover_media_id", sa.Uuid(), nullable=True),
        sa.Column("video_media_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.Text(), server_default="draft", nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_by_email", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_posts")),
        sa.UniqueConstraint("slug", name=op.f("uq_posts_slug")),
        sa.ForeignKeyConstraint(
            ["cover_media_id"],
            ["media_assets.id"],
            name=op.f("fk_posts_cover_media_id_media_assets"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["video_media_id"],
            ["media_assets.id"],
            name=op.f("fk_posts_video_media_id_media_assets"),
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint("status IN ('draft', 'published')", name=op.f("ck_posts_status")),
        sa.CheckConstraint("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80", name=op.f("ck_posts_slug")),
        sa.CheckConstraint("char_length(title) BETWEEN 1 AND 120", name=op.f("ck_posts_title_length")),
        sa.CheckConstraint("char_length(summary) BETWEEN 1 AND 300", name=op.f("ck_posts_summary_length")),
        sa.CheckConstraint("char_length(body) BETWEEN 1 AND 10000", name=op.f("ck_posts_body_length")),
        sa.CheckConstraint("version >= 1", name=op.f("ck_posts_version")),
        sa.CheckConstraint("status <> 'published' OR published_at IS NOT NULL", name=op.f("ck_posts_published_stamp")),
    )
    op.create_index(op.f("ix_posts_cover_media_id"), "posts", ["cover_media_id"])
    op.create_index(op.f("ix_posts_video_media_id"), "posts", ["video_media_id"])
    op.create_index(op.f("ix_posts_updated_at_id"), "posts", [sa.text("updated_at DESC"), sa.text("id DESC")])
    op.create_index(
        op.f("ix_posts_status_updated_at_id"), "posts", ["status", sa.text("updated_at DESC"), sa.text("id DESC")]
    )
    op.execute(
        "CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
    )


def downgrade() -> None:
    op.drop_table("posts")
    op.drop_table("content_revisions")
    op.drop_table("content_blocks")
    op.drop_table("media_assets")
