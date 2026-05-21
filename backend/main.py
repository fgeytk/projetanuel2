from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from database import get_db, init_db
import random


class QuestionPayload(BaseModel):
    categorie: str = Field(..., min_length=1)
    nb_point: int = Field(..., ge=1)
    question: str = Field(..., min_length=1)
    reponse_vrai: str = Field(..., min_length=1)
    reponse_fausse1: str = Field(..., min_length=1)
    reponse_fausse2: str = Field(..., min_length=1)
    reponse_fausse3: str = Field(..., min_length=1)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


def row_to_question(row):
    return {
        "id": row["id_question"],
        "categorie": row["categorie"],
        "nb_point": row["nb_point"],
        "question": row["question"],
        "reponse_vrai": row["reponse_vrai"],
        "reponse_fausse1": row["reponse_fausse1"],
        "reponse_fausse2": row["reponse_fausse2"],
        "reponse_fausse3": row["reponse_fausse3"],
    }


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


@app.get("/api/admin/questions")
def list_questions():
    conn = get_db()
    rows = conn.execute(
        """
        SELECT *
        FROM question
        ORDER BY id_question DESC
        """
    ).fetchall()
    conn.close()
    return [row_to_question(row) for row in rows]


@app.post("/api/admin/questions", status_code=201)
def create_question(payload: QuestionPayload):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO question (
            categorie,
            nb_point,
            question,
            reponse_vrai,
            reponse_fausse1,
            reponse_fausse2,
            reponse_fausse3
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload.categorie.strip(),
            payload.nb_point,
            payload.question.strip(),
            payload.reponse_vrai.strip(),
            payload.reponse_fausse1.strip(),
            payload.reponse_fausse2.strip(),
            payload.reponse_fausse3.strip(),
        ),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM question WHERE id_question = ?",
        (cur.lastrowid,),
    ).fetchone()
    conn.close()
    return row_to_question(row)


@app.put("/api/admin/questions/{question_id}")
def update_question(question_id: int, payload: QuestionPayload):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE question
        SET
            categorie = ?,
            nb_point = ?,
            question = ?,
            reponse_vrai = ?,
            reponse_fausse1 = ?,
            reponse_fausse2 = ?,
            reponse_fausse3 = ?
        WHERE id_question = ?
        """,
        (
            payload.categorie.strip(),
            payload.nb_point,
            payload.question.strip(),
            payload.reponse_vrai.strip(),
            payload.reponse_fausse1.strip(),
            payload.reponse_fausse2.strip(),
            payload.reponse_fausse3.strip(),
            question_id,
        ),
    )
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Question non trouvee")
    conn.commit()
    row = conn.execute(
        "SELECT * FROM question WHERE id_question = ?",
        (question_id,),
    ).fetchone()
    conn.close()
    return row_to_question(row)


@app.delete("/api/admin/questions/{question_id}", status_code=204)
def delete_question(question_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM question WHERE id_question = ?", (question_id,))
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Question non trouvee")
    conn.commit()
    conn.close()
