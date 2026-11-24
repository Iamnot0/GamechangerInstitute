from collections.abc import Collection, Mapping, Sequence
from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from sqlalchemy import delete, or_, select, tuple_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.block_schemas import BLOCK_LABELS, referenced_media_ids
from app.domain import BlockKey, MediaKind
from app.models import ContentBlock, MediaAsset, Post
from app.pagination import PageCursor


@dataclass(frozen=True, slots=True)
class MediaPage:
    assets: Sequence[MediaAsset]
    next_cursor: PageCursor | None


class MediaDeletionOutcome(StrEnum):
    DELETED = "deleted"
    IN_USE = "in_use"
    NOT_FOUND = "not_found"


@dataclass(frozen=True, slots=True)
class MediaDeletion:
    outcome: MediaDeletionOutcome
    used_in: Sequence[str] = ()


class MediaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def page(self, *, kind: MediaKind | None, after: PageCursor | None, limit: int) -> MediaPage:
        statement = select(MediaAsset).order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc()).limit(limit + 1)
        if kind is not None:
            statement = statement.where(MediaAsset.kind == kind)
        if after is not None:
            statement = statement.where(
                tuple_(MediaAsset.created_at, MediaAsset.id) < tuple_(after.timestamp, after.id)
            )

        rows = (await self._session.scalars(statement)).all()
        if len(rows) <= limit:
            return MediaPage(assets=rows, next_cursor=None)
        last = rows[limit - 1]
        return MediaPage(assets=rows[:limit], next_cursor=PageCursor(timestamp=last.created_at, id=last.id))

    async def get(self, media_id: UUID) -> MediaAsset | None:
        return await self._session.scalar(select(MediaAsset).where(MediaAsset.id == media_id))

    async def images(self, media_ids: Collection[UUID]) -> Sequence[MediaAsset]:
        if not media_ids:
            return []
        statement = select(MediaAsset).where(MediaAsset.id.in_(media_ids), MediaAsset.kind == MediaKind.IMAGE)
        return (await self._session.scalars(statement)).all()

    async def add(self, asset: MediaAsset, *, actor_sub: str, actor_email: str | None) -> MediaAsset:
        asset.created_by_sub = actor_sub
        asset.created_by_email = actor_email
        self._session.add(asset)
        await self._session.commit()
        return asset

    async def change(self, media_id: UUID, changes: Mapping[str, str]) -> MediaAsset | None:
        statement = update(MediaAsset).where(MediaAsset.id == media_id).values(**changes).returning(MediaAsset)
        changed = await self._session.scalar(statement, execution_options={"populate_existing": True})
        await self._session.commit()
        return changed

    async def delete(self, media_id: UUID) -> MediaDeletion:
        """Deletes an asset nothing refers to. The row lock makes a concurrent new reference wait and then fail."""
        locked = await self._session.scalar(select(MediaAsset.id).where(MediaAsset.id == media_id).with_for_update())
        if locked is None:
            await self._session.rollback()
            return MediaDeletion(MediaDeletionOutcome.NOT_FOUND)
        used_in = (await self.usage([media_id]))[media_id]
        if used_in:
            await self._session.rollback()
            return MediaDeletion(MediaDeletionOutcome.IN_USE, used_in)
        await self._session.execute(delete(MediaAsset).where(MediaAsset.id == media_id))
        await self._session.commit()
        return MediaDeletion(MediaDeletionOutcome.DELETED)

    async def hold_for_reference(self, media_ids: Collection[UUID]) -> dict[UUID, MediaKind]:
        """The kind of each asset that exists, each held against deletion until the transaction ends."""
        if not media_ids:
            return {}
        statement = (
            select(MediaAsset.id, MediaAsset.kind)
            .where(MediaAsset.id.in_(media_ids))
            .order_by(MediaAsset.id)
            .with_for_update(read=True, key_share=True)
        )
        return {row.id: MediaKind(row.kind) for row in await self._session.execute(statement)}

    async def usage(self, media_ids: Collection[UUID]) -> dict[UUID, list[str]]:
        """Where each asset is used: draft or published blocks first, then posts by title."""
        used_in: dict[UUID, list[str]] = {media_id: [] for media_id in media_ids}
        if not used_in:
            return used_in

        blocks = {block.key: block for block in await self._session.scalars(select(ContentBlock))}
        for key in BlockKey:
            if (block := blocks.get(key)) is None:
                continue
            for media_id in referenced_media_ids([block.draft, block.published]) & used_in.keys():
                used_in[media_id].append(BLOCK_LABELS[key])

        posts = await self._session.execute(
            select(Post.title, Post.cover_media_id, Post.video_media_id)
            .where(or_(Post.cover_media_id.in_(media_ids), Post.video_media_id.in_(media_ids)))
            .order_by(Post.title, Post.id)
        )
        for post in posts:
            for media_id in {post.cover_media_id, post.video_media_id} & used_in.keys():
                used_in[media_id].append(f"News: {post.title}")
        return used_in
