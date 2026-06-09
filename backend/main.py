import os
import random

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .auth import clear_admin_session, create_admin_session, require_admin_session, verify_admin_password
except ImportError:
    from auth import clear_admin_session, create_admin_session, require_admin_session, verify_admin_password

try:
    from .database import get_db, init_db, list_questions, list_scores, reset_db, row_to_question, row_to_score
except ImportError:
    from database import get_db, init_db, list_questions, list_scores, reset_db, row_to_question, row_to_score


CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]


class AuthPayload(BaseModel):
    password: str = Field(..., min_length=1, max_length=256)


class AnswerPayload(BaseModel):
    id: int
    answer: str = Field(..., min_length=1, max_length=200)


class QuestionPayload(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    points: int = Field(..., ge=1, le=100)
    prompt: str = Field(..., min_length=1, max_length=500)
    correctAnswer: str = Field(..., min_length=1, max_length=200)
    wrongAnswers: list[str] = Field(..., min_length=3, max_length=3)


class ScorePayload(BaseModel):
    playerName: str = Field(..., min_length=2, max_length=40)
    category: str = Field(..., min_length=1, max_length=100)
    score: int = Field(..., ge=0)
    possibleScore: int = Field(..., ge=0)
    totalQuestions: int = Field(..., ge=1, le=50)
    correctAnswers: int = Field(..., ge=0, le=50)


app = FastAPI(title="Quiz Arena API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)

init_db()


def validate_question_payload(payload: QuestionPayload) -> QuestionPayload:
    cleaned_wrong_answers = [answer.strip() for answer in payload.wrongAnswers]
    if len(cleaned_wrong_answers) != 3 or any(not answer for answer in cleaned_wrong_answers):
        raise HTTPException(status_code=422, detail="Trois mauvaises reponses sont requises")

    return QuestionPayload(
        category=payload.category.strip(),
        points=payload.points,
        prompt=payload.prompt.strip(),
        correctAnswer=payload.correctAnswer.strip(),
        wrongAnswers=cleaned_wrong_answers,
    )


@app.get("/")
def root():
    return {"name": "Quiz Arena API", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/stats")
def get_stats():
    with get_db() as conn:
        category_rows = conn.execute(
            """
            SELECT category AS name, COUNT(*) AS count
            FROM question
            GROUP BY category
            ORDER BY category
            """
        ).fetchall()
        stats = conn.execute(
            "SELECT COUNT(*) AS question_count, COALESCE(SUM(points), 0) AS max_score FROM question"
        ).fetchone()
        score_stats = conn.execute(
            "SELECT COUNT(*) AS game_count, COALESCE(MAX(score), 0) AS best_score FROM score"
        ).fetchone()

    return {
        "questionCount": stats["question_count"],
        "maxScore": stats["max_score"],
        "gameCount": score_stats["game_count"],
        "bestScore": score_stats["best_score"],
        "categories": [{"name": row["name"], "count": row["count"]} for row in category_rows],
    }


@app.get("/api/categories")
def get_categories():
    with get_db() as conn:
        rows = conn.execute("SELECT DISTINCT category FROM question ORDER BY category").fetchall()

    return [row["category"] for row in rows]


@app.get("/api/question")
def get_random_question(categorie: str | None = None, exclude: str | None = None):
    excluded_ids = []
    if exclude:
        try:
            excluded_ids = [int(value) for value in exclude.split(",") if value.strip()]
        except ValueError:
            raise HTTPException(status_code=422, detail="Parametre exclude invalide")

    conditions = []
    params = []
    if categorie:
        conditions.append("category = %s")
        params.append(categorie)

    if excluded_ids:
        placeholders = ", ".join("%s" for _ in excluded_ids)
        conditions.append(f"id NOT IN ({placeholders})")
        params.extend(excluded_ids)

    where_clause = f" WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_db() as conn:
        row = conn.execute(
            f"SELECT * FROM question{where_clause} ORDER BY RANDOM() LIMIT 1",
            params,
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Aucune question trouvee")

    question = row_to_question(row)
    answers = [question["correctAnswer"], *question["wrongAnswers"]]
    random.shuffle(answers)

    return {
        "id": question["id"],
        "category": question["category"],
        "points": question["points"],
        "prompt": question["prompt"],
        "answers": answers,
    }


@app.post("/api/answer")
def check_answer(payload: AnswerPayload):
    with get_db() as conn:
        row = conn.execute(
            "SELECT correct_answer, points FROM question WHERE id = %s",
            (payload.id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Question non trouvee")

    correct = payload.answer == row["correct_answer"]
    return {
        "correct": correct,
        "correctAnswer": row["correct_answer"],
        "points": row["points"] if correct else 0,
    }


@app.get("/api/leaderboard")
def get_leaderboard(limit: int = 20):
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=422, detail="La limite doit etre entre 1 et 100")

    with get_db() as conn:
        return list_scores(conn, limit)


@app.post("/api/scores", status_code=201)
def create_score(payload: ScorePayload):
    player_name = payload.playerName.strip()
    category = payload.category.strip()

    if payload.correctAnswers > payload.totalQuestions:
        raise HTTPException(status_code=422, detail="Le nombre de bonnes reponses est invalide")
    if payload.score > payload.possibleScore and payload.possibleScore > 0:
        raise HTTPException(status_code=422, detail="Le score depasse le score possible")

    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO score (
                player_name, category, score, possible_score,
                total_questions, correct_answers
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                player_name,
                category,
                payload.score,
                payload.possibleScore,
                payload.totalQuestions,
                payload.correctAnswers,
            ),
        ).fetchone()

    return row_to_score(row)


@app.post("/api/admin/auth")
def authenticate(payload: AuthPayload, response: Response):
    if not verify_admin_password(payload.password):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    return create_admin_session(response)


@app.get("/api/admin/session")
def get_admin_session(_: dict = Depends(require_admin_session)):
    return {"authenticated": True}


@app.post("/api/admin/logout")
def logout_admin(response: Response, _: dict = Depends(clear_admin_session)):
    return {"authenticated": False}


@app.get("/api/admin/questions")
def admin_list_questions(_: dict = Depends(require_admin_session)):
    with get_db() as conn:
        return list_questions(conn)


@app.post("/api/admin/questions", status_code=201)
def admin_create_question(payload: QuestionPayload, _: dict = Depends(require_admin_session)):
    question = validate_question_payload(payload)

    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO question (
                category, points, prompt,
                correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                question.category,
                question.points,
                question.prompt,
                question.correctAnswer,
                question.wrongAnswers[0],
                question.wrongAnswers[1],
                question.wrongAnswers[2],
            ),
        )
        row = cursor.fetchone()

    return row_to_question(row)


@app.put("/api/admin/questions/{question_id}")
def admin_update_question(
    question_id: int,
    payload: QuestionPayload,
    _: dict = Depends(require_admin_session),
):
    question = validate_question_payload(payload)

    with get_db() as conn:
        cursor = conn.execute(
            """
            UPDATE question
            SET category = %s,
                points = %s,
                prompt = %s,
                correct_answer = %s,
                wrong_answer_1 = %s,
                wrong_answer_2 = %s,
                wrong_answer_3 = %s
            WHERE id = %s
            RETURNING *
            """,
            (
                question.category,
                question.points,
                question.prompt,
                question.correctAnswer,
                question.wrongAnswers[0],
                question.wrongAnswers[1],
                question.wrongAnswers[2],
                question_id,
            ),
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Question non trouvee")

        row = cursor.fetchone()

    return row_to_question(row)


@app.delete("/api/admin/questions/{question_id}", status_code=204)
def admin_delete_question(question_id: int, _: dict = Depends(require_admin_session)):
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM question WHERE id = %s", (question_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Question non trouvee")

    return Response(status_code=204)


@app.post("/api/admin/reset")
def admin_reset_questions(_: dict = Depends(require_admin_session)):
    return reset_db()


@app.post("/api/admin/import")
def admin_import_questions(payload: list[QuestionPayload], _: dict = Depends(require_admin_session)):
    questions = [validate_question_payload(question) for question in payload]
    if not questions:
        raise HTTPException(status_code=422, detail="Le fichier ne contient aucune question")

    with get_db() as conn:
        conn.execute("DELETE FROM question")
        with conn.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO question (
                    category, points, prompt,
                    correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        question.category,
                        question.points,
                        question.prompt,
                        question.correctAnswer,
                        question.wrongAnswers[0],
                        question.wrongAnswers[1],
                        question.wrongAnswers[2],
                    )
                    for question in questions
                ],
            )
        return list_questions(conn)
