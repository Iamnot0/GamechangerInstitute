import asyncio
import logging
from datetime import datetime
from email.message import EmailMessage
from email.utils import format_datetime, make_msgid
from typing import Final

import aiosmtplib
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import SmtpConfig
from app.domain import EnquiryKind, RoleTransition
from app.models import Enquiry
from app.repositories.enquiries import EnquiryRepository
from app.services.notification_budget import NotificationBudget

logger = logging.getLogger(__name__)

_NOT_PROVIDED: Final = "Not provided"
_KIND_LABELS: Final = {
    EnquiryKind.INDIVIDUAL: "Individual",
    EnquiryKind.ORGANISATION: "Organisation",
    EnquiryKind.GENERAL: "General",
}
_ROLE_TRANSITION_LABELS: Final = {
    RoleTransition.FIRST_TIME_MANAGER: "First-time manager",
    RoleTransition.FOUNDER: "Founder",
    RoleTransition.NEW_EXECUTIVE: "New executive",
    RoleTransition.SUCCESSOR: "Successor",
    RoleTransition.RETURNER: "Returner",
    RoleTransition.OTHER: "Other",
}


class EnquiryNotifier:
    """Emails each new enquiry to the Institute's inbox, within the hourly budget, and records the delivery.

    Enquiries left unsent, whether over budget or after a failure, keep notified_at empty for the team to review.
    """

    def __init__(
        self,
        smtp: SmtpConfig | None,
        budget: NotificationBudget,
        session_factory: async_sessionmaker[AsyncSession],
    ) -> None:
        self._smtp = smtp
        self._budget = budget
        self._session_factory = session_factory

    async def notify(self, enquiry: Enquiry) -> None:
        log_context = {"enquiry_id": str(enquiry.id)}
        if self._smtp is None:
            logger.info("notification skipped: smtp not configured", extra=log_context)
            return
        if not await self._budget.spend():
            logger.warning("notification budget exceeded", extra=log_context)
            return

        try:
            async with asyncio.timeout(self._smtp.timeout_seconds):
                await aiosmtplib.send(
                    _compose(enquiry, sender=self._smtp.mail_from, recipient=self._smtp.notify_to),
                    hostname=self._smtp.host,
                    port=self._smtp.port,
                    username=self._smtp.username,
                    password=self._smtp.password,
                    start_tls=self._smtp.starttls,
                    timeout=self._smtp.timeout_seconds,
                )
        except (aiosmtplib.SMTPException, TimeoutError) as exc:
            smtp_code = exc.code if isinstance(exc, aiosmtplib.SMTPResponseException) else None
            logger.error(
                "notification failed", extra=log_context | {"error": type(exc).__name__, "smtp_code": smtp_code}
            )
            return

        try:
            async with self._session_factory() as session:
                await EnquiryRepository(session).mark_notified(enquiry.id)
        except SQLAlchemyError as exc:
            logger.error("notification sent but not recorded", extra=log_context | {"error": type(exc).__name__})
            return
        logger.info("notification sent", extra=log_context)


def _compose(enquiry: Enquiry, *, sender: str, recipient: str) -> EmailMessage:
    kind = _KIND_LABELS[EnquiryKind(enquiry.kind)]
    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Reply-To"] = enquiry.email
    message["Subject"] = f"New {kind.lower()} enquiry: {enquiry.full_name}"
    message["Date"] = format_datetime(enquiry.created_at)
    message["Message-ID"] = make_msgid(domain=sender.rpartition("@")[2])
    message.set_content(_render_body(enquiry, kind))
    return message


def _render_body(enquiry: Enquiry, kind: str) -> str:
    role_transition = (
        _ROLE_TRANSITION_LABELS[RoleTransition(enquiry.role_transition)] if enquiry.role_transition else None
    )
    fields = {
        "Reference": str(enquiry.id),
        "Received": _timestamp(enquiry.created_at),
        "Enquiry type": kind,
        "Full name": enquiry.full_name,
        "Email": enquiry.email,
        "Organisation": enquiry.organisation,
        "Role title": enquiry.role_title,
        "Role transition": role_transition,
        "Cohort size": str(enquiry.cohort_size) if enquiry.cohort_size is not None else None,
    }
    width = max(map(len, fields)) + 2
    lines = [f"{f'{label}:':<{width}}{value or _NOT_PROVIDED}" for label, value in fields.items()]
    return "\n".join(
        [
            "A new enquiry arrived through the GameChanger Institute website.",
            "",
            *lines,
            "",
            "Message:",
            enquiry.message or _NOT_PROVIDED,
            "",
            f"Consent: given at {_timestamp(enquiry.consent_at)} "
            f"under privacy notice version {enquiry.consent_version}.",
            "",
        ]
    )


def _timestamp(moment: datetime) -> str:
    return moment.isoformat(timespec="seconds")
