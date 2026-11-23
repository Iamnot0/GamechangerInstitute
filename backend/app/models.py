import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, MetaData, Text, Uuid, column, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.domain import EnquiryKind, EnquiryStatus, RoleTransition


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


Index("ix_enquiries_created_at", Enquiry.created_at.desc())
Index("ix_enquiries_kind_created_at", Enquiry.kind, Enquiry.created_at.desc())
