import asyncio
import logging
import re
from datetime import datetime
from email.message import EmailMessage
from email.utils import format_datetime, make_msgid
from typing import Final

import aiosmtplib
from sqlalchemy.exc import SQLAlchemyError

from app.config import SmtpConfig
from app.domain import EnquiryKind, RoleTransition
from app.models import Enquiry
from app.repositories.enquiries import EnquiryRepository
from app.services.notification_budget import NotificationBudget

logger = logging.getLogger(__name__)

_NOT_PROVIDED: Final = "Not provided"
_SUSPICIOUS_NAME: Final = re.compile(r"(https?://|www\.|@|[<>])", re.IGNORECASE)
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
    """Emails each new enquiry to the Institute's inbox and sends a confirmation receipt to the registrant.

    Enquiries whose internal alert goes unsent, whether over budget or after a failure, keep notified_at empty
    for the team to review.
    """

    def __init__(self, smtp: SmtpConfig | None, budget: NotificationBudget, enquiries: EnquiryRepository) -> None:
        self._smtp = smtp
        self._budget = budget
        self._enquiries = enquiries

    async def notify(self, enquiry: Enquiry) -> None:
        log_context = {"enquiry_id": str(enquiry.id)}
        if self._smtp is None:
            logger.info("notification skipped: smtp not configured", extra=log_context)
            return
        if not await self._budget.spend():
            logger.warning("notification budget exceeded", extra=log_context)
            return

        internal_sent = await self._deliver(
            _compose_internal(enquiry, sender=self._smtp.mail_from, recipient=self._smtp.notify_to),
            log_context=log_context | {"mail_kind": "internal"},
        )
        if internal_sent:
            try:
                await self._enquiries.mark_notified(enquiry.id)
            except SQLAlchemyError as exc:
                logger.error("notification sent but not recorded", extra=log_context | {"error": type(exc).__name__})

        await self._deliver(
            _compose_confirmation(enquiry, sender=self._smtp.mail_from, reply_to=self._smtp.notify_to),
            log_context=log_context | {"mail_kind": "confirmation"},
        )

    async def _deliver(self, message: EmailMessage, *, log_context: dict[str, str]) -> bool:
        assert self._smtp is not None  # noqa: S101
        try:
            async with asyncio.timeout(self._smtp.timeout_seconds):
                await aiosmtplib.send(
                    message,
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
            return False

        logger.info("notification sent", extra=log_context)
        return True


def _compose_internal(enquiry: Enquiry, *, sender: str, recipient: str) -> EmailMessage:
    kind = _KIND_LABELS[EnquiryKind(enquiry.kind)]
    message = EmailMessage()
    message["From"] = f"GameChanger Institute <{sender}>"
    message["To"] = recipient
    message["Reply-To"] = enquiry.email
    message["Subject"] = f"New {kind.lower()} enquiry: {enquiry.full_name}"
    message["Date"] = format_datetime(enquiry.created_at)
    message["Message-ID"] = make_msgid(domain=sender.rpartition("@")[2])
    message.set_content(_render_internal_body(enquiry, kind))
    return message


def _compose_confirmation(enquiry: Enquiry, *, sender: str, reply_to: str) -> EmailMessage:
    message = EmailMessage()
    message["From"] = f"GameChanger Institute <{sender}>"
    message["To"] = enquiry.email
    message["Reply-To"] = reply_to
    message["Subject"] = "Your registration of interest with GameChanger Institute"
    message["Date"] = format_datetime(enquiry.created_at)
    message["Message-ID"] = make_msgid(domain=sender.rpartition("@")[2])
    message.set_content(_render_confirmation_body(enquiry))
    return message


def _safe_greeting(full_name: str) -> str:
    if _SUSPICIOUS_NAME.search(full_name):
        return "Hello,"
    parts = full_name.split(maxsplit=1)
    cleaned = parts[0].strip(",.;:!?()[]{}\"'") if parts else ""
    return f"Dear {cleaned}," if 1 <= len(cleaned) <= 40 else "Hello,"


def _render_confirmation_body(enquiry: Enquiry) -> str:
    kind = _KIND_LABELS[EnquiryKind(enquiry.kind)].lower()
    return "\n".join(
        [
            _safe_greeting(enquiry.full_name),
            "",
            f"Thank you for getting in touch with GameChanger Institute. We have received your {kind} enquiry.",
            "",
            "For the ARISE Leadership Transformation Programme Series, the next step is an entry conversation "
            "about the role outcome you want, the support you need, and whether the programme is the right fit.",
            "",
            f"Reference: {enquiry.id}",
            "",
            "A member of our team will review your note and reply from this address. "
            "If you would like to share anything further in the meantime, simply reply to this email.",
            "",
            "Warm regards,",
            "GameChanger Institute",
            "https://gamechanger.institute",
            "",
        ]
    )


def _render_internal_body(enquiry: Enquiry, kind: str) -> str:
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
