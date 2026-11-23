from dataclasses import dataclass
from datetime import timedelta


@dataclass(frozen=True, slots=True)
class FixedWindow:
    limit: int
    seconds: int

    @property
    def duration(self) -> timedelta:
        return timedelta(seconds=self.seconds)
