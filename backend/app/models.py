from __future__ import annotations

import uuid
from datetime import date, datetime

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
    UniqueConstraint,
    Uuid,
    column,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.domain import (
    EnquiryAction,
    EnquiryKind,
    EnquiryStatus,
    ImageContentType,
    PostDocument,
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
    """A photo uploaded to blob storage for a news post. One row per stored file."""

    __tablename__ = "media_assets"
    __table_args__ = (
        CheckConstraint(column("content_type", Text).in_(list(ImageContentType)), name="content_type"),
        CheckConstraint(column("size_bytes", BigInteger).between(1, 10485760), name="size_bytes"),
        CheckConstraint(column("width", Integer).between(1, 12000), name="width"),
        CheckConstraint(column("height", Integer).between(1, 12000), name="height"),
        CheckConstraint(func.char_length(column("url", Text)) <= 2048, name="url_length"),
        UniqueConstraint("url"),
        CheckConstraint(func.char_length(column("alt", Text)).between(1, 300), name="alt_length"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid7)
    url: Mapped[str] = mapped_column(Text)
    content_type: Mapped[str] = mapped_column(Text)
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    alt: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by_sub: Mapped[str] = mapped_column(Text)
    created_by_email: Mapped[str | None] = mapped_column(Text)


Index("ix_media_assets_created_at_id", MediaAsset.created_at.desc(), MediaAsset.id.desc())


class Post(Base):
    """A news or events post. `published_at` survives unpublishing, so it also records that the slug is fixed."""

    __tablename__ = "posts"
    __table_args__ = (
        CheckConstraint(column("status", Text).in_(list(PostStatus)), name="status"),
        CheckConstraint("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80", name="slug"),
        CheckConstraint(func.char_length(column("title", Text)).between(1, 120), name="title_length"),
        CheckConstraint(func.char_length(column("body", Text)) <= 10000, name="body_length"),
        CheckConstraint(func.char_length(column("youtube_id", Text)) == 11, name="youtube_id_length"),
        CheckConstraint(func.char_length(column("document_url", Text)) <= 2048, name="document_url_length"),
        CheckConstraint(func.char_length(column("document_name", Text)).between(1, 120), name="document_name_length"),
        CheckConstraint(column("document_size_bytes", BigInteger).between(1, 20971520), name="document_size_bytes"),
        CheckConstraint(
            "num_nonnulls(document_url, document_name, document_size_bytes) IN (0, 3)", name="document_complete"
        ),
        CheckConstraint(column("version", Integer) >= 1, name="version"),
        CheckConstraint("status <> 'published' OR published_at IS NOT NULL", name="published_stamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid7)
    slug: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    event_date: Mapped[date | None] = mapped_column(Date)
    youtube_id: Mapped[str | None] = mapped_column(Text)
    document_url: Mapped[str | None] = mapped_column(Text, unique=True)
    document_name: Mapped[str | None] = mapped_column(Text)
    document_size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(Text, server_default=PostStatus.DRAFT.value)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_by_email: Mapped[str | None] = mapped_column(Text)

    photos: Mapped[list[MediaAsset]] = relationship(
        secondary=lambda: PostPhoto.__table__,
        order_by=lambda: PostPhoto.position,
        lazy="raise",
        viewonly=True,
    )

    @property
    def document(self) -> PostDocument | None:
        if self.document_url is None or self.document_name is None or self.document_size_bytes is None:
            return None
        return PostDocument(url=self.document_url, name=self.document_name, size_bytes=self.document_size_bytes)


Index("ix_posts_updated_at_id", Post.updated_at.desc(), Post.id.desc())
Index("ix_posts_status_updated_at_id", Post.status, Post.updated_at.desc(), Post.id.desc())


class PostPhoto(Base):
    """A photo's place in its post's gallery. A photo belongs to one post, and a post shows at most twelve."""

    __tablename__ = "post_photos"
    __table_args__ = (CheckConstraint(column("position", Integer).between(0, 11), name="position"),)

    post_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey(Post.id, ondelete="CASCADE"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, primary_key=True)
    media_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey(MediaAsset.id, ondelete="RESTRICT"), unique=True)
