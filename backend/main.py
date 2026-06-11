import logging
import os
import random
import re
import unicodedata
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

try:
    from .auth import hash_password, verify_password
    from .badges import BADGES, BADGES_BY_CODE, evaluate_badges
    from .database import (
        get_db,
        get_user_aggregates,
        init_db,
        list_categories,
        list_questions,
        list_scores,
        list_user_attempts,
        list_user_badges,
        reset_db,
        row_to_question,
        row_to_score,
        sync_categories,
    )
    from .security import (
        RequestLogMiddleware,
        SecurityHeadersMiddleware,
        rate_limit,
        setup_logging,
    )
    from .user_auth import (
        clear_user_session,
        create_user_session,
        optional_user_session,
        public_user,
        require_admin,
        require_user_session,
    )
except ImportError:
    from auth import hash_password, verify_password
    from badges import BADGES, BADGES_BY_CODE, evaluate_badges
    from database import (
        get_db,
        get_user_aggregates,
        init_db,
        list_categories,
        list_questions,
        list_scores,
        list_user_attempts,
        list_user_badges,
        reset_db,
        row_to_question,
        row_to_score,
        sync_categories,
    )
    from security import (
        RequestLogMiddleware,
        SecurityHeadersMiddleware,
        rate_limit,
        setup_logging,
    )
    from user_auth import (
        clear_user_session,
        create_user_session,
        optional_user_session,
        public_user,
        require_admin,
        require_user_session,
    )


CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

logger = logging.getLogger("quiz.api")


class RegisterPayload(BaseModel):
    pseudo: str = Field(..., min_length=3, max_length=40, pattern=r"^[^\s<>\"'`;]+([ _-][^\s<>\"'`;]+)*$")
    password: str = Field(..., min_length=8, max_length=128)
    email: str | None = Field(None, max_length=160, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LoginPayload(BaseModel):
    pseudo: str = Field(..., min_length=2, max_length=40)
    password: str = Field(..., min_length=1, max_length=128)


class AnswerPayload(BaseModel):
    id: int
    answer: str = Field(..., min_length=1, max_length=200)


class ExplanationPayload(BaseModel):
    id: int
    playerName: str = Field(..., min_length=2, max_length=40)
    explanation: str = Field(..., min_length=8, max_length=800)


class QuestionPayload(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    points: int = Field(..., ge=1, le=100)
    prompt: str = Field(..., min_length=1, max_length=500)
    correctAnswer: str = Field(..., min_length=1, max_length=200)
    wrongAnswers: list[str] = Field(..., min_length=3, max_length=3)
    explanation: str = Field("", max_length=800)
    explanationKeywords: list[str] = Field(default_factory=list, max_length=8)


class CategoryPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ScorePayload(BaseModel):
    playerName: str = Field(..., min_length=2, max_length=40)
    category: str = Field(..., min_length=1, max_length=100)
    score: int = Field(..., ge=0)
    possibleScore: int = Field(..., ge=0)
    totalQuestions: int = Field(..., ge=1, le=50)
    correctAnswers: int = Field(..., ge=0, le=50)


class VotePayload(BaseModel):
    voterName: str = Field(..., min_length=2, max_length=40)
    approve: bool


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging(os.environ.get("LOG_LEVEL", "INFO"))
    init_db()
    logger.info("Quiz Arena API démarrée")
    yield


app = FastAPI(title="Quiz Arena API", docs_url=None, redoc_url=None, lifespan=lifespan)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(part) for part in first.get("loc", []) if part != "body")
    return JSONResponse(
        status_code=422,
        content={"detail": f"Données invalides ({field or 'corps de requête'})"},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(_, exc: Exception):
    logger.exception("Erreur interne", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Erreur interne du serveur"})


def validate_question_payload(payload: QuestionPayload) -> QuestionPayload:
    cleaned_wrong_answers = [answer.strip() for answer in payload.wrongAnswers]
    if len(cleaned_wrong_answers) != 3 or any(not answer for answer in cleaned_wrong_answers):
        raise HTTPException(status_code=422, detail="Trois mauvaises reponses sont requises")

    explanation = payload.explanation.strip() or f"La bonne reponse est {payload.correctAnswer.strip()}."
    keywords = [keyword.strip().lower() for keyword in payload.explanationKeywords if keyword.strip()]
    if not keywords:
        keywords = build_default_keywords(payload.correctAnswer)

    return QuestionPayload(
        category=payload.category.strip(),
        points=payload.points,
        prompt=payload.prompt.strip(),
        correctAnswer=payload.correctAnswer.strip(),
        wrongAnswers=cleaned_wrong_answers,
        explanation=explanation,
        explanationKeywords=keywords[:8],
    )


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower())
    without_accents = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", without_accents).strip()


def build_default_keywords(value: str) -> list[str]:
    words = [word for word in normalize_text(value).split() if len(word) >= 3]
    return words or [normalize_text(value)]


def validate_category_name(name: str) -> str:
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status_code=422, detail="Nom de categorie requis")
    return clean_name


def community_status(approve_votes: int, reject_votes: int) -> str:
    total_votes = approve_votes + reject_votes
    if total_votes < 3:
        return "pending"
    if approve_votes / total_votes >= 0.6:
        return "accepted"
    if reject_votes > approve_votes:
        return "rejected"
    return "pending"


def row_to_public_explanation(row):
    approve_votes = row["approve_votes"] or 0
    reject_votes = row["reject_votes"] or 0
    total_votes = approve_votes + reject_votes
    status = community_status(approve_votes, reject_votes)

    return {
        "id": row["id"],
        "playerName": row["player_name"],
        "category": row["category"],
        "questionPrompt": row["question_prompt"],
        "correctAnswer": row["correct_answer"],
        "explanation": row["explanation"],
        "automaticCorrect": row["automatic_correct"],
        "proposedPoints": row["proposed_points"],
        "validatedPoints": row["proposed_points"] if status == "accepted" else 0,
        "approveVotes": approve_votes,
        "rejectVotes": reject_votes,
        "totalVotes": total_votes,
        "communityStatus": status,
        "createdAt": row["created_at"].isoformat(),
    }


def award_user_badges(conn, user_id):
    """Evaluate badges from current stats and persist newly earned ones.

    Returns the list of badge definitions unlocked during this call (for toasts).
    """
    stats = get_user_aggregates(conn, user_id)
    earned_codes = evaluate_badges(stats)
    if not earned_codes:
        return []

    new_codes = []
    for code in earned_codes:
        inserted = conn.execute(
            """
            INSERT INTO user_badge (user_id, badge_code)
            VALUES (%s, %s)
            ON CONFLICT (user_id, badge_code) DO NOTHING
            RETURNING badge_code
            """,
            (user_id, code),
        ).fetchone()
        if inserted:
            new_codes.append(code)

    return [BADGES_BY_CODE[code] for code in new_codes if code in BADGES_BY_CODE]


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
            """
            SELECT
                COUNT(*) AS game_count,
                COALESCE(MAX(score), 0) AS best_score,
                COALESCE(SUM(donation_points), 0) AS donation_points
            FROM quiz_attempt
            """
        ).fetchone()
        community_stats = conn.execute(
            """
            SELECT
                COUNT(DISTINCT answer_explanation.id) AS explanation_count,
                COUNT(explanation_vote.id) AS vote_count
            FROM answer_explanation
            LEFT JOIN explanation_vote
                ON explanation_vote.explanation_id = answer_explanation.id
            """
        ).fetchone()

    return {
        "questionCount": stats["question_count"],
        "maxScore": stats["max_score"],
        "gameCount": score_stats["game_count"],
        "bestScore": score_stats["best_score"],
        "donationPoints": score_stats["donation_points"],
        "explanationCount": community_stats["explanation_count"],
        "voteCount": community_stats["vote_count"],
        "categories": [{"name": row["name"], "count": row["count"]} for row in category_rows],
    }


@app.get("/api/categories")
def get_categories():
    with get_db() as conn:
        rows = conn.execute("SELECT name FROM category ORDER BY name").fetchall()

    return [row["name"] for row in rows]


@app.get("/api/question")
def get_random_question(categorie: str | None = None, exclude: str | None = None):
    excluded_ids = []
    if exclude:
        try:
            excluded_ids = [int(value) for value in exclude.split(",") if value.strip()]
        except ValueError:
            raise HTTPException(status_code=422, detail="Parametre exclude invalide") from None

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
        "correctAnswer": question["correctAnswer"],
        "explanation": question["explanation"],
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


@app.post("/api/explanation", dependencies=[rate_limit("explanation", 30, 60)])
def check_explanation(payload: ExplanationPayload, current_user: dict | None = Depends(optional_user_session)):
    player_name = current_user["pseudo"] if current_user else payload.playerName.strip()

    with get_db() as conn:
        row = conn.execute(
            """
            SELECT id, category, prompt, correct_answer, points, explanation, explanation_keywords
            FROM question
            WHERE id = %s
            """,
            (payload.id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Question non trouvee")

        keywords = row["explanation_keywords"] or build_default_keywords(row["correct_answer"])
        normalized_explanation = normalize_text(payload.explanation)
        matched = [
            keyword
            for keyword in keywords
            if normalize_text(keyword) and normalize_text(keyword) in normalized_explanation
        ]
        required_matches = 1 if len(keywords) <= 2 else 2
        is_valid = len(matched) >= required_matches

        if current_user:
            user = {"id": current_user["id"]}
        else:
            user = conn.execute(
                """
                INSERT INTO app_user (pseudo)
                VALUES (%s)
                ON CONFLICT (pseudo) DO UPDATE SET pseudo = EXCLUDED.pseudo
                RETURNING id
                """,
                (player_name,),
            ).fetchone()
        public_explanation = conn.execute(
            """
            INSERT INTO answer_explanation (
                user_id, question_id, player_name, category, question_prompt,
                correct_answer, explanation, automatic_correct, proposed_points
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                user["id"],
                row["id"],
                player_name,
                row["category"],
                row["prompt"],
                row["correct_answer"],
                payload.explanation.strip(),
                is_valid,
                row["points"],
            ),
        ).fetchone()

    return {
        "correct": is_valid,
        "correctAnswer": row["correct_answer"],
        "points": row["points"] if is_valid else 0,
        "proposedPoints": row["points"],
        "expectedExplanation": row["explanation"],
        "explanationId": public_explanation["id"],
        "matchedKeywords": matched,
        "requiredMatches": required_matches,
        "communityStatus": "pending",
    }


@app.get("/api/explanations")
def get_public_explanations(limit: int = 24):
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=422, detail="La limite doit etre entre 1 et 100")

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT
                answer_explanation.*,
                COUNT(explanation_vote.id) FILTER (WHERE explanation_vote.approve = TRUE) AS approve_votes,
                COUNT(explanation_vote.id) FILTER (WHERE explanation_vote.approve = FALSE) AS reject_votes
            FROM answer_explanation
            LEFT JOIN explanation_vote
                ON explanation_vote.explanation_id = answer_explanation.id
            GROUP BY answer_explanation.id
            ORDER BY answer_explanation.created_at DESC
            LIMIT %s
            """,
            (limit,),
        ).fetchall()

    return [row_to_public_explanation(row) for row in rows]


@app.post("/api/explanations/{explanation_id}/vote", dependencies=[rate_limit("vote", 30, 60)])
def vote_public_explanation(explanation_id: int, payload: VotePayload):
    voter_name = payload.voterName.strip()

    with get_db() as conn:
        explanation = conn.execute(
            "SELECT id FROM answer_explanation WHERE id = %s",
            (explanation_id,),
        ).fetchone()
        if not explanation:
            raise HTTPException(status_code=404, detail="Explication non trouvee")

        conn.execute(
            """
            INSERT INTO explanation_vote (explanation_id, voter_name, approve)
            VALUES (%s, %s, %s)
            ON CONFLICT (explanation_id, voter_name)
            DO UPDATE SET approve = EXCLUDED.approve, created_at = NOW()
            """,
            (explanation_id, voter_name, payload.approve),
        )
        row = conn.execute(
            """
            SELECT
                answer_explanation.*,
                COUNT(explanation_vote.id) FILTER (WHERE explanation_vote.approve = TRUE) AS approve_votes,
                COUNT(explanation_vote.id) FILTER (WHERE explanation_vote.approve = FALSE) AS reject_votes
            FROM answer_explanation
            LEFT JOIN explanation_vote
                ON explanation_vote.explanation_id = answer_explanation.id
            WHERE answer_explanation.id = %s
            GROUP BY answer_explanation.id
            """,
            (explanation_id,),
        ).fetchone()

    return row_to_public_explanation(row)


@app.get("/api/leaderboard")
def get_leaderboard(limit: int = 20):
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=422, detail="La limite doit etre entre 1 et 100")

    with get_db() as conn:
        return list_scores(conn, limit)


@app.get("/api/progress")
def get_progress_by_category():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT
                category,
                COUNT(*) AS games,
                COALESCE(MAX(score), 0) AS best_score,
                ROUND(COALESCE(AVG(score), 0), 2) AS average_score,
                COALESCE(SUM(donation_points), 0) AS donation_points
            FROM quiz_attempt
            GROUP BY category
            ORDER BY best_score DESC, category ASC
            """
        ).fetchall()

    return [
        {
            "category": row["category"],
            "games": row["games"],
            "bestScore": row["best_score"],
            "averageScore": float(row["average_score"]),
            "donationPoints": row["donation_points"],
        }
        for row in rows
    ]


@app.post("/api/scores", status_code=201, dependencies=[rate_limit("scores", 20, 60)])
def create_score(payload: ScorePayload, current_user: dict | None = Depends(optional_user_session)):
    player_name = current_user["pseudo"] if current_user else payload.playerName.strip()
    category = payload.category.strip()

    if payload.correctAnswers > payload.totalQuestions:
        raise HTTPException(status_code=422, detail="Le nombre de bonnes reponses est invalide")
    if payload.possibleScore > 0 and payload.score > payload.possibleScore:
        raise HTTPException(status_code=422, detail="Le score depasse le score possible")
    if payload.possibleScore == 0 and payload.score > 0:
        raise HTTPException(status_code=422, detail="Score incoherent")

    donation_points = payload.score

    with get_db() as conn:
        if current_user:
            user = {"id": current_user["id"]}
        else:
            user = conn.execute(
                """
                INSERT INTO app_user (pseudo)
                VALUES (%s)
                ON CONFLICT (pseudo) DO UPDATE SET pseudo = EXCLUDED.pseudo
                RETURNING id
                """,
                (player_name,),
            ).fetchone()
        row = conn.execute(
            """
            INSERT INTO quiz_attempt (
                user_id, category, score, possible_score,
                total_questions, correct_answers, donation_points
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user["id"],
                category,
                payload.score,
                payload.possibleScore,
                payload.totalQuestions,
                payload.correctAnswers,
                donation_points,
            ),
        ).fetchone()

        row["player_name"] = player_name
        new_badges = award_user_badges(conn, user["id"]) if current_user else []

    result = row_to_score(row)
    result["newBadges"] = new_badges
    return result


@app.get("/api/badges")
def list_badge_catalogue():
    return BADGES


@app.post("/api/auth/register", status_code=201, dependencies=[rate_limit("register", 10, 3600)])
def register_user(payload: RegisterPayload, response: Response):
    pseudo = payload.pseudo.strip()
    email = payload.email.strip() if payload.email else None
    if not pseudo:
        raise HTTPException(status_code=422, detail="Pseudo requis")

    password_hash = hash_password(payload.password)

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id, password_hash FROM app_user WHERE LOWER(pseudo) = LOWER(%s)",
            (pseudo,),
        ).fetchone()

        if existing and existing["password_hash"]:
            raise HTTPException(status_code=409, detail="Ce pseudo est déjà pris")

        if existing:
            # Claim a pseudo previously used in guest mode (no password yet).
            row = conn.execute(
                """
                UPDATE app_user
                SET password_hash = %s, email = COALESCE(%s, email),
                    avatar_seed = COALESCE(avatar_seed, %s)
                WHERE id = %s
                RETURNING *
                """,
                (password_hash, email, pseudo, existing["id"]),
            ).fetchone()
        else:
            row = conn.execute(
                """
                INSERT INTO app_user (pseudo, email, password_hash, avatar_seed)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (pseudo, email, password_hash, pseudo),
            ).fetchone()

    create_user_session(response, row["id"])
    return public_user(row)


@app.post("/api/auth/login", dependencies=[rate_limit("login", 10, 300)])
def login_user(payload: LoginPayload, response: Response):
    pseudo = payload.pseudo.strip()

    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM app_user WHERE LOWER(pseudo) = LOWER(%s)",
            (pseudo,),
        ).fetchone()

    if not row or not row["password_hash"] or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Pseudo ou mot de passe incorrect")

    create_user_session(response, row["id"])
    return public_user(row)


@app.get("/api/auth/me")
def get_me(current_user: dict | None = Depends(optional_user_session)):
    if not current_user:
        return {"user": None}
    return {"user": current_user}


@app.post("/api/auth/logout")
def logout_user(response: Response, _: None = Depends(clear_user_session)):
    return {"user": None}


@app.get("/api/profile")
def get_profile(current_user: dict = Depends(require_user_session)):
    with get_db() as conn:
        # Re-evaluate badges so community-dependent ones (e.g. accepted explanations) appear.
        award_user_badges(conn, current_user["id"])
        stats = get_user_aggregates(conn, current_user["id"])
        attempts = list_user_attempts(conn, current_user["id"])
        earned = list_user_badges(conn, current_user["id"])
        progress_rows = conn.execute(
            """
            SELECT category,
                   COUNT(*) AS games,
                   COALESCE(MAX(score), 0) AS best_score,
                   COALESCE(SUM(donation_points), 0) AS donation_points
            FROM quiz_attempt
            WHERE user_id = %s
            GROUP BY category
            ORDER BY best_score DESC, category ASC
            """,
            (current_user["id"],),
        ).fetchall()

    earned_codes = {item["code"] for item in earned}
    badges = [
        {**badge, "unlocked": badge["code"] in earned_codes}
        for badge in BADGES
    ]

    return {
        "user": current_user,
        "stats": stats,
        "attempts": attempts,
        "badges": badges,
        "progress": [
            {
                "category": row["category"],
                "games": row["games"],
                "bestScore": row["best_score"],
                "donationPoints": row["donation_points"],
            }
            for row in progress_rows
        ],
    }


# ---------------------------------------------------------------------------
# Back-office : tous les endpoints exigent une session utilisateur role='admin'.
# Plus aucun mot de passe admin partagé ni session admin séparée.
# ---------------------------------------------------------------------------


@app.get("/api/admin/questions")
def admin_list_questions(_: dict = Depends(require_admin)):
    with get_db() as conn:
        return list_questions(conn)


@app.get("/api/admin/categories")
def admin_list_categories(_: dict = Depends(require_admin)):
    with get_db() as conn:
        sync_categories(conn)
        return list_categories(conn)


@app.post("/api/admin/categories", status_code=201)
def admin_create_category(payload: CategoryPayload, _: dict = Depends(require_admin)):
    name = validate_category_name(payload.name)

    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO category (name)
            VALUES (%s)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id, name
            """,
            (name,),
        ).fetchone()

    return {"id": row["id"], "name": row["name"]}


@app.put("/api/admin/categories/{category_id}")
def admin_update_category(
    category_id: int,
    payload: CategoryPayload,
    _: dict = Depends(require_admin),
):
    name = validate_category_name(payload.name)

    with get_db() as conn:
        current = conn.execute("SELECT name FROM category WHERE id = %s", (category_id,)).fetchone()
        if not current:
            raise HTTPException(status_code=404, detail="Categorie non trouvee")

        duplicate = conn.execute(
            "SELECT id FROM category WHERE name = %s AND id <> %s",
            (name, category_id),
        ).fetchone()
        if duplicate:
            raise HTTPException(status_code=409, detail="Categorie deja existante")

        row = conn.execute(
            """
            UPDATE category
            SET name = %s
            WHERE id = %s
            RETURNING id, name
            """,
            (name, category_id),
        ).fetchone()
        conn.execute(
            "UPDATE question SET category = %s WHERE category = %s",
            (name, current["name"]),
        )

    return {"id": row["id"], "name": row["name"]}


@app.delete("/api/admin/categories/{category_id}", status_code=204)
def admin_delete_category(category_id: int, _: dict = Depends(require_admin)):
    with get_db() as conn:
        category = conn.execute("SELECT name FROM category WHERE id = %s", (category_id,)).fetchone()
        if not category:
            raise HTTPException(status_code=404, detail="Categorie non trouvee")

        used = conn.execute(
            "SELECT COUNT(*) AS count FROM question WHERE category = %s",
            (category["name"],),
        ).fetchone()["count"]
        if used:
            raise HTTPException(status_code=409, detail="Categorie utilisee par des questions")

        conn.execute("DELETE FROM category WHERE id = %s", (category_id,))

    return Response(status_code=204)


@app.post("/api/admin/questions", status_code=201)
def admin_create_question(payload: QuestionPayload, _: dict = Depends(require_admin)):
    question = validate_question_payload(payload)

    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO question (
                category, points, prompt,
                correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3,
                explanation, explanation_keywords
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                question.explanation,
                question.explanationKeywords,
            ),
        )
        row = cursor.fetchone()
        sync_categories(conn)

    return row_to_question(row)


@app.put("/api/admin/questions/{question_id}")
def admin_update_question(
    question_id: int,
    payload: QuestionPayload,
    _: dict = Depends(require_admin),
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
                wrong_answer_3 = %s,
                explanation = %s,
                explanation_keywords = %s
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
                question.explanation,
                question.explanationKeywords,
                question_id,
            ),
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Question non trouvee")

        row = cursor.fetchone()
        sync_categories(conn)

    return row_to_question(row)


@app.delete("/api/admin/questions/{question_id}", status_code=204)
def admin_delete_question(question_id: int, _: dict = Depends(require_admin)):
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM question WHERE id = %s", (question_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Question non trouvee")

    return Response(status_code=204)


@app.post("/api/admin/reset")
def admin_reset_questions(_: dict = Depends(require_admin)):
    return reset_db()


@app.post("/api/admin/import")
def admin_import_questions(payload: list[QuestionPayload], _: dict = Depends(require_admin)):
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
                    correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3,
                    explanation, explanation_keywords
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                        question.explanation,
                        question.explanationKeywords,
                    )
                    for question in questions
                ],
            )
        sync_categories(conn)
        return list_questions(conn)
