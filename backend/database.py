import sqlite3
import os
import re

DB_PATH = os.path.join(os.path.dirname(__file__), "quiz.db")
SQL_FILE = os.path.join(os.path.dirname(__file__), "..", "quiz (5).sql")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS question (
            id_question INTEGER PRIMARY KEY AUTOINCREMENT,
            categorie TEXT,
            nb_point INTEGER,
            question TEXT,
            reponse_vrai TEXT,
            reponse_fausse1 TEXT,
            reponse_fausse2 TEXT,
            reponse_fausse3 TEXT
        )
    """)
    cur.execute("SELECT COUNT(*) FROM question")
    if cur.fetchone()[0] == 0:
        _seed_from_sql(cur)
    conn.commit()
    conn.close()


def _seed_from_sql(cur):
    with open(SQL_FILE, "r", encoding="utf-8") as f:
        sql = f.read()

    # Extract all INSERT INTO `question` VALUES rows
    pattern = r"\((\d+),\s*'((?:[^'\\]|\\.|'')*)',\s*(\d+),\s*'((?:[^'\\]|\\.|'')*)',\s*'((?:[^'\\]|\\.|'')*)',\s*'((?:[^'\\]|\\.|'')*)',\s*'((?:[^'\\]|\\.|'')*)',\s*'((?:[^'\\]|\\.|'')*)'\)"
    matches = re.findall(pattern, sql)

    for m in matches:
        id_q, cat, pts, question, vrai, f1, f2, f3 = m
        # Unescape SQL strings
        vals = []
        for v in [cat, question, vrai, f1, f2, f3]:
            v = v.replace("\\'", "'").replace("''", "'")
            vals.append(v)
        cur.execute(
            "INSERT INTO question (id_question, categorie, nb_point, question, reponse_vrai, reponse_fausse1, reponse_fausse2, reponse_fausse3) VALUES (?,?,?,?,?,?,?,?)",
            (int(id_q), vals[0], int(pts), vals[1], vals[2], vals[3], vals[4], vals[5]),
        )
