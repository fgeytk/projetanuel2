import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def database_available() -> bool:
    try:
        import psycopg

        with psycopg.connect(
            os.environ.get("DATABASE_URL", "postgresql://quiz:quiz@localhost:5432/quiz"),
            connect_timeout=2,
        ):
            return True
    except Exception:
        return False


requires_db = pytest.mark.skipif(
    not database_available(),
    reason="PostgreSQL injoignable (lancer: docker compose up -d db)",
)
