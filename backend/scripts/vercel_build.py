"""Vercel build step: bring the database schema to head before a production deployment goes live.

Runs inside Vercel's build, which can reach the database. A failed migration fails the build,
so a deployment never serves code against a schema it does not match. Preview builds skip it.
"""

import os
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    environment = os.environ.get("VERCEL_ENV")
    if environment != "production":
        print(f"Skipping migrations for VERCEL_ENV={environment!r}.")
        return 0

    command.upgrade(Config(str(BACKEND_ROOT / "alembic.ini")), "head")
    print("Migrations applied.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
