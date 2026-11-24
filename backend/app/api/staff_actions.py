import logging

from app.auth.verifier import StaffMember


def log_staff_action(logger: logging.Logger, staff: StaffMember, action: str, **subject: object) -> None:
    """Records who did what to which record, by subject id only: staff emails and record contents stay out of logs."""
    extra = {"actor_sub": staff.subject, "action": action} | {name: str(value) for name, value in subject.items()}
    logger.info("staff action", extra=extra)
