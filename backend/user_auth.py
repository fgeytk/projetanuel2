"""Sessions joueurs (cookie HttpOnly, jeton haché en base) + RBAC.

`require_admin` est LA porte d'entrée du back-office : session valide ET role='admin'.
"""

import os
import secrets
from typing import Annotated

from fastapi import Cookie, HTTPException, Response

try:
    from .auth import hash_session_token
except ImportError:
    from auth import hash_session_token


USER_SESSION_COOKIE_NAME = "quiz_user_session"
USER_SESSION_TTL_SECONDS = int(os.environ.get("USER_SESSION_TTL_SECONDS", str(30 * 24 * 60 * 60)))
SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "lax")


def get_database_connection():
    try:
        from .database import get_db
    except ImportError:
        from database import get_db

    return get_db()


def public_user(row) -> dict:
    return {
        "id": row["id"],
        "pseudo": row["pseudo"],
        "role": row.get("role", "user"),
        "avatarSeed": row.get("avatar_seed") or row["pseudo"],
        "email": row.get("email"),
    }


def create_user_session(response: Response, user_id: int):
    token = secrets.token_urlsafe(48)
    token_hash = hash_session_token(token)

    with get_database_connection() as conn:
        conn.execute("DELETE FROM user_session WHERE expires_at <= NOW()")
        conn.execute(
            """
            INSERT INTO user_session (user_id, token_hash, expires_at)
            VALUES (%s, %s, NOW() + (%s * INTERVAL '1 second'))
            """,
            (user_id, token_hash, USER_SESSION_TTL_SECONDS),
        )

    response.set_cookie(
        key=USER_SESSION_COOKIE_NAME,
        value=token,
        max_age=USER_SESSION_TTL_SECONDS,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite=SESSION_COOKIE_SAMESITE,
        path="/api",
    )


def _load_session_user(session_token: str | None):
    if not session_token:
        return None

    token_hash = hash_session_token(session_token)
    with get_database_connection() as conn:
        row = conn.execute(
            """
            SELECT app_user.*
            FROM user_session
            JOIN app_user ON app_user.id = user_session.user_id
            WHERE user_session.token_hash = %s AND user_session.expires_at > NOW()
            """,
            (token_hash,),
        ).fetchone()

        if not row:
            return None

        conn.execute(
            "UPDATE user_session SET last_seen_at = NOW() WHERE token_hash = %s",
            (token_hash,),
        )

    return row


def require_user_session(
    user_session: Annotated[str | None, Cookie(alias=USER_SESSION_COOKIE_NAME)] = None,
):
    row = _load_session_user(user_session)
    if not row:
        raise HTTPException(status_code=401, detail="Connecte-toi pour accéder à cette page")
    return public_user(row)


def require_admin(
    user_session: Annotated[str | None, Cookie(alias=USER_SESSION_COOKIE_NAME)] = None,
):
    """RBAC serveur : 401 sans session, 403 si la session n'est pas admin."""
    row = _load_session_user(user_session)
    if not row:
        raise HTTPException(status_code=401, detail="Connexion requise")
    if row.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return public_user(row)


def optional_user_session(
    user_session: Annotated[str | None, Cookie(alias=USER_SESSION_COOKIE_NAME)] = None,
):
    """Returns the logged-in player or None (guest mode allowed)."""
    row = _load_session_user(user_session)
    return public_user(row) if row else None


def clear_user_session(
    response: Response,
    user_session: Annotated[str | None, Cookie(alias=USER_SESSION_COOKIE_NAME)] = None,
):
    if user_session:
        with get_database_connection() as conn:
            conn.execute(
                "DELETE FROM user_session WHERE token_hash = %s",
                (hash_session_token(user_session),),
            )

    response.delete_cookie(
        key=USER_SESSION_COOKIE_NAME,
        path="/api",
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite=SESSION_COOKIE_SAMESITE,
    )
