from dataclasses import dataclass

from redis.asyncio import Redis


@dataclass(frozen=True, slots=True)
class FixedWindow:
    limit: int
    seconds: int


async def count_hit(redis: Redis, key: str, window: FixedWindow) -> tuple[int, int]:
    """Counts one hit in the window that opened on the key's first hit; returns the count and seconds left."""
    async with redis.pipeline(transaction=True) as pipeline:
        pipeline.incr(key)
        pipeline.expire(key, window.seconds, nx=True)
        pipeline.ttl(key)
        count, _, ttl = await pipeline.execute()
    seconds_left = int(ttl)
    return int(count), seconds_left if seconds_left > 0 else window.seconds
