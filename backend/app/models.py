from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, MetaData, Text, Uuid, column, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.domain import EnquiryAction, EnquiryKind, EnquiryStatus, RoleTransition


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
