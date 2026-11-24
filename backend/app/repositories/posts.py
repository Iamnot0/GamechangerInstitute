from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from typing import Any, Final
from uuid import UUID

from sqlalchemy import Date, cast, delete, func, select, tuple_, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import Select

from app.domain import PostDocument, PostKind, PostStatus
from app.models import MediaAsset, Post, PostPhoto
from app.pagination import PageCursor

_SLUG_CONSTRAINT: Final = "uq_posts_slug"
_DOCUMENT_CONSTRAINT: Final = "uq_posts_document_url"
_VIDEO_CONSTRAINT: Final = "uq_posts_video_url"
_FIRST_VERSION: Final = 1


@dataclass(frozen=True, slots=True)
class PostContent:
    title: str
    body: str
    event_date: date | None
    youtube_id: str | None
    video_url: str | None
    photo_ids: Sequence[UUID]
    document: PostDocument | None

    def columns(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "body": self.body,
            "event_date": self.event_date,
            "youtube_id": self.youtube_id,
            "video_url": self.video_url,
            "document_url": self.document.url if self.document else None,
            "document_name": self.document.name if self.document else None,
            "document_size_bytes": self.document.size_bytes if self.document else None,
        }


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
    DOCUMENT_TAKEN = "document_taken"
    VIDEO_TAKEN = "video_taken"


class PostRepository:
    """Posts and the photos they show.

    A write that changes a post's photos expects the caller to hold the post first (`hold`), then the photos
    (`PhotoRepository.hold`), in that order, so that concurrent writes queue instead of deadlocking.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def page(
        self, *, status: PostStatus | None, kind: PostKind | None, after: PageCursor | None, limit: int
    ) -> PostPage:
        statement = _with_photos(select(Post)).order_by(Post.updated_at.desc(), Post.id.desc()).limit(limit + 1)
        if status is not None:
            statement = statement.where(Post.status == status)
        if kind is not None:
            statement = statement.where(Post.kind == kind)
        if after is not None:
            statement = statement.where(tuple_(Post.updated_at, Post.id) < tuple_(after.timestamp, after.id))

        rows = (await self._session.scalars(statement)).all()
        if len(rows) <= limit:
            return PostPage(posts=rows, next_cursor=None)
        last = rows[limit - 1]
        return PostPage(posts=rows[:limit], next_cursor=PageCursor(timestamp=last.updated_at, id=last.id))

    async def detail(self, post_id: UUID) -> Post | None:
        statement = _with_photos(select(Post)).where(Post.id == post_id).execution_options(populate_existing=True)
        return await self._session.scalar(statement)

    async def hold(self, post_id: UUID) -> Post | None:
        """The post as stored, without its photos, locked against other writes until the transaction ends."""
        statement = select(Post).where(Post.id == post_id).with_for_update().execution_options(populate_existing=True)
        return await self._session.scalar(statement)

    async def published(self, *, kind: PostKind | None, limit: int) -> Sequence[Post]:
        """Published posts, newest first by event date, or by the UTC day of publication when there is none."""
        published_on = cast(func.timezone("UTC", Post.published_at), Date)
        statement = (
            _with_photos(select(Post))
            .where(Post.status == PostStatus.PUBLISHED)
            .order_by(func.coalesce(Post.event_date, published_on).desc(), Post.published_at.desc(), Post.id.desc())
            .limit(limit)
        )
        if kind is not None:
            statement = statement.where(Post.kind == kind)
        return (await self._session.scalars(statement)).all()

    async def published_by_slug(self, slug: str) -> Post | None:
        statement = _with_photos(select(Post)).where(Post.slug == slug, Post.status == PostStatus.PUBLISHED)
        return await self._session.scalar(statement)

    async def create(
        self, kind: PostKind, content: PostContent, *, slugs: Iterable[str], actor_email: str | None
    ) -> UUID | PostWriteOutcome:
        """Stores a draft under the first slug that is free and returns its id, or says what was already taken."""
        for slug in slugs:
            statement = (
                insert(Post)
                .values(
                    kind=kind,
                    slug=slug,
                    status=PostStatus.DRAFT,
                    version=_FIRST_VERSION,
                    updated_by_email=actor_email,
                    **content.columns(),
                )
                .on_conflict_do_nothing(index_elements=[Post.slug])
                .returning(Post.id)
            )
            try:
                created: UUID | None = await self._session.scalar(statement)
            except IntegrityError as error:
                return await self._taken(error)
            if created is not None:
                await self._show_photos(created, content.photo_ids)
                await self._session.commit()
                return created
        await self._session.rollback()
        return PostWriteOutcome.SLUG_TAKEN

    async def revise(
        self, post_id: UUID, content: PostContent, *, slug: str, expected_version: int, actor_email: str | None
    ) -> PostWriteOutcome:
        """Replaces the post's content. Photos it no longer shows are deleted with the same commit."""
        statement = (
            update(Post)
            .where(Post.id == post_id, Post.version == expected_version)
            .values(slug=slug, version=Post.version + 1, updated_by_email=actor_email, **content.columns())
            .returning(Post.id)
        )
        try:
            revised = await self._session.scalar(statement)
        except IntegrityError as error:
            return await self._taken(error)
        if revised is None:
            return await self._rejected_write(post_id, expected_version)
        await self._show_photos(post_id, content.photo_ids)
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
        """Deletes the post and, with the same commit, the records of the photos it showed."""
        if await self.hold(post_id) is None:
            await self._session.rollback()
            return False
        await self._show_photos(post_id, ())
        await self._session.execute(delete(Post).where(Post.id == post_id))
        await self._session.commit()
        return True

    async def _show_photos(self, post_id: UUID, photo_ids: Sequence[UUID]) -> None:
        """Makes `photo_ids`, in order, the post's photos and deletes the photos that drop out."""
        shown = await self._session.scalars(
            delete(PostPhoto).where(PostPhoto.post_id == post_id).returning(PostPhoto.media_id)
        )
        dropped = set(shown) - set(photo_ids)
        if photo_ids:
            await self._session.execute(
                insert(PostPhoto),
                [
                    {"post_id": post_id, "position": position, "media_id": photo_id}
                    for position, photo_id in enumerate(photo_ids)
                ],
            )
        if dropped:
            await self._session.execute(delete(MediaAsset).where(MediaAsset.id.in_(dropped)))

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

    async def _taken(self, error: IntegrityError) -> PostWriteOutcome:
        """Which unique value another post already holds; any other integrity failure is raised again."""
        await self._session.rollback()
        violation = str(error.orig)
        if _SLUG_CONSTRAINT in violation:
            return PostWriteOutcome.SLUG_TAKEN
        if _DOCUMENT_CONSTRAINT in violation:
            return PostWriteOutcome.DOCUMENT_TAKEN
        if _VIDEO_CONSTRAINT in violation:
            return PostWriteOutcome.VIDEO_TAKEN
        raise error

    async def _rejected_write(self, post_id: UUID, expected_version: int) -> PostWriteOutcome:
        version = await self._session.scalar(select(Post.version).where(Post.id == post_id))
        await self._session.rollback()
        if version is None:
            return PostWriteOutcome.NOT_FOUND
        return PostWriteOutcome.CONFLICT if version != expected_version else PostWriteOutcome.WRONG_STATUS


def _with_photos(statement: Select[Post]) -> Select[Post]:
    return statement.options(selectinload(Post.photos))
