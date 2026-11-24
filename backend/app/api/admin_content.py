import logging
from http import HTTPStatus
from typing import Annotated, Any, Final

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from app.admin_schemas import VersionGuard
from app.api.media_references import require_media
from app.api.staff_actions import log_staff_action
from app.block_schemas import BLOCK_MODELS, Block, BlockDetail, BlockList, BlockSummary, DraftSave
from app.dependencies import ContentRepositoryDep, MediaRepositoryDep, StaffDep, require_json_body, require_staff
from app.domain import BlockKey, MediaKind
from app.problems import invalid_body, problem_responses
from app.repositories.content import BlockWriteOutcome
from app.repositories.media import MediaRepository

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1/admin/content",
    tags=["admin"],
    dependencies=[Depends(require_staff)],
    responses=problem_responses(401, 403, 503),
)

_NOT_FOUND_DETAIL: Final = "This content block does not exist."
_CONFLICT_DETAIL: Final = "Someone else changed this content. Reload it and try again."
_NO_DRAFT_DETAIL: Final = "This content has no draft."
_DATA_FIELD: Final = "data"


async def _known_key(key: str) -> BlockKey:
    try:
        return BlockKey(key)
    except ValueError:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL) from None


BlockKeyDep = Annotated[BlockKey, Depends(_known_key)]


@router.get("")
async def list_blocks(staff: StaffDep, content: ContentRepositoryDep) -> BlockList:
    blocks = await content.blocks()
    log_staff_action(logger, staff, "list_blocks")
    return BlockList(items=[BlockSummary.model_validate(block) for block in blocks])


@router.get("/{key}", responses=problem_responses(404, 422))
async def get_block(key: BlockKeyDep, staff: StaffDep, content: ContentRepositoryDep) -> BlockDetail:
    block = await content.block(key)
    log_staff_action(logger, staff, "view_block", block_key=key)
    return BlockDetail.model_validate(block)


@router.put(
    "/{key}",
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 404, 409, 413, 415, 422),
)
async def save_draft(
    key: BlockKeyDep, save: DraftSave, staff: StaffDep, content: ContentRepositoryDep, media: MediaRepositoryDep
) -> BlockDetail:
    data = await _publishable(key, save.data, media)
    outcome = await content.save_draft(key, data, expected_version=save.expected_version, actor_email=staff.email)
    _require_written(outcome)
    log_staff_action(logger, staff, "save_draft", block_key=key)
    return BlockDetail.model_validate(await content.block(key))


@router.post(
    "/{key}/publish",
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 404, 409, 413, 415, 422),
)
async def publish_block(
    key: BlockKeyDep, guard: VersionGuard, staff: StaffDep, content: ContentRepositoryDep, media: MediaRepositoryDep
) -> BlockDetail:
    block = await content.block(key)
    if block.version != guard.expected_version:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=_CONFLICT_DETAIL)
    if block.draft is None:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=_NO_DRAFT_DETAIL)
    data = await _publishable(key, block.draft, media)
    outcome = await content.publish(
        key, data, expected_version=guard.expected_version, actor_sub=staff.subject, actor_email=staff.email
    )
    _require_written(outcome)
    log_staff_action(logger, staff, "publish_block", block_key=key)
    return BlockDetail.model_validate(await content.block(key))


@router.delete(
    "/{key}/draft",
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 404, 409, 413, 415, 422),
)
async def discard_draft(
    key: BlockKeyDep, guard: VersionGuard, staff: StaffDep, content: ContentRepositoryDep
) -> BlockDetail:
    _require_written(await content.discard_draft(key, expected_version=guard.expected_version))
    log_staff_action(logger, staff, "discard_draft", block_key=key)
    return BlockDetail.model_validate(await content.block(key))


async def _publishable(key: BlockKey, data: dict[str, Any], media: MediaRepository) -> dict[str, Any]:
    """The stored form of block data that satisfies the key's schema and refers only to images that exist."""
    try:
        block: Block = BLOCK_MODELS[key].model_validate(data)
    except ValidationError as error:
        raise invalid_body(error, _DATA_FIELD) from None
    await require_media(
        media,
        [((_DATA_FIELD, *location), media_id, MediaKind.IMAGE) for location, media_id in block.image_fields()],
    )
    return block.model_dump(mode="json")


def _require_written(outcome: BlockWriteOutcome) -> None:
    if outcome is BlockWriteOutcome.CONFLICT:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=_CONFLICT_DETAIL)
    if outcome is BlockWriteOutcome.NO_DRAFT:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=_NO_DRAFT_DETAIL)
