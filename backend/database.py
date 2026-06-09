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
        create_question_table(conn)
        create_score_table(conn)
        create_admin_session_table(conn)
        count = conn.execute("SELECT COUNT(*) AS count FROM question").fetchone()["count"]
        if count == 0:
            seed_questions(conn)
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
            wrong_answer_3 TEXT NOT NULL
        )
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
                correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
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
                )
                for question in questions
            ],
        )
    conn.execute("SELECT setval(pg_get_serial_sequence('question', 'id'), COALESCE(MAX(id), 1)) FROM question")


def reset_db():
    with get_db() as conn:
        conn.execute("TRUNCATE question RESTART IDENTITY")
        seed_questions(conn)
        conn.commit()
        return list_questions(conn)


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
        "createdAt": row["created_at"].isoformat(),
    }


def list_questions(conn):
    rows = conn.execute("SELECT * FROM question ORDER BY id DESC").fetchall()
    return [row_to_question(row) for row in rows]


def list_scores(conn, limit=20):
    rows = conn.execute(
        """
        SELECT *
        FROM score
        ORDER BY score DESC, correct_answers DESC, total_questions ASC, created_at ASC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [row_to_score(row) for row in rows]
