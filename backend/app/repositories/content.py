from enum import StrEnum
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import BlockKey
from app.models import ContentBlock, ContentRevision

_UNWRITTEN_VERSION = 0


class BlockWriteOutcome(StrEnum):
    WRITTEN = "written"
    NO_DRAFT = "no_draft"
    CONFLICT = "conflict"


class ContentRepository:
    """Content blocks by key. A block nobody has written yet reads as version 0 with no draft and nothing published."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def blocks(self) -> list[ContentBlock]:
        statement = select(ContentBlock).execution_options(populate_existing=True)
        stored = {block.key: block for block in await self._session.scalars(statement)}
        return [stored.get(key) or ContentBlock(key=key, version=_UNWRITTEN_VERSION) for key in BlockKey]

    async def block(self, key: BlockKey) -> ContentBlock:
        statement = select(ContentBlock).where(ContentBlock.key == key).execution_options(populate_existing=True)
        return await self._session.scalar(statement) or ContentBlock(key=key, version=_UNWRITTEN_VERSION)

    async def published(self) -> dict[BlockKey, dict[str, Any]]:
        rows = await self._session.execute(
            select(ContentBlock.key, ContentBlock.published).where(ContentBlock.published.is_not(None))
        )
        return {BlockKey(row.key): row.published for row in rows}

    async def save_draft(
        self, key: BlockKey, data: dict[str, Any], *, expected_version: int, actor_email: str | None
    ) -> BlockWriteOutcome:
        draft = {"draft": data, "draft_updated_at": func.now(), "draft_updated_by_email": actor_email}
        if expected_version == _UNWRITTEN_VERSION:
            saved = await self._session.scalar(
                insert(ContentBlock)
                .values(key=key, version=_UNWRITTEN_VERSION + 1, **draft)
                .on_conflict_do_nothing(index_elements=[ContentBlock.key])
                .returning(ContentBlock.key)
            )
        else:
            saved = await self._session.scalar(
                update(ContentBlock)
                .where(ContentBlock.key == key, ContentBlock.version == expected_version)
                .values(version=ContentBlock.version + 1, **draft)
                .returning(ContentBlock.key)
            )
        if saved is None:
            await self._session.rollback()
            return BlockWriteOutcome.CONFLICT
        await self._session.commit()
        return BlockWriteOutcome.WRITTEN

    async def publish(
        self, key: BlockKey, data: dict[str, Any], *, expected_version: int, actor_sub: str, actor_email: str | None
    ) -> BlockWriteOutcome:
        """Makes `data`, the validated form of the current draft, the live data and records it as a revision."""
        published = await self._session.scalar(
            update(ContentBlock)
            .where(ContentBlock.key == key, ContentBlock.version == expected_version, ContentBlock.draft.is_not(None))
            .values(
                published=data,
                published_at=func.now(),
                published_by_email=actor_email,
                draft=None,
                draft_updated_at=None,
                draft_updated_by_email=None,
                version=ContentBlock.version + 1,
            )
            .returning(ContentBlock.key)
        )
        if published is None:
            return await self._rejected_write(key, expected_version)
        self._session.add(
            ContentRevision(key=key, data=data, published_by_sub=actor_sub, published_by_email=actor_email)
        )
        await self._session.commit()
        return BlockWriteOutcome.WRITTEN

    async def discard_draft(self, key: BlockKey, *, expected_version: int) -> BlockWriteOutcome:
        discarded = await self._session.scalar(
            update(ContentBlock)
            .where(ContentBlock.key == key, ContentBlock.version == expected_version, ContentBlock.draft.is_not(None))
            .values(draft=None, draft_updated_at=None, draft_updated_by_email=None, version=ContentBlock.version + 1)
            .returning(ContentBlock.key)
        )
        if discarded is None:
            return await self._rejected_write(key, expected_version)
        await self._session.commit()
        return BlockWriteOutcome.WRITTEN

    async def _rejected_write(self, key: BlockKey, expected_version: int) -> BlockWriteOutcome:
        version = await self._session.scalar(select(ContentBlock.version).where(ContentBlock.key == key))
        await self._session.rollback()
        if (version or _UNWRITTEN_VERSION) != expected_version:
            return BlockWriteOutcome.CONFLICT
        return BlockWriteOutcome.NO_DRAFT
