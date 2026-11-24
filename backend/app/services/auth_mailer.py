import asyncio
import logging
from datetime import UTC, datetime
from email.message import EmailMessage
from email.utils import format_datetime, make_msgid

import aiosmtplib

from app.config import SmtpConfig
from app.services.notification_budget import NotificationBudget

logger = logging.getLogger(__name__)


class StaffAuthMailer:
    def __init__(
        self,
        smtp: SmtpConfig | None,
        sender: str | None,
        site_url: str,
        budget: NotificationBudget,
    ) -> None:
        self._smtp = smtp
        self._sender = sender
        self._site_url = site_url
        self._budget = budget

    async def send_login_code(self, recipient: str, code: str) -> bool:
        body = "\n".join(
            [
                f"Your GameChanger Institute staff sign-in code is: {code}",
                "",
                "This code expires in 10 minutes and can be used once.",
                "If you did not request this code, ignore this email.",
                "",
            ]
        )
        return await self._deliver(
            recipient=recipient,
            subject=f"Your GameChanger Institute sign-in code: {code}",
            body=body,
            kind="login_code",
        )

    async def send_invitation(self, recipient: str, role: str) -> bool:
        body = "\n".join(
            [
                "You have been granted access to the GameChanger Institute staff console.",
                "",
                f"Role: {role.capitalize()}",
                f"Sign in: {self._site_url}/sign-in/",
                "",
                "Enter your email address on the sign-in page to receive a one-time 6-digit code.",
                "",
            ]
        )
        return await self._deliver(
            recipient=recipient,
            subject="Access to the GameChanger Institute staff console",
            body=body,
            kind="staff_invitation",
        )

    async def _deliver(self, *, recipient: str, subject: str, body: str, kind: str) -> bool:
        if self._smtp is None or self._sender is None:
            logger.warning("staff auth email skipped: smtp not configured", extra={"kind": kind})
            return False
        if not await self._budget.spend():
            logger.warning("staff auth email budget exceeded", extra={"kind": kind})
            return False

        message = EmailMessage()
        message["From"] = f"GameChanger Institute <{self._sender}>"
        message["To"] = recipient
        message["Subject"] = subject
        message["Date"] = format_datetime(datetime.now(UTC))
        message["Message-ID"] = make_msgid(domain=self._sender.rpartition("@")[2])
        message.set_content(body)

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
                "staff auth email failed",
                extra={"kind": kind, "error": type(exc).__name__, "smtp_code": smtp_code},
            )
            return False

        logger.info("staff auth email sent", extra={"kind": kind})
        return True
