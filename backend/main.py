from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_db, init_db
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


@app.get("/api/categories")
def get_categories():
    conn = get_db()
    rows = conn.execute("SELECT DISTINCT categorie FROM question ORDER BY categorie").fetchall()
    conn.close()
    return [r["categorie"] for r in rows]


@app.get("/api/question")
def get_random_question(categorie: str = None):
    conn = get_db()
    if categorie:
        rows = conn.execute(
            "SELECT * FROM question WHERE categorie = ?", (categorie,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM question").fetchall()
    conn.close()

    if not rows:
        return {"error": "Aucune question trouvée"}

    q = dict(random.choice(rows))
    answers = [
        q["reponse_vrai"],
        q["reponse_fausse1"],
        q["reponse_fausse2"],
        q["reponse_fausse3"],
    ]
    random.shuffle(answers)

    return {
        "id": q["id_question"],
        "categorie": q["categorie"],
        "nb_point": q["nb_point"],
        "question": q["question"],
        "answers": answers,
        "correct": q["reponse_vrai"],
    }


@app.post("/api/answer")
def check_answer(payload: dict):
    question_id = payload.get("id")
    selected = payload.get("answer")

    conn = get_db()
    row = conn.execute(
        "SELECT reponse_vrai, nb_point FROM question WHERE id_question = ?",
        (question_id,),
    ).fetchone()
    conn.close()

    if not row:
        return {"error": "Question non trouvée"}

    correct = row["reponse_vrai"]
    is_correct = selected == correct
    return {
        "correct": is_correct,
        "correct_answer": correct,
        "points": row["nb_point"] if is_correct else 0,
    }
