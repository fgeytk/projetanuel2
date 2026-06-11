-- 002 — RBAC strict : l'admin est un app_user avec role='admin'.
-- L'ancienne session admin par mot de passe partagé disparaît.

DROP TABLE IF EXISTS admin_session;

-- Table héritée jamais lue par l'API (remplacée par quiz_attempt)
DROP TABLE IF EXISTS score;

-- Unicité des pseudos insensible à la casse (le login compare en LOWER).
-- Les doublons hérités sont renommés de façon déterministe : le compte le plus
-- ancien garde son pseudo, les autres reçoivent un suffixe #id.
UPDATE app_user u
SET pseudo = u.pseudo || '#' || u.id
WHERE EXISTS (
    SELECT 1 FROM app_user d
    WHERE LOWER(d.pseudo) = LOWER(u.pseudo) AND d.id < u.id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_pseudo_lower ON app_user (LOWER(pseudo));

-- Index utiles sur les parcours chauds
CREATE INDEX IF NOT EXISTS idx_question_category ON question (category);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_user_id ON quiz_attempt (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_category ON quiz_attempt (category);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_score ON quiz_attempt (score DESC, correct_answers DESC);
CREATE INDEX IF NOT EXISTS idx_user_session_user_id ON user_session (user_id);
CREATE INDEX IF NOT EXISTS idx_answer_explanation_user_id ON answer_explanation (user_id);
