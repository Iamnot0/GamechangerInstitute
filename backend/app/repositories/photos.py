from collections.abc import Collection
from enum import StrEnum
from typing import Final
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import MediaAsset, PostPhoto

_DUPLICATE_URL_CONSTRAINT: Final = "uq_media_assets_url"


class PhotoDeletionOutcome(StrEnum):
    DELETED = "deleted"
    ATTACHED = "attached"
    NOT_FOUND = "not_found"


class PhotoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, photo: MediaAsset, *, actor_sub: str, actor_email: str | None) -> MediaAsset | None:
        """Stores the photo, or returns nothing when that URL is already recorded.

        One record per stored file is what makes it safe to delete the file when its record goes.
        """
        photo.created_by_sub = actor_sub
        photo.created_by_email = actor_email
        self._session.add(photo)
        try:
            await self._session.commit()
        except IntegrityError as error:
            await self._session.rollback()
            if _DUPLICATE_URL_CONSTRAINT in str(error.orig):
                return None
            raise
        return photo

    async def delete(self, photo_id: UUID) -> PhotoDeletionOutcome:
        """Deletes a photo no post shows. The row lock makes a post attaching it meanwhile wait and then fail."""
        locked = await self._session.scalar(select(MediaAsset.id).where(MediaAsset.id == photo_id).with_for_update())
        if locked is None:
            await self._session.rollback()
            return PhotoDeletionOutcome.NOT_FOUND
        attached = await self._session.scalar(select(PostPhoto.post_id).where(PostPhoto.media_id == photo_id))
        if attached is not None:
            await self._session.rollback()
            return PhotoDeletionOutcome.ATTACHED
        await self._session.execute(delete(MediaAsset).where(MediaAsset.id == photo_id))
        await self._session.commit()
        return PhotoDeletionOutcome.DELETED

    async def hold(self, photo_ids: Collection[UUID]) -> dict[UUID, UUID | None]:
        """The post each existing photo belongs to, if any, with the photos locked until the transaction ends.

        The lock keeps a photo from being deleted or attached to another post before the caller's write lands.
        Ownership is read after the locks are held, so it reflects every write that finished before them.
        """
        if not photo_ids:
            return {}
        held = await self._session.scalars(
            select(MediaAsset.id).where(MediaAsset.id.in_(photo_ids)).order_by(MediaAsset.id).with_for_update()
        )
        owners: dict[UUID, UUID | None] = dict.fromkeys(held)
        attachments = await self._session.execute(
            select(PostPhoto.media_id, PostPhoto.post_id).where(PostPhoto.media_id.in_(photo_ids))
        )
        for attachment in attachments:
            owners[attachment.media_id] = attachment.post_id
        return owners
