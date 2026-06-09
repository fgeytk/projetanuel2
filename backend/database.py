import json
import os
import time
from pathlib import Path

import psycopg
from psycopg.rows import dict_row


BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://quiz:quiz@localhost:5432/quiz")
SEED_PATH = Path(os.environ.get("QUIZ_SEED_PATH", BASE_DIR / "data" / "questions.seed.json"))


def get_db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def init_db():
    conn = connect_with_retry()
    try:
        create_category_table(conn)
        create_user_table(conn)
        ensure_user_columns(conn)
        create_question_table(conn)
        ensure_question_learning_columns(conn)
        create_score_table(conn)
        create_quiz_attempt_table(conn)
        create_answer_explanation_table(conn)
        create_explanation_vote_table(conn)
        create_admin_session_table(conn)
        create_user_session_table(conn)
        create_user_badge_table(conn)
        count = conn.execute("SELECT COUNT(*) AS count FROM question").fetchone()["count"]
        if count == 0:
            seed_questions(conn)
        sync_categories(conn)
        conn.commit()
    finally:
        conn.close()


def connect_with_retry(max_attempts=30, delay_seconds=1):
    last_error = None

    for _ in range(max_attempts):
        try:
            return get_db()
        except psycopg.OperationalError as error:
            last_error = error
            time.sleep(delay_seconds)

    raise RuntimeError("Connexion PostgreSQL impossible") from last_error


def create_question_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS question (
            id SERIAL PRIMARY KEY,
            category TEXT NOT NULL,
            points INTEGER NOT NULL CHECK (points > 0),
            prompt TEXT NOT NULL,
            correct_answer TEXT NOT NULL,
            wrong_answer_1 TEXT NOT NULL,
            wrong_answer_2 TEXT NOT NULL,
            wrong_answer_3 TEXT NOT NULL,
            explanation TEXT NOT NULL DEFAULT '',
            explanation_keywords TEXT[] NOT NULL DEFAULT '{}'
        )
        """
    )


def create_category_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS category (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def create_user_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS app_user (
            id SERIAL PRIMARY KEY,
            pseudo TEXT NOT NULL UNIQUE,
            email TEXT,
            role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
            email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def ensure_user_columns(conn):
    conn.execute("ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email TEXT")
    conn.execute("ALTER TABLE app_user ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'")
    conn.execute("ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE")
    conn.execute("ALTER TABLE app_user ADD COLUMN IF NOT EXISTS password_hash TEXT")
    conn.execute("ALTER TABLE app_user ADD COLUMN IF NOT EXISTS avatar_seed TEXT")
    # Backfill an avatar seed for accounts created before this column existed.
    conn.execute("UPDATE app_user SET avatar_seed = pseudo WHERE avatar_seed IS NULL")
    conn.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_email
        ON app_user (email)
        WHERE email IS NOT NULL
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user (role)")
    conn.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'app_user_role_check'
            ) THEN
                ALTER TABLE app_user
                ADD CONSTRAINT app_user_role_check CHECK (role IN ('user', 'admin'));
            END IF;
        END $$;
        """
    )


def ensure_question_learning_columns(conn):
    conn.execute("ALTER TABLE question ADD COLUMN IF NOT EXISTS explanation TEXT NOT NULL DEFAULT ''")
    conn.execute("ALTER TABLE question ADD COLUMN IF NOT EXISTS explanation_keywords TEXT[] NOT NULL DEFAULT '{}'")
    conn.execute(
        """
        UPDATE question
        SET explanation = CONCAT('La bonne reponse est ', correct_answer, '.'),
            explanation_keywords = ARRAY[LOWER(correct_answer)]
        WHERE explanation = '' OR explanation_keywords = '{}'
        """
    )


def create_score_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS score (
            id SERIAL PRIMARY KEY,
            player_name TEXT NOT NULL,
            category TEXT NOT NULL,
            score INTEGER NOT NULL CHECK (score >= 0),
            possible_score INTEGER NOT NULL CHECK (possible_score >= 0),
            total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
            correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def create_quiz_attempt_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS quiz_attempt (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
            category TEXT NOT NULL,
            score INTEGER NOT NULL CHECK (score >= 0),
            possible_score INTEGER NOT NULL CHECK (possible_score >= 0),
            total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
            correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
            donation_points INTEGER NOT NULL CHECK (donation_points >= 0),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def create_answer_explanation_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS answer_explanation (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES app_user(id) ON DELETE SET NULL,
            question_id INTEGER NOT NULL REFERENCES question(id) ON DELETE CASCADE,
            player_name TEXT NOT NULL,
            category TEXT NOT NULL,
            question_prompt TEXT NOT NULL,
            correct_answer TEXT NOT NULL,
            explanation TEXT NOT NULL,
            automatic_correct BOOLEAN NOT NULL DEFAULT FALSE,
            proposed_points INTEGER NOT NULL CHECK (proposed_points >= 0),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_answer_explanation_created_at
        ON answer_explanation (created_at DESC)
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_answer_explanation_question_id
        ON answer_explanation (question_id)
        """
    )


def create_explanation_vote_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS explanation_vote (
            id SERIAL PRIMARY KEY,
            explanation_id INTEGER NOT NULL REFERENCES answer_explanation(id) ON DELETE CASCADE,
            voter_name TEXT NOT NULL,
            approve BOOLEAN NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (explanation_id, voter_name)
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_explanation_vote_explanation_id
        ON explanation_vote (explanation_id)
        """
    )


def create_admin_session_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_session (
            id SERIAL PRIMARY KEY,
            token_hash TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_admin_session_expires_at
        ON admin_session (expires_at)
        """
    )


def create_user_session_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_session (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_session_expires_at ON user_session (expires_at)"
    )


def create_user_badge_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_badge (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
            badge_code TEXT NOT NULL,
            unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (user_id, badge_code)
        )
        """
    )


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
        conn.execute("TRUNCATE question RESTART IDENTITY")
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
