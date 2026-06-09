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
        create_admin_session_table(conn)
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
