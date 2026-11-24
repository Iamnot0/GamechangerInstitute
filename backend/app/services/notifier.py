import asyncio
import logging
import re
from collections.abc import Callable, Mapping
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
from app.services.email_layout import Action, EmailContent, Highlight, render_html, render_text
from app.services.notification_budget import NotificationBudget

logger = logging.getLogger(__name__)

_NOT_PROVIDED: Final = "Not provided"
_SUSPICIOUS_NAME: Final = re.compile(r"(https?://|www\.|@|[<>])", re.IGNORECASE)
_KIND_LABELS: Final = {
    EnquiryKind.INDIVIDUAL: "Individual",
    EnquiryKind.ORGANISATION: "Organisation",
    EnquiryKind.GENERAL: "General",
}
_PROGRAMME: Final = "ARISE Leadership Transformation Programme Series"
_NEXT_STEPS: Final = (
    (
        "An entry conversation",
        "Your concerns, the role outcome you want, the support you need, and whether the programme is suitable.",
    ),
    (
        "A clear account of the programme",
        "What it can deliver, who will see your record, and how reviews work, before you commit to anything.",
    ),
    (
        "Enrolment for the pilot cohort",
        "Twelve leaders in circles of four, matched with steward mentors and a sponsor.",
    ),
)
_FOLLOW_UP: Final[Mapping[EnquiryKind, Callable[[str], Action | None]]] = {
    EnquiryKind.INDIVIDUAL: lambda site_url: Action("Read about the programme", f"{site_url}/programme/"),
    EnquiryKind.ORGANISATION: lambda site_url: Action("See the corporate track", f"{site_url}/organisations/"),
    EnquiryKind.GENERAL: lambda _site_url: None,
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

    def __init__(
        self, smtp: SmtpConfig | None, budget: NotificationBudget, enquiries: EnquiryRepository, site_url: str
    ) -> None:
        self._smtp = smtp
        self._budget = budget
        self._enquiries = enquiries
        self._site_url = site_url

    async def notify(self, enquiry: Enquiry) -> None:
        log_context = {"enquiry_id": str(enquiry.id)}
        smtp = self._smtp
        if smtp is None:
            logger.info("notification skipped: smtp not configured", extra=log_context)
            return
        if not await self._budget.spend():
            logger.warning("notification budget exceeded", extra=log_context)
            return

        internal_sent = await _deliver(
            smtp,
            _compose_internal(enquiry, sender=smtp.mail_from, recipient=smtp.notify_to),
            log_context=log_context | {"mail_kind": "internal"},
        )
        if internal_sent:
            try:
                await self._enquiries.mark_notified(enquiry.id)
            except SQLAlchemyError as exc:
                logger.error("notification sent but not recorded", extra=log_context | {"error": type(exc).__name__})

        await _deliver(
            smtp,
            _compose_confirmation(enquiry, sender=smtp.mail_from, reply_to=smtp.notify_to, site_url=self._site_url),
            log_context=log_context | {"mail_kind": "confirmation"},
        )


async def _deliver(smtp: SmtpConfig, message: EmailMessage, *, log_context: dict[str, str]) -> bool:
    try:
        async with asyncio.timeout(smtp.timeout_seconds):
            await aiosmtplib.send(
                message,
                hostname=smtp.host,
                port=smtp.port,
                username=smtp.username,
                password=smtp.password,
                start_tls=smtp.starttls,
                timeout=smtp.timeout_seconds,
            )
    except (aiosmtplib.SMTPException, TimeoutError) as exc:
        smtp_code = exc.code if isinstance(exc, aiosmtplib.SMTPResponseException) else None
        logger.error("notification failed", extra=log_context | {"error": type(exc).__name__, "smtp_code": smtp_code})
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


def _compose_confirmation(enquiry: Enquiry, *, sender: str, reply_to: str, site_url: str) -> EmailMessage:
    message = EmailMessage()
    message["From"] = f"GameChanger Institute <{sender}>"
    message["To"] = enquiry.email
    message["Reply-To"] = reply_to
    message["Subject"] = "Your registration of interest with GameChanger Institute"
    message["Date"] = format_datetime(enquiry.created_at)
    message["Message-ID"] = make_msgid(domain=sender.rpartition("@")[2])
    content = _confirmation_content(enquiry, site_url)
    message.set_content(render_text(content, site_url))
    message.add_alternative(render_html(content, site_url), subtype="html")
    return message


def _safe_greeting(full_name: str) -> str:
    if _SUSPICIOUS_NAME.search(full_name):
        return "Hello,"
    parts = full_name.split(maxsplit=1)
    cleaned = parts[0].strip(",.;:!?()[]{}\"'") if parts else ""
    return f"Dear {cleaned}," if 1 <= len(cleaned) <= 40 else "Hello,"


def _confirmation_content(enquiry: Enquiry, site_url: str) -> EmailContent:
    kind = EnquiryKind(enquiry.kind)
    about_programme = kind is not EnquiryKind.GENERAL
    return EmailContent(
        preheader=f"We have received your registration of interest. Reference {enquiry.id}.",
        heading="We have received your registration",
        greeting=_safe_greeting(enquiry.full_name),
        intro=[
            "Thank you for getting in touch with GameChanger Institute. "
            f"We have received your {_KIND_LABELS[kind].lower()} enquiry.",
        ],
        highlight=Highlight("Your reference", str(enquiry.id)),
        steps_title=f"What happens next with the {_PROGRAMME}" if about_programme else None,
        steps=_NEXT_STEPS if about_programme else (),
        outro=[
            "A member of our team will review your note and reply from this address. "
            "If you would like to share anything further in the meantime, simply reply to this email.",
        ],
        action=_FOLLOW_UP[kind](site_url),
        footnote=(
            "You are receiving this email because you registered interest on our website. "
            f"The {_PROGRAMME} is ICF-informed. It is not accredited or endorsed by the World Health Organization."
        ),
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
