# Quiz Brain — Exploitation & déploiement

## Architecture
- **frontend** : React 18 + Vite, servi par Nginx en prod (proxy `/api` → backend).
- **backend** : FastAPI + psycopg3, logs JSON structurés, en-têtes de sécurité, rate-limiting sur les endpoints sensibles.
- **db** : PostgreSQL 16, migrations SQL versionnées (`backend/migrations/*.sql`, table `schema_migration`), appliquées automatiquement au démarrage.

## Auth & RBAC
- Un seul système d'authentification : `app_user` + cookie de session `HttpOnly` (jeton stocké haché en base, TTL configurable, invalidé au logout).
- L'admin est un utilisateur avec `role='admin'`. Tous les endpoints `/api/admin/*` exigent une session valide **et** ce rôle (401/403 sinon).
- Bootstrap admin au démarrage via `ADMIN_PSEUDO` + `ADMIN_PASSWORD_HASH` (hash : `python backend/auth.py "mdp"`). En dev, `ADMIN_PASSWORD` en clair est accepté.
- L'UI n'affiche l'entrée « Administration » que dans le menu compte, et uniquement pour le rôle admin. Aucun bouton Admin public.

## Dev local
```bash
cp .env.example .env        # renseigner ADMIN_PASSWORD etc.
docker compose up -d --build
# App: http://localhost:3000 · API: http://localhost:8000 · Adminer (localhost only): http://localhost:8080
```

## Production
```bash
cp .env.production.example .env   # secrets obligatoires, sinon le compose refuse de démarrer
docker compose -f docker-compose.prod.yml up -d --build
```
- Conteneurs : multi-stage, backend non-root, healthchecks, logs JSON avec rotation.
- `SESSION_COOKIE_SECURE=true` par défaut en prod ; mettre le site derrière HTTPS et décommenter HSTS dans `frontend/nginx.conf`.

## Tests & qualité
```bash
# Backend (unitaires sans DB ; intégration auto-skip si Postgres absent)
pip install -r backend/requirements-dev.txt
cd backend && python -m pytest && python -m ruff check .

# Frontend
cd frontend && npm install && npm run lint && npm run build

# E2E (stack lancée + admin bootstrappé)
cd frontend && npx playwright install chromium && \
  E2E_ADMIN_PSEUDO=admin E2E_ADMIN_PASSWORD=... npm run test:e2e
```

## Rollback / reset
- Migrations : additives et idempotentes ; pour revenir en arrière, restaurer un dump (`pg_dump` conseillé avant déploiement).
- Reset complet dev : `docker compose down -v` (supprime le volume Postgres).

## Notes de migration v2
- Les tables `admin_session` et `score` (héritées, non utilisées) sont supprimées par la migration `002`.
- L'ancien endpoint `/api/admin/auth` (mot de passe partagé) n'existe plus.
- L'inscription exige désormais 8 caractères minimum ; les comptes existants se connectent sans changement.
- `002` pose un index unique sur `LOWER(pseudo)` : si une vieille base contient des doublons de casse, les fusionner avant migration.
