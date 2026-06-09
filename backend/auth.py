import base64
import hashlib
import hmac
import os
import secrets
import sys
from getpass import getpass
from typing import Annotated

from fastapi import Cookie, HTTPException, Response


SESSION_COOKIE_NAME = "quiz_admin_session"
SESSION_TTL_SECONDS = int(os.environ.get("ADMIN_SESSION_TTL_SECONDS", str(8 * 60 * 60)))
SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "lax")
PBKDF2_ITERATIONS = int(os.environ.get("ADMIN_PASSWORD_ITERATIONS", "600000"))
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH", "")


def hash_password(password: str, iterations: int = PBKDF2_ITERATIONS) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return ":".join(
        [
            "pbkdf2_sha256",
            str(iterations),
            base64.urlsafe_b64encode(salt).decode("utf-8").rstrip("="),
            base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("="),
        ]
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_raw, salt_raw, digest_raw = stored_hash.split(":", 3)
        if algorithm != "pbkdf2_sha256":
            return False

        iterations = int(iterations_raw)
        salt = decode_base64_url(salt_raw)
        expected = decode_base64_url(digest_raw)
    except (ValueError, TypeError):
        return False

    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(candidate, expected)


def decode_base64_url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def verify_admin_password(password: str) -> bool:
    if ADMIN_PASSWORD_HASH:
        return verify_password(password, ADMIN_PASSWORD_HASH)

    # Fallback for local development only. Production should set ADMIN_PASSWORD_HASH.
    fallback_password = os.environ.get("ADMIN_PASSWORD", "")
    return bool(fallback_password) and hmac.compare_digest(password, fallback_password)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_database_connection():
    try:
        from .database import get_db
    except ImportError:
        from database import get_db

    return get_db()


def create_admin_session(response: Response):
    token = secrets.token_urlsafe(48)
    token_hash = hash_session_token(token)

    with get_database_connection() as conn:
        cleanup_expired_sessions(conn)
        conn.execute(
            """
            INSERT INTO admin_session (token_hash, expires_at)
            VALUES (%s, NOW() + (%s * INTERVAL '1 second'))
            """,
            (token_hash, SESSION_TTL_SECONDS),
        )

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite=SESSION_COOKIE_SAMESITE,
        path="/api",
    )

    return {"authenticated": True, "expiresIn": SESSION_TTL_SECONDS}


def require_admin_session(
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
):
    if not session_token:
        raise HTTPException(status_code=401, detail="Session admin manquante")

    token_hash = hash_session_token(session_token)

    with get_database_connection() as conn:
        session = conn.execute(
            """
            SELECT id, expires_at
            FROM admin_session
            WHERE token_hash = %s AND expires_at > NOW()
            """,
            (token_hash,),
        ).fetchone()

        if not session:
            raise HTTPException(status_code=401, detail="Session admin invalide ou expiree")

        conn.execute(
            "UPDATE admin_session SET last_seen_at = NOW() WHERE id = %s",
            (session["id"],),
        )

    return {"role": "admin", "sessionId": session["id"]}


def clear_admin_session(
    response: Response,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
):
    if session_token:
        with get_database_connection() as conn:
            conn.execute(
                "DELETE FROM admin_session WHERE token_hash = %s",
                (hash_session_token(session_token),),
            )

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/api",
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite=SESSION_COOKIE_SAMESITE,
    )
    return {"authenticated": False}


def cleanup_expired_sessions(conn):
    conn.execute("DELETE FROM admin_session WHERE expires_at <= NOW()")


if __name__ == "__main__":
    password = sys.argv[1] if len(sys.argv) > 1 else getpass("Mot de passe admin: ")
    print(hash_password(password))
