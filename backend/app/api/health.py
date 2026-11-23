import asyncio
import logging
from typing import Final, Literal

from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from app.dependencies import EngineDep

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])

_CHECK_TIMEOUT_SECONDS: Final = 2

ComponentStatus = Literal["ok", "error"]


class Liveness(BaseModel):
    status: Literal["ok"] = "ok"


class Readiness(BaseModel):
    database: ComponentStatus


@router.get("/healthz")
async def healthz() -> Liveness:
    return Liveness()


@router.get("/readyz", responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": Readiness}})
async def readyz(engine: EngineDep, response: Response) -> Readiness:
    readiness = Readiness(database=await _check_database(engine))
    if readiness.database != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return readiness


async def _check_database(engine: AsyncEngine) -> ComponentStatus:
    try:
        async with asyncio.timeout(_CHECK_TIMEOUT_SECONDS), engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except (SQLAlchemyError, OSError, TimeoutError) as exc:
        logger.warning("database not ready", extra={"error": type(exc).__name__})
        return "error"
    return "ok"
