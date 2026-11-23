import time
from collections.abc import Callable


class Cadence:
    """Says when a periodic chore is due in this process: on first ask, then at most once per interval."""

    def __init__(self, interval_seconds: float, *, clock: Callable[[], float] = time.monotonic) -> None:
        self._interval_seconds = interval_seconds
        self._clock = clock
        self._last_run: float | None = None

    def due(self) -> bool:
        now = self._clock()
        if self._last_run is not None and now - self._last_run < self._interval_seconds:
            return False
        self._last_run = now
        return True
