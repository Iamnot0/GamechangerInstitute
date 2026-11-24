"""Seed the media library and content blocks with what the site ships today.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-24
"""

import uuid
from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SEED_SUB = "seed"
_SEED_EMAIL = "seed@gamechanger.institute"

_COHORT_1 = "00000000-0000-7000-8000-000000000001"
_COHORT_4 = "00000000-0000-7000-8000-000000000002"
_COHORT_2 = "00000000-0000-7000-8000-000000000003"
_COHORT_3 = "00000000-0000-7000-8000-000000000004"
_COHORT_5 = "00000000-0000-7000-8000-000000000005"
_HANA_BANK = "00000000-0000-7000-8000-000000000006"
_FWD = "00000000-0000-7000-8000-000000000007"
_AIA = "00000000-0000-7000-8000-000000000008"
_CHINA_EASTERN = "00000000-0000-7000-8000-000000000009"
_FOUNDER = "00000000-0000-7000-8000-000000000010"
_ROUNDTABLE = "00000000-0000-7000-8000-000000000011"
_KEYNOTE = "00000000-0000-7000-8000-000000000012"
_PARTNERSHIP = "00000000-0000-7000-8000-000000000013"
_MEDIA_FEATURE = "00000000-0000-7000-8000-000000000014"
_PATRON = "00000000-0000-7000-8000-000000000015"

_IMAGES: tuple[tuple[str, str, int, int, str], ...] = (
    (
        _COHORT_1,
        "/images/cohort-1-879.webp",
        879,
        658,
        "A cohort of about twenty-five professionals posing together in an office after a GCI workshop, "
        "many giving a thumbs up.",
    ),
    (
        _COHORT_4,
        "/images/cohort-4-737.webp",
        737,
        554,
        "Workshop participants seated in a circle while a facilitator speaks, in a studio with pendant lights.",
    ),
    (
        _COHORT_2,
        "/images/cohort-2-960.webp",
        960,
        375,
        "A group of professionals standing together at the front of a training room, smiling and waving.",
    ),
    (
        _COHORT_3,
        "/images/cohort-3-960.webp",
        960,
        455,
        "A large cohort lined up in a workshop studio under pendant lights, giving a thumbs up.",
    ),
    (
        _COHORT_5,
        "/images/cohort-5-960.webp",
        960,
        499,
        "Participants gathered in front of a wall covered in sticky notes at the end of a design session.",
    ),
    (_HANA_BANK, "/images/clients/hana-bank.webp", 200, 200, "Hana Bank"),
    (_FWD, "/images/clients/fwd.webp", 273, 185, "FWD Insurance"),
    (_AIA, "/images/clients/aia.webp", 218, 232, "AIA"),
    (_CHINA_EASTERN, "/images/clients/china-eastern.webp", 254, 198, "China Eastern Airlines"),
    (
        _FOUNDER,
        "/images/benjamin-mah-400.webp",
        400,
        400,
        "Dr Benjamin Mah, Founder and Programme Director of GameChanger Institute.",
    ),
    (
        _ROUNDTABLE,
        "/images/roundtable-640.webp",
        640,
        641,
        "Leaders seated along a roundtable during a discussion.",
    ),
    (
        _KEYNOTE,
        "/images/keynote-640.webp",
        640,
        640,
        "A speaker delivering a keynote at a lectern at a Singapore graduation ceremony.",
    ),
    (
        _PARTNERSHIP,
        "/images/partnership-signing-640.webp",
        640,
        640,
        "Representatives holding signed documents at a memorandum of understanding signing ceremony.",
    ),
    (
        _MEDIA_FEATURE,
        "/images/media-feature-640.webp",
        640,
        640,
        "Singapore Tatler cover, August 2017, featuring Benjamin Mah in the Master Minds issue.",
    ),
    (
        _PATRON,
        "/images/patron-640.webp",
        640,
        728,
        "Shawn Huang Wei Zhong speaking during a televised interview.",
    ),
)

_BLOCKS: dict[str, dict[str, Any]] = {
    "success_stories": {
        "lede": (
            "Cohorts and workshops GCI has run with leading organisations, delivering capability and "
            "job-impact outcomes."
        ),
        "photos": [
            {"media_id": _COHORT_1},
            {"media_id": _COHORT_4},
            {"media_id": _COHORT_2},
            {"media_id": _COHORT_3},
            {"media_id": _COHORT_5},
        ],
    },
    "client_logos": {
        "clients": [
            {"name": "Hana Bank", "media_id": _HANA_BANK},
            {"name": "FWD Insurance", "media_id": _FWD},
            {"name": "AIA", "media_id": _AIA},
            {"name": "China Eastern Airlines", "media_id": _CHINA_EASTERN},
        ],
    },
    "founder": {
        "name": "Dr Benjamin Mah",
        "short_name": "DrM",
        "title": "Founder and Programme Director",
        "role": (
            "Dr Mah founded GameChanger Institute and directs the ARISE Leadership Transformation Programme "
            "Series: setting its standards, making every mentor match, and holding supervision and the "
            "escalation route."
        ),
        "feature": (
            "Featured in Singapore Tatler\u2019s August 2017 Master Minds issue: \u201cBenjamin Mah and other "
            "disrupters who are changing the way we live.\u201d"
        ),
        "portrait_media_id": _FOUNDER,
    },
    "stewards": {
        "title": "Stewards who have held the role",
        "body": (
            "GCI stewards are serving board members, CEOs, CFOs and CTOs. They teach from practice, convene "
            "small circles and meet each mentee one-to-one. Mentors are matched on the role the participant is "
            "aiming for and on the participant\u2019s own stated preferences."
        ),
    },
    "platforms": {
        "items": [
            {
                "name": "Global Leaders Roundtable",
                "body": (
                    "An invitation-only forum where influential decision-makers convene to explore actionable "
                    "solutions to today\u2019s most dynamic and complex global challenges."
                ),
                "media_id": _ROUNDTABLE,
            },
            {
                "name": "Keynote and Guest of Honour platform",
                "body": (
                    "Convening leaders and visionaries to explore actionable solutions, on stage and in the room."
                ),
                "media_id": _KEYNOTE,
            },
            {
                "name": "Structuring key partnerships",
                "body": (
                    "Partnerships that empower the advanced businesses of tomorrow, formalised and carried through."
                ),
                "media_id": _PARTNERSHIP,
            },
            {
                "name": "Media leaders features",
                "body": (
                    "Partnering with media and PR leaders to inform and share the solutions of tomorrow, made "
                    "available today."
                ),
                "media_id": _MEDIA_FEATURE,
            },
        ],
    },
    "patron": {
        "name": "Shawn Huang Wei Zhong",
        "role": "GCI Patron",
        "quote": (
            "We are in a position of strength. We must continue to invest and position ourselves to be "
            "resilient and relevant for the future."
        ),
        "media_id": _PATRON,
    },
}

_media_assets = sa.table(
    "media_assets",
    sa.column("id", sa.Uuid()),
    sa.column("kind", sa.Text()),
    sa.column("url", sa.Text()),
    sa.column("content_type", sa.Text()),
    sa.column("width", sa.Integer()),
    sa.column("height", sa.Integer()),
    sa.column("alt", sa.Text()),
    sa.column("title", sa.Text()),
    sa.column("created_by_sub", sa.Text()),
    sa.column("created_by_email", sa.Text()),
)

_content_blocks = sa.table(
    "content_blocks",
    sa.column("key", sa.Text()),
    sa.column("published", postgresql.JSONB()),
    sa.column("version", sa.Integer()),
    sa.column("published_at", sa.DateTime(timezone=True)),
    sa.column("published_by_email", sa.Text()),
)


def upgrade() -> None:
    op.bulk_insert(
        _media_assets,
        [
            {
                "id": uuid.UUID(media_id),
                "kind": "image",
                "url": url,
                "content_type": "image/webp",
                "width": width,
                "height": height,
                "alt": alt,
                "title": "",
                "created_by_sub": _SEED_SUB,
                "created_by_email": _SEED_EMAIL,
            }
            for media_id, url, width, height, alt in _IMAGES
        ],
    )
    op.bulk_insert(
        _content_blocks,
        [
            {
                "key": key,
                "published": data,
                "version": 1,
                "published_at": sa.func.now(),
                "published_by_email": _SEED_EMAIL,
            }
            for key, data in _BLOCKS.items()
        ],
        multiinsert=False,
    )


def downgrade() -> None:
    op.execute(sa.delete(_content_blocks).where(_content_blocks.c.key.in_(list(_BLOCKS))))
    op.execute(
        sa.delete(_media_assets).where(_media_assets.c.id.in_([uuid.UUID(media_id) for media_id, *_ in _IMAGES]))
    )
