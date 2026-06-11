"""Hachage de mots de passe (PBKDF2-SHA256) + hachage de jetons de session.

L'authentification admin par mot de passe partagé a été supprimée :
l'admin est un app_user avec role='admin' (voir user_auth.require_admin).

CLI : python backend/auth.py "mon-mot-de-passe"  ->  hash à mettre dans ADMIN_PASSWORD_HASH
"""

import base64
import hashlib
import hmac
import os
import secrets
import sys
from getpass import getpass

PBKDF2_ITERATIONS = int(os.environ.get("PASSWORD_HASH_ITERATIONS", "600000"))


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


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    password = sys.argv[1] if len(sys.argv) > 1 else getpass("Mot de passe admin: ")
    print(hash_password(password))
