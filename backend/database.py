import json
import logging
import os
import time
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

BASE_DIR = Path(__file__).resolve().parent
MIGRATIONS_DIR = BASE_DIR / "migrations"
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://quiz:quiz@localhost:5432/quiz")
SEED_PATH = Path(os.environ.get("QUIZ_SEED_PATH", BASE_DIR / "data" / "questions.seed.json"))

logger = logging.getLogger("quiz.db")


def get_db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def init_db():
    conn = connect_with_retry()
    try:
        run_migrations(conn)
        count = conn.execute("SELECT COUNT(*) AS count FROM question").fetchone()["count"]
        if count == 0:
            seed_questions(conn)
        sync_categories(conn)
        bootstrap_admin(conn)
        conn.commit()
    finally:
        conn.close()


def run_migrations(conn):
    """Applique les fichiers backend/migrations/*.sql dans l'ordre, une seule fois chacun."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migration (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    applied = {row["version"] for row in conn.execute("SELECT version FROM schema_migration").fetchall()}

    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if path.name in applied:
            continue
        logger.info("Applying migration %s", path.name)
        conn.execute(path.read_text(encoding="utf-8"))
        conn.execute("INSERT INTO schema_migration (version) VALUES (%s)", (path.name,))
    conn.commit()


def bootstrap_admin(conn):
    """Crée/promeut le compte admin depuis l'environnement (jamais de secret en dur).

    ADMIN_PSEUDO + ADMIN_PASSWORD_HASH (recommandé) ou ADMIN_PASSWORD (dev local).
    Sans ces variables, aucun admin n'est créé.
    """
    pseudo = os.environ.get("ADMIN_PSEUDO", "").strip()
    password_hash = os.environ.get("ADMIN_PASSWORD_HASH", "").strip()
    plain_password = os.environ.get("ADMIN_PASSWORD", "")

    if not pseudo:
        return
    if not password_hash and plain_password:
        try:
            from .auth import hash_password
        except ImportError:
            from auth import hash_password
        password_hash = hash_password(plain_password)
    if not password_hash:
        logger.warning("ADMIN_PSEUDO défini sans ADMIN_PASSWORD_HASH : compte admin non créé")
        return

    conn.execute(
        """
        INSERT INTO app_user (pseudo, password_hash, role, avatar_seed)
        VALUES (%s, %s, 'admin', %s)
        ON CONFLICT (pseudo) DO UPDATE
        SET password_hash = EXCLUDED.password_hash, role = 'admin'
        """,
        (pseudo, password_hash, pseudo),
    )
    logger.info("Compte admin '%s' prêt", pseudo)


def connect_with_retry(max_attempts=30, delay_seconds=1):
    last_error = None

    for _ in range(max_attempts):
        try:
            return get_db()
        except psycopg.OperationalError as error:
            last_error = error
            time.sleep(delay_seconds)

    raise RuntimeError("Connexion PostgreSQL impossible") from last_error


def seed_questions(conn):
    with SEED_PATH.open("r", encoding="utf-8") as seed_file:
        questions = json.load(seed_file)

    with conn.cursor() as cursor:
        cursor.executemany(
            """
            INSERT INTO question (
                id, category, points, prompt,
                correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3,
                explanation, explanation_keywords
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            [
                (
                    question["id"],
                    question["category"],
                    question["points"],
                    question["prompt"],
                    question["correctAnswer"],
                    question["wrongAnswers"][0],
                    question["wrongAnswers"][1],
                    question["wrongAnswers"][2],
                    default_explanation(question),
                    default_keywords(question),
                )
                for question in questions
            ],
        )
    conn.execute("SELECT setval(pg_get_serial_sequence('question', 'id'), COALESCE(MAX(id), 1)) FROM question")


def reset_db():
    with get_db() as conn:
        conn.execute("TRUNCATE question RESTART IDENTITY CASCADE")
        seed_questions(conn)
        sync_categories(conn)
        conn.commit()
        return list_questions(conn)


def default_explanation(question):
    return question.get("explanation") or f"La bonne reponse est {question['correctAnswer']}."


def default_keywords(question):
    keywords = question.get("explanationKeywords")
    if keywords:
        return keywords
    return [question["correctAnswer"].lower()]


def sync_categories(conn):
    conn.execute(
        """
        INSERT INTO category (name)
        SELECT DISTINCT category
        FROM question
        WHERE category <> ''
        ON CONFLICT (name) DO NOTHING
        """
    )


def row_to_question(row):
    return {
        "id": row["id"],
        "category": row["category"],
        "points": row["points"],
        "prompt": row["prompt"],
        "correctAnswer": row["correct_answer"],
        "wrongAnswers": [
            row["wrong_answer_1"],
            row["wrong_answer_2"],
            row["wrong_answer_3"],
        ],
        "explanation": row["explanation"],
        "explanationKeywords": row["explanation_keywords"] or [],
    }


def row_to_score(row):
    return {
        "id": row["id"],
        "playerName": row["player_name"],
        "category": row["category"],
        "score": row["score"],
        "possibleScore": row["possible_score"],
        "totalQuestions": row["total_questions"],
        "correctAnswers": row["correct_answers"],
        "donationPoints": row.get("donation_points", row["score"]),
        "createdAt": row["created_at"].isoformat(),
    }


def list_questions(conn):
    rows = conn.execute("SELECT * FROM question ORDER BY id DESC").fetchall()
    return [row_to_question(row) for row in rows]


def list_scores(conn, limit=20):
    rows = conn.execute(
        """
        SELECT
            quiz_attempt.id,
            app_user.pseudo AS player_name,
            quiz_attempt.category,
            quiz_attempt.score,
            quiz_attempt.possible_score,
            quiz_attempt.total_questions,
            quiz_attempt.correct_answers,
            quiz_attempt.donation_points,
            quiz_attempt.created_at
        FROM quiz_attempt
        JOIN app_user ON app_user.id = quiz_attempt.user_id
        ORDER BY score DESC, correct_answers DESC, total_questions ASC, created_at ASC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [row_to_score(row) for row in rows]


def list_categories(conn):
    rows = conn.execute("SELECT id, name FROM category ORDER BY name").fetchall()
    return [{"id": row["id"], "name": row["name"]} for row in rows]


def get_user_aggregates(conn, user_id):
    """Aggregate stats used both for the profile page and badge evaluation."""
    totals = conn.execute(
        """
        SELECT
            COUNT(*) AS games,
            COALESCE(MAX(score), 0) AS best_score,
            COALESCE(SUM(score), 0) AS total_score,
            COALESCE(SUM(donation_points), 0) AS donation_points,
            COALESCE(SUM(correct_answers), 0) AS correct_answers,
            COALESCE(SUM(total_questions), 0) AS total_questions,
            COUNT(DISTINCT category) AS distinct_categories,
            COUNT(*) FILTER (
                WHERE possible_score > 0 AND score >= possible_score
            ) AS perfect_games
        FROM quiz_attempt
        WHERE user_id = %s
        """,
        (user_id,),
    ).fetchone()

    accepted = conn.execute(
        """
        SELECT COUNT(*) AS accepted
        FROM (
            SELECT answer_explanation.id,
                COUNT(explanation_vote.id) FILTER (WHERE explanation_vote.approve) AS approve_votes,
                COUNT(explanation_vote.id) AS total_votes
            FROM answer_explanation
            LEFT JOIN explanation_vote
                ON explanation_vote.explanation_id = answer_explanation.id
            WHERE answer_explanation.user_id = %s
            GROUP BY answer_explanation.id
            HAVING COUNT(explanation_vote.id) >= 3
               AND COUNT(explanation_vote.id) FILTER (WHERE explanation_vote.approve)::float
                   / NULLIF(COUNT(explanation_vote.id), 0) >= 0.6
        ) AS accepted_explanations
        """,
        (user_id,),
    ).fetchone()

    total_categories = conn.execute(
        "SELECT COUNT(*) AS count FROM category"
    ).fetchone()["count"]

    return {
        "games": totals["games"],
        "bestScore": totals["best_score"],
        "totalScore": totals["total_score"],
        "donationPoints": totals["donation_points"],
        "correctAnswers": totals["correct_answers"],
        "totalQuestions": totals["total_questions"],
        "distinctCategories": totals["distinct_categories"],
        "perfectGames": totals["perfect_games"],
        "acceptedExplanations": accepted["accepted"],
        "totalCategories": total_categories,
    }


def list_user_attempts(conn, user_id, limit=10):
    rows = conn.execute(
        """
        SELECT id, category, score, possible_score, total_questions,
               correct_answers, donation_points, created_at
        FROM quiz_attempt
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (user_id, limit),
    ).fetchall()
    return [
        {
            "id": row["id"],
            "category": row["category"],
            "score": row["score"],
            "possibleScore": row["possible_score"],
            "totalQuestions": row["total_questions"],
            "correctAnswers": row["correct_answers"],
            "donationPoints": row["donation_points"],
            "createdAt": row["created_at"].isoformat(),
        }
        for row in rows
    ]


def list_user_badges(conn, user_id):
    rows = conn.execute(
        """
        SELECT badge_code, unlocked_at
        FROM user_badge
        WHERE user_id = %s
        ORDER BY unlocked_at ASC
        """,
        (user_id,),
    ).fetchall()
    return [
        {"code": row["badge_code"], "unlockedAt": row["unlocked_at"].isoformat()}
        for row in rows
    ]
