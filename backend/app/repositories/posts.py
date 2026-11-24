from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from typing import Final
from uuid import UUID

from sqlalchemy import Date, cast, delete, func, select, tuple_, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.sql import Select

from app.domain import PostStatus
from app.models import Post
from app.pagination import PageCursor

_SLUG_CONSTRAINT: Final = "uq_posts_slug"
_FIRST_VERSION: Final = 1


@dataclass(frozen=True, slots=True)
class PostContent:
    title: str
    summary: str
    body: str
    event_date: date | None
    cover_media_id: UUID | None
    video_media_id: UUID | None


@dataclass(frozen=True, slots=True)
class PostPage:
    posts: Sequence[Post]
    next_cursor: PageCursor | None


class PostWriteOutcome(StrEnum):
    WRITTEN = "written"
    NOT_FOUND = "not_found"
    CONFLICT = "conflict"
    WRONG_STATUS = "wrong_status"
    SLUG_TAKEN = "slug_taken"


class PostRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def page(self, *, status: PostStatus | None, after: PageCursor | None, limit: int) -> PostPage:
        statement = _with_media(select(Post)).order_by(Post.updated_at.desc(), Post.id.desc()).limit(limit + 1)
        if status is not None:
            statement = statement.where(Post.status == status)
        if after is not None:
            statement = statement.where(tuple_(Post.updated_at, Post.id) < tuple_(after.timestamp, after.id))

        rows = (await self._session.scalars(statement)).all()
        if len(rows) <= limit:
            return PostPage(posts=rows, next_cursor=None)
        last = rows[limit - 1]
        return PostPage(posts=rows[:limit], next_cursor=PageCursor(timestamp=last.updated_at, id=last.id))

    async def detail(self, post_id: UUID) -> Post | None:
        statement = _with_media(select(Post)).where(Post.id == post_id).execution_options(populate_existing=True)
        return await self._session.scalar(statement)

    async def published(self, *, limit: int) -> Sequence[Post]:
        """Published posts, newest first by event date, or by the UTC day of publication when there is none."""
        published_on = cast(func.timezone("UTC", Post.published_at), Date)
        statement = (
            _with_media(select(Post))
            .where(Post.status == PostStatus.PUBLISHED)
            .order_by(func.coalesce(Post.event_date, published_on).desc(), Post.published_at.desc(), Post.id.desc())
            .limit(limit)
        )
        return (await self._session.scalars(statement)).all()

    async def published_by_slug(self, slug: str) -> Post | None:
        statement = _with_media(select(Post)).where(Post.slug == slug, Post.status == PostStatus.PUBLISHED)
        return await self._session.scalar(statement)

    async def create(self, content: PostContent, *, slugs: Iterable[str], actor_email: str | None) -> UUID | None:
        """Stores a draft under the first slug that is free, or nothing when every candidate is taken."""
        for slug in slugs:
            created: UUID | None = await self._session.scalar(
                insert(Post)
                .values(
                    slug=slug,
                    title=content.title,
                    summary=content.summary,
                    body=content.body,
                    event_date=content.event_date,
                    cover_media_id=content.cover_media_id,
                    video_media_id=content.video_media_id,
                    status=PostStatus.DRAFT,
                    version=_FIRST_VERSION,
                    updated_by_email=actor_email,
                )
                .on_conflict_do_nothing(index_elements=[Post.slug])
                .returning(Post.id)
            )
            if created is not None:
                await self._session.commit()
                return created
        await self._session.rollback()
        return None

    async def revise(
        self, post_id: UUID, content: PostContent, *, slug: str, expected_version: int, actor_email: str | None
    ) -> PostWriteOutcome:
        statement = (
            update(Post)
            .where(Post.id == post_id, Post.version == expected_version)
            .values(
                slug=slug,
                title=content.title,
                summary=content.summary,
                body=content.body,
                event_date=content.event_date,
                cover_media_id=content.cover_media_id,
                video_media_id=content.video_media_id,
                version=Post.version + 1,
                updated_by_email=actor_email,
            )
            .returning(Post.id)
        )
        try:
            revised = await self._session.scalar(statement)
        except IntegrityError as error:
            await self._session.rollback()
            if _SLUG_CONSTRAINT not in str(error.orig):
                raise
            return PostWriteOutcome.SLUG_TAKEN
        if revised is None:
            return await self._rejected_write(post_id, expected_version)
        await self._session.commit()
        return PostWriteOutcome.WRITTEN

    async def publish(self, post_id: UUID, *, expected_version: int, actor_email: str | None) -> PostWriteOutcome:
        return await self._change_status(
            post_id,
            current=PostStatus.DRAFT,
            expected_version=expected_version,
            values={"status": PostStatus.PUBLISHED, "published_at": func.now(), "updated_by_email": actor_email},
        )

    async def unpublish(self, post_id: UUID, *, expected_version: int, actor_email: str | None) -> PostWriteOutcome:
        return await self._change_status(
            post_id,
            current=PostStatus.PUBLISHED,
            expected_version=expected_version,
            values={"status": PostStatus.DRAFT, "updated_by_email": actor_email},
        )

    async def delete(self, post_id: UUID) -> bool:
        deleted = await self._session.scalar(delete(Post).where(Post.id == post_id).returning(Post.id))
        await self._session.commit()
        return deleted is not None

    async def _change_status(
        self, post_id: UUID, *, current: PostStatus, expected_version: int, values: dict[str, object]
    ) -> PostWriteOutcome:
        changed = await self._session.scalar(
            update(Post)
            .where(Post.id == post_id, Post.version == expected_version, Post.status == current)
            .values(version=Post.version + 1, **values)
            .returning(Post.id)
        )
        if changed is None:
            return await self._rejected_write(post_id, expected_version)
        await self._session.commit()
        return PostWriteOutcome.WRITTEN

    async def _rejected_write(self, post_id: UUID, expected_version: int) -> PostWriteOutcome:
        version = await self._session.scalar(select(Post.version).where(Post.id == post_id))
        await self._session.rollback()
        if version is None:
            return PostWriteOutcome.NOT_FOUND
        return PostWriteOutcome.CONFLICT if version != expected_version else PostWriteOutcome.WRONG_STATUS


def _with_media(statement: Select[Post]) -> Select[Post]:
    return statement.options(joinedload(Post.cover), joinedload(Post.video))
