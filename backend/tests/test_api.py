"""Tests d'intégration API (PostgreSQL requis — skip automatique sinon).

Couvre les parcours critiques : RBAC admin, auth, quiz, scores, votes.
"""

import uuid

import pytest
from conftest import requires_db
from fastapi.testclient import TestClient

pytestmark = requires_db


@pytest.fixture(scope="module")
def client():
    from main import app

    with TestClient(app) as test_client:
        yield test_client


def unique_pseudo(prefix="test"):
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def register(client, pseudo, password="motdepasse-solide"):
    return client.post("/api/auth/register", json={"pseudo": pseudo, "password": password})


def promote_to_admin(pseudo):
    from database import get_db

    with get_db() as conn:
        conn.execute("UPDATE app_user SET role = 'admin' WHERE pseudo = %s", (pseudo,))
        conn.commit()


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_admin_endpoints_require_session(client):
    client.cookies.clear()
    response = client.get("/api/admin/questions")
    assert response.status_code == 401


def test_admin_endpoints_reject_plain_user(client):
    client.cookies.clear()
    response = register(client, unique_pseudo("user"))
    assert response.status_code == 201
    assert response.json()["role"] == "user"

    response = client.get("/api/admin/questions")
    assert response.status_code == 403


def test_admin_role_grants_access_and_logout_invalidates(client):
    client.cookies.clear()
    pseudo = unique_pseudo("admin")
    assert register(client, pseudo).status_code == 201
    promote_to_admin(pseudo)

    # Le rôle est lu en base à chaque requête : pas besoin de nouvelle session.
    response = client.get("/api/admin/questions")
    assert response.status_code == 200

    me = client.get("/api/auth/me").json()
    assert me["user"]["role"] == "admin"

    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/admin/questions").status_code == 401


def test_register_login_me_flow(client):
    client.cookies.clear()
    pseudo = unique_pseudo("flow")
    assert register(client, pseudo).status_code == 201

    client.cookies.clear()
    assert client.get("/api/auth/me").json() == {"user": None}

    bad = client.post("/api/auth/login", json={"pseudo": pseudo, "password": "mauvais"})
    assert bad.status_code == 401

    good = client.post("/api/auth/login", json={"pseudo": pseudo, "password": "motdepasse-solide"})
    assert good.status_code == 200
    assert client.get("/api/auth/me").json()["user"]["pseudo"] == pseudo


def test_register_rejects_weak_password(client):
    client.cookies.clear()
    response = register(client, unique_pseudo("weak"), password="court")
    assert response.status_code == 422


def test_duplicate_pseudo_rejected_case_insensitive(client):
    client.cookies.clear()
    pseudo = unique_pseudo("dup")
    assert register(client, pseudo).status_code == 201
    client.cookies.clear()
    assert register(client, pseudo.upper()).status_code == 409


def test_quiz_question_and_answer_flow(client):
    question = client.get("/api/question").json()
    assert {"id", "prompt", "correctAnswer", "answers", "points"} <= set(question)

    result = client.post(
        "/api/answer",
        json={"id": question["id"], "answer": question["correctAnswer"]},
    ).json()
    assert result["correct"] is True
    assert result["points"] == question["points"]


def test_score_validation_rejects_cheat(client):
    client.cookies.clear()
    response = client.post(
        "/api/scores",
        json={
            "playerName": unique_pseudo("cheat"),
            "category": "Test",
            "score": 9999,
            "possibleScore": 10,
            "totalQuestions": 1,
            "correctAnswers": 1,
        },
    )
    assert response.status_code == 422


def test_score_and_leaderboard(client):
    client.cookies.clear()
    pseudo = unique_pseudo("score")
    response = client.post(
        "/api/scores",
        json={
            "playerName": pseudo,
            "category": "Test",
            "score": 10,
            "possibleScore": 20,
            "totalQuestions": 2,
            "correctAnswers": 1,
        },
    )
    assert response.status_code == 201
    leaderboard = client.get("/api/leaderboard?limit=100").json()
    assert any(item["playerName"] == pseudo for item in leaderboard)


def test_explanation_and_vote_flow(client):
    client.cookies.clear()
    question = client.get("/api/question").json()
    pseudo = unique_pseudo("expl")

    submitted = client.post(
        "/api/explanation",
        json={"id": question["id"], "playerName": pseudo, "explanation": f"Je pense que {question['correctAnswer']} est correct."},
    ).json()
    assert "explanationId" in submitted

    voted = client.post(
        f"/api/explanations/{submitted['explanationId']}/vote",
        json={"voterName": unique_pseudo("voter"), "approve": True},
    ).json()
    assert voted["approveVotes"] == 1
    assert voted["communityStatus"] == "pending"


def test_security_headers_present(client):
    response = client.get("/api/stats")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["cache-control"] == "no-store"
