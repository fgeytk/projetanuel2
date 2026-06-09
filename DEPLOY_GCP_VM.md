# Deploiement GCP VM

Ce guide deploie Quiz Arena sur une VM Google Cloud avec Docker Compose.

## Architecture

```text
Internet
  |
  | port 80
  v
Frontend Nginx
  |
  | /api
  v
Backend FastAPI
  |
  v
PostgreSQL prive
```

En production, seul le frontend expose le port `80`. Le backend et PostgreSQL restent dans le reseau Docker interne.

## 1. Preparer la VM

Creer une VM Ubuntu ou Debian avec :

- 1 vCPU minimum ;
- 2 Go RAM recommande ;
- port HTTP `80` ouvert dans le firewall GCP ;
- pas de port PostgreSQL ouvert publiquement.

Installer Docker :

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker version
docker compose version
```

## 2. Recuperer le projet

```bash
git clone <URL_DU_REPO>
cd <DOSSIER_DU_REPO>
```

Pour une mise a jour :

```bash
git pull
```

## 3. Creer les variables de production

```bash
cp .env.production.example .env
nano .env
```

Changer au minimum :

```text
POSTGRES_PASSWORD=un-long-mot-de-passe
ADMIN_PASSWORD_HASH=pbkdf2_sha256:...
PUBLIC_HTTP_PORT=80
SESSION_COOKIE_SECURE=false
```

Si HTTPS est active plus tard avec un domaine, passer `SESSION_COOKIE_SECURE=true`.

## 4. Generer le hash admin

```bash
docker run --rm -v "$PWD:/app" -w /app python:3.12-slim python backend/auth.py "mot-de-passe-admin"
```

Copier la valeur affichee dans `.env` :

```text
ADMIN_PASSWORD_HASH=pbkdf2_sha256:...
```

Ne jamais mettre le mot de passe admin en clair dans `.env`.

## 5. Lancer la production

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Verifier :

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs -f
```

Tester localement depuis la VM :

```bash
curl http://localhost/api/stats
```

Dans le navigateur :

```text
http://IP_DE_LA_VM
```

## 6. Mettre a jour

```bash
git pull
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Les donnees restent conservees dans le volume Docker `postgres-data`.

## 7. Sauvegarder la base

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

## 8. Arreter

```bash
docker compose --env-file .env -f docker-compose.prod.yml down
```

## 9. Reinitialiser completement

Attention : cette commande supprime la base PostgreSQL.

```bash
docker compose --env-file .env -f docker-compose.prod.yml down -v
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

## Checklist

- Le port `80` est ouvert sur GCP.
- `.env` existe sur la VM.
- `POSTGRES_PASSWORD` est change.
- `ADMIN_PASSWORD_HASH` est genere.
- Le site repond sur `http://IP_DE_LA_VM`.
- L'onglet `Votes` affiche les explications publiees.
- L'onglet `Admin` demande une session admin.
