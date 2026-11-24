from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    Text,
    Uuid,
    column,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.domain import (
    BlockKey,
    EnquiryAction,
    EnquiryKind,
    EnquiryStatus,
    ImageContentType,
    MediaKind,
    PostStatus,
    RoleTransition,
)


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "pk": "pk_%(table_name)s",
            "uq": "uq_%(table_name)s_%(column_0_N_name)s",
            "ix": "ix_%(table_name)s_%(column_0_N_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s",
        }
    )


class Enquiry(Base):
    __tablename__ = "enquiries"
    __table_args__ = (
        CheckConstraint(column("kind", Text).in_(list(EnquiryKind)), name="kind"),
        CheckConstraint(column("role_transition", Text).in_(list(RoleTransition)), name="role_transition"),
        CheckConstraint(column("cohort_size", Integer).between(1, 500), name="cohort_size"),
        CheckConstraint(column("status", Text).in_(list(EnquiryStatus)), name="status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid7)
    kind: Mapped[str] = mapped_column(Text)
    full_name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, index=True)
    organisation: Mapped[str | None] = mapped_column(Text)
    role_title: Mapped[str | None] = mapped_column(Text)
    role_transition: Mapped[str | None] = mapped_column(Text)
    cohort_size: Mapped[int | None] = mapped_column(Integer)
    message: Mapped[str | None] = mapped_column(Text)
    consent_version: Mapped[str] = mapped_column(Text)
    consent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    idempotency_key: Mapped[uuid.UUID | None] = mapped_column(Uuid, unique=True)
    status: Mapped[str] = mapped_column(Text, server_default=EnquiryStatus.NEW.value)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    events: Mapped[list[EnquiryEvent]] = relationship(
        order_by=lambda: (EnquiryEvent.created_at.desc(), EnquiryEvent.id.desc()),
        lazy="raise",
        passive_deletes=True,
    )


Index("ix_enquiries_created_at_id", Enquiry.created_at.desc(), Enquiry.id.desc())
Index("ix_enquiries_kind_created_at", Enquiry.kind, Enquiry.created_at.desc())
Index("ix_enquiries_status_created_at_id", Enquiry.status, Enquiry.created_at.desc(), Enquiry.id.desc())


class EnquiryEvent(Base):
    __tablename__ = "enquiry_events"
    __table_args__ = (
        CheckConstraint(column("action", Text).in_(list(EnquiryAction)), name="action"),
        CheckConstraint(column("from_status", Text).in_(list(EnquiryStatus)), name="from_status"),
        CheckConstraint(column("to_status", Text).in_(list(EnquiryStatus)), name="to_status"),
        CheckConstraint(
            "action <> 'status_changed' OR (from_status IS NOT NULL AND to_status IS NOT NULL)",
            name="status_change_complete",
        ),
        CheckConstraint(func.char_length(column("note", Text)) <= 1000, name="note_length"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid7)
    enquiry_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey(Enquiry.id, ondelete="CASCADE"))
    actor_sub: Mapped[str] = mapped_column(Text)
    actor_email: Mapped[str | None] = mapped_column(Text)
    action: Mapped[str] = mapped_column(Text)
    from_status: Mapped[str | None] = mapped_column(Text)
    to_status: Mapped[str | None] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


Index("ix_enquiry_events_enquiry_id_created_at", EnquiryEvent.enquiry_id, EnquiryEvent.created_at.desc())


class RateLimitWindow(Base):
    """A fixed counting window per key; keys are namespaced HMACs or fixed names, never raw client data."""

    __tablename__ = "rate_limit_windows"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    count: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class MediaAsset(Base):
    """A photo held in blob storage (or shipped with the site) or a YouTube video, referenced by id from content."""

    __tablename__ = "media_assets"
    __table_args__ = (
        CheckConstraint(column("kind", Text).in_(list(MediaKind)), name="kind"),
        CheckConstraint(column("content_type", Text).in_(list(ImageContentType)), name="content_type"),
        CheckConstraint(column("size_bytes", BigInteger).between(1, 10485760), name="size_bytes"),
        CheckConstraint(column("width", Integer).between(1, 12000), name="width"),
        CheckConstraint(column("height", Integer).between(1, 12000), name="height"),
        CheckConstraint(func.char_length(column("url", Text)) <= 2048, name="url_length"),
        CheckConstraint(func.char_length(column("alt", Text)) <= 300, name="alt_length"),
        CheckConstraint(func.char_length(column("title", Text)) <= 120, name="title_length"),
        CheckConstraint(func.char_length(column("youtube_id", Text)) == 11, name="youtube_id_length"),
        CheckConstraint(
            "(kind = 'image' AND youtube_id IS NULL AND width IS NOT NULL AND height IS NOT NULL AND alt <> '') "
            "OR (kind = 'video' AND youtube_id IS NOT NULL AND content_type IS NULL AND size_bytes IS NULL "
            "AND width IS NULL AND height IS NULL AND alt = '' AND title <> '')",
            name="kind_fields",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid7)
    kind: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text)
    content_type: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    alt: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    youtube_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by_sub: Mapped[str] = mapped_column(Text)
    created_by_email: Mapped[str | None] = mapped_column(Text)


Index("ix_media_assets_created_at_id", MediaAsset.created_at.desc(), MediaAsset.id.desc())
Index("ix_media_assets_kind_created_at_id", MediaAsset.kind, MediaAsset.created_at.desc(), MediaAsset.id.desc())


class ContentBlock(Base):
    """One editable section of the public site: the live data, an optional unpublished edit, and a write counter."""

    __tablename__ = "content_blocks"
    __table_args__ = (
        CheckConstraint(column("key", Text).in_(list(BlockKey)), name="key"),
        CheckConstraint(column("version", Integer) >= 1, name="version"),
        CheckConstraint("jsonb_typeof(draft) = 'object'", name="draft_object"),
        CheckConstraint("jsonb_typeof(published) = 'object'", name="published_object"),
        CheckConstraint("(draft IS NULL) = (draft_updated_at IS NULL)", name="draft_stamp"),
        CheckConstraint("(published IS NULL) = (published_at IS NULL)", name="published_stamp"),
    )

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    draft: Mapped[dict[str, Any] | None] = mapped_column(JSONB(none_as_null=True))
    published: Mapped[dict[str, Any] | None] = mapped_column(JSONB(none_as_null=True))
    version: Mapped[int] = mapped_column(Integer)
    draft_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    draft_updated_by_email: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_by_email: Mapped[str | None] = mapped_column(Text)

    @property
    def has_draft(self) -> bool:
        return self.draft is not None


class ContentRevision(Base):
    """What a block held each time it was published; append-only."""

    __tablename__ = "content_revisions"
    __table_args__ = (
        CheckConstraint(column("key", Text).in_(list(BlockKey)), name="key"),
        CheckConstraint("jsonb_typeof(data) = 'object'", name="data_object"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid7)
    key: Mapped[str] = mapped_column(Text)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_by_sub: Mapped[str] = mapped_column(Text)
    published_by_email: Mapped[str | None] = mapped_column(Text)


Index("ix_content_revisions_key_published_at", ContentRevision.key, ContentRevision.published_at.desc())


class Post(Base):
    """A news or events post. `published_at` survives unpublishing, so it also records that the slug is fixed."""

    __tablename__ = "posts"
    __table_args__ = (
        CheckConstraint(column("status", Text).in_(list(PostStatus)), name="status"),
        CheckConstraint("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80", name="slug"),
        CheckConstraint(func.char_length(column("title", Text)).between(1, 120), name="title_length"),
        CheckConstraint(func.char_length(column("summary", Text)).between(1, 300), name="summary_length"),
        CheckConstraint(func.char_length(column("body", Text)).between(1, 10000), name="body_length"),
        CheckConstraint(column("version", Integer) >= 1, name="version"),
        CheckConstraint("status <> 'published' OR published_at IS NOT NULL", name="published_stamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid7)
    slug: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    event_date: Mapped[date | None] = mapped_column(Date)
    cover_media_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey(MediaAsset.id, ondelete="RESTRICT"), index=True
    )
    video_media_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey(MediaAsset.id, ondelete="RESTRICT"), index=True
    )
    status: Mapped[str] = mapped_column(Text, server_default=PostStatus.DRAFT.value)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_by_email: Mapped[str | None] = mapped_column(Text)

    cover: Mapped[MediaAsset | None] = relationship(foreign_keys=[cover_media_id], lazy="raise")
    video: Mapped[MediaAsset | None] = relationship(foreign_keys=[video_media_id], lazy="raise")


Index("ix_posts_updated_at_id", Post.updated_at.desc(), Post.id.desc())
Index("ix_posts_status_updated_at_id", Post.status, Post.updated_at.desc(), Post.id.desc())
