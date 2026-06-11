-- 001 — Schéma de base (idempotent : safe sur DB neuve comme sur volume existant)

CREATE TABLE IF NOT EXISTS category (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_user (
    id SERIAL PRIMARY KEY,
    pseudo TEXT NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT,
    avatar_seed TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colonnes ajoutées au fil du temps (DB issues d'anciennes versions)
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS avatar_seed TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE app_user SET avatar_seed = pseudo WHERE avatar_seed IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_email ON app_user (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user (role);

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
);

ALTER TABLE question ADD COLUMN IF NOT EXISTS explanation TEXT NOT NULL DEFAULT '';
ALTER TABLE question ADD COLUMN IF NOT EXISTS explanation_keywords TEXT[] NOT NULL DEFAULT '{}';

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
);

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
);

CREATE INDEX IF NOT EXISTS idx_answer_explanation_created_at ON answer_explanation (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answer_explanation_question_id ON answer_explanation (question_id);

CREATE TABLE IF NOT EXISTS explanation_vote (
    id SERIAL PRIMARY KEY,
    explanation_id INTEGER NOT NULL REFERENCES answer_explanation(id) ON DELETE CASCADE,
    voter_name TEXT NOT NULL,
    approve BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (explanation_id, voter_name)
);

CREATE INDEX IF NOT EXISTS idx_explanation_vote_explanation_id ON explanation_vote (explanation_id);

CREATE TABLE IF NOT EXISTS user_session (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_session_expires_at ON user_session (expires_at);

CREATE TABLE IF NOT EXISTS user_badge (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    badge_code TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_code)
);
