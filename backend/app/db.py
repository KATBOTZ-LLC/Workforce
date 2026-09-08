"""PostgreSQL connection for the Workforce platform.

The application connects as the `wf_app` role, which deliberately does NOT own
the tables. That is what makes the append-only guarantee on AUDIT_LOG,
DOCUMENT_ACCESS_LOG, DATA_EXPORT_LOG and RETENTION_ACTION real: UPDATE and
DELETE are revoked from this role in db/migrations/80_security.sql, so no code
path — including a mistake in this codebase — can rewrite the audit trail.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

from .config import settings

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if settings.database_url is None:
        raise RuntimeError("DATABASE_URL is not set")
    if _engine is None:
        _engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
    return _engine


def postgres_configured() -> bool:
    return settings.database_url is not None


def rows(sql: str, **params: Any) -> list[dict]:
    """Run a read query and return plain dicts. Parameters are always bound, never
    interpolated, so nothing a caller supplies can alter the statement."""
    with get_engine().connect() as conn:
        result = conn.execute(text(sql), params)
        return [dict(r._mapping) for r in result]


def one(sql: str, **params: Any) -> dict | None:
    found = rows(sql, **params)
    return found[0] if found else None


def execute(sql: str, **params: Any) -> int:
    """Run a write inside its own transaction. Returns rows affected."""
    with get_engine().begin() as conn:
        return conn.execute(text(sql), params).rowcount


@contextmanager
def transaction() -> Iterator["Tx"]:
    """One transaction spanning several statements.

    Onboarding a worker writes to PERSON, PERSON_EMAIL, EMPLOYMENT,
    EMPLOYMENT_ASSIGNMENT, WORKER_DOCUMENT and ONBOARDING_TOKEN. Either all of
    it lands or none of it does — a person with no engagement, or an engagement
    with no checklist, would be a broken record that someone has to clean up by
    hand. Any exception rolls the whole thing back.
    """
    with get_engine().begin() as conn:
        yield Tx(conn)


class Tx:
    """A thin wrapper so callers inside a transaction use the same shape as the
    module-level helpers, without being able to accidentally commit early."""

    def __init__(self, conn: Connection):
        self._conn = conn

    def rows(self, sql: str, **params: Any) -> list[dict]:
        return [dict(r._mapping) for r in self._conn.execute(text(sql), params)]

    def one(self, sql: str, **params: Any) -> dict | None:
        found = self.rows(sql, **params)
        return found[0] if found else None

    def execute(self, sql: str, **params: Any) -> int:
        return self._conn.execute(text(sql), params).rowcount
