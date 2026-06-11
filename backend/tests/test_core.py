"""Tests unitaires purs (aucune base de données requise)."""

import time

from auth import hash_password, hash_session_token, verify_password
from badges import evaluate_badges
from main import build_default_keywords, community_status, normalize_text
from security import SlidingWindowLimiter


def test_normalize_text_strips_accents_and_symbols():
    assert normalize_text("Élément, déjà-vu !") == "element deja vu"
    assert normalize_text("PARIS") == "paris"


def test_build_default_keywords_filters_short_words():
    assert build_default_keywords("La Tour Eiffel") == ["tour", "eiffel"]
    assert build_default_keywords("ab") == ["ab"]


def test_community_status_thresholds():
    assert community_status(0, 0) == "pending"
    assert community_status(2, 0) == "pending"  # < 3 votes
    assert community_status(3, 0) == "accepted"
    assert community_status(2, 1) == "accepted"  # 66 %
    assert community_status(1, 2) == "rejected"
    assert community_status(2, 2) == "pending"  # 50 %, pas de majorité


def test_password_hash_roundtrip():
    stored = hash_password("correct horse battery staple", iterations=1000)
    assert stored.startswith("pbkdf2_sha256:1000:")
    assert verify_password("correct horse battery staple", stored)
    assert not verify_password("wrong", stored)
    assert not verify_password("x", "garbage")


def test_session_token_hash_is_stable_sha256():
    assert hash_session_token("abc") == hash_session_token("abc")
    assert len(hash_session_token("abc")) == 64


def test_badges_evaluation():
    none = evaluate_badges({"games": 0})
    assert none == []

    full = evaluate_badges(
        {
            "games": 12,
            "perfectGames": 1,
            "totalCategories": 3,
            "distinctCategories": 3,
            "donationPoints": 150,
            "acceptedExplanations": 2,
        }
    )
    assert set(full) == {"first_game", "streak_10", "perfect", "polyglot", "donor_100", "accepted_explainer"}


def test_rate_limiter_blocks_then_recovers():
    limiter = SlidingWindowLimiter()
    assert limiter.allow("k", 2, 0.2)
    assert limiter.allow("k", 2, 0.2)
    assert not limiter.allow("k", 2, 0.2)
    time.sleep(0.25)
    assert limiter.allow("k", 2, 0.2)
