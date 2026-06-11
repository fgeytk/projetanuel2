# Deploiement GCP VM

Ce guide deploie Quiz Arena sur une VM Google Cloud avec Docker Compose.
Ce guide couvre le deploiement de Quiz Arena sur une VM Google Cloud avec Docker Compose, en particulier le cas ou une VM existe deja et fait tourner une ancienne version du site.

Le principe en production est simple :

- le frontend Nginx expose le port `80` ;
- le backend FastAPI et PostgreSQL restent dans le reseau Docker interne ;
- les migrations SQL sont appliquees automatiquement au demarrage du backend ;
- avant chaque mise a jour, il faut sauvegarder la base.

## Architecture cible

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

## 1. Pre-requis VM

VM Ubuntu ou Debian recommandee avec :

- 1 vCPU minimum ;
- 2 Go RAM ou plus ;
- port HTTP `80` ouvert dans le firewall GCP ;
- port PostgreSQL non expose publiquement.

Installer Docker si ce n'est pas deja fait :

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker version
docker compose version
```

## 2. Premier deploiement sur une VM vide

Si la VM n'a jamais heberge le projet :

```bash
git clone <URL_DU_REPO> quiz-arena
cd quiz-arena
cp .env.production.example .env
```

Generer le hash admin :

```bash
docker run --rm -v "$PWD:/app" -w /app python:3.12-slim python backend/auth.py "mot-de-passe-admin"
```

Reporter la valeur dans `.env` :

```text
ADMIN_PSEUDO=admin
ADMIN_PASSWORD_HASH=pbkdf2_sha256:...
```

Completer au minimum ces variables :

```text
POSTGRES_DB=quiz
POSTGRES_USER=quiz
POSTGRES_PASSWORD=un-long-mot-de-passe
SESSION_COOKIE_SECURE=false
PUBLIC_HTTP_PORT=80
```

Si le site est servi en HTTPS avec un domaine, utiliser plutot :

```text
SESSION_COOKIE_SECURE=true
```

Lancer la production :

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

## 3. Mise a jour d'une VM qui fait deja tourner le site

C'est le cas a utiliser si une ancienne version tourne deja sur la VM.

### 3.1 Se connecter et se placer dans le repo

```bash
ssh <USER>@<IP_VM>
cd <DOSSIER_DU_REPO_SUR_LA_VM>
pwd
docker compose -f docker-compose.prod.yml ps
```

### 3.2 Sauvegarder avant mise a jour

Sauvegarder la base avant tout deploiement, car une nouvelle version peut appliquer une migration SQL.

```bash
mkdir -p backups
docker compose --env-file .env -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backups/backup-$(date +%F-%H%M%S).sql
cp .env backups/.env.backup-$(date +%F-%H%M%S)
```

Verifier que le dump existe :

```bash
ls -lh backups
```

### 3.3 Recuperer la nouvelle version du code

```bash
git status
git fetch --all --tags
git pull --ff-only
```

Si le repo sur la VM n'est pas sur la bonne branche :

```bash
git checkout <BRANCHE_A_DEPLOYER>
git pull --ff-only
```

### 3.4 Verifier le fichier `.env`

Le plus simple est de conserver le `.env` deja present sur la VM et de verifier qu'il contient encore toutes les variables attendues.

Base minimale recommandee :

```text
POSTGRES_DB=quiz
POSTGRES_USER=quiz
POSTGRES_PASSWORD=...
ADMIN_PSEUDO=admin
ADMIN_PASSWORD_HASH=pbkdf2_sha256:...
USER_SESSION_TTL_SECONDS=2592000
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=lax
CORS_ORIGINS=
PUBLIC_HTTP_PORT=80
LOG_LEVEL=INFO
```

Comparer avec le modele de prod si besoin :

```bash
cat .env.production.example
cat .env
```

Regle pratique :

- garder `SESSION_COOKIE_SECURE=false` si le site est servi uniquement en HTTP sur l'IP de la VM ;
- passer `SESSION_COOKIE_SECURE=true` des que la VM est derriere HTTPS ;
- laisser `CORS_ORIGINS=` vide en production si le frontend et l'API passent par le meme Nginx.

### 3.5 Redeployer les conteneurs

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Cette commande :

- reconstruit le backend et le frontend ;
- redemarre les conteneurs ;
- conserve le volume Docker `postgres-data` ;
- applique automatiquement les migrations au demarrage du backend.

### 3.6 Verifier apres deploiement

Verifier l'etat des services :

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100 backend
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100 frontend
```

Tester depuis la VM :

```bash
curl http://localhost/api/health
curl http://localhost/api/stats
```

Puis verifier depuis un navigateur :

```text
http://IP_DE_LA_VM
```

Points a verifier dans l'application :

- la page d'accueil se charge ;
- l'onglet `Votes` s'affiche ;
- la connexion admin fonctionne ;
- l'onglet `Admin` reste protege ;
- le classement et les statistiques repondent.

## 4. Commandes utiles d'exploitation

Voir l'etat :

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
```

Suivre les logs :

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f
```

Redemarrer sans rebuild :

```bash
docker compose --env-file .env -f docker-compose.prod.yml restart
```

Arreter l'application :

```bash
docker compose --env-file .env -f docker-compose.prod.yml down
```

## 5. Rollback simple

Si la nouvelle version ne fonctionne pas, revenir au commit precedent puis redeployer :

```bash
git log --oneline -n 5
git checkout <ANCIEN_COMMIT_OU_TAG>
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Si le probleme vient d'une migration ou d'une corruption de donnees, restaurer le dump precedemment cree.

Exemple de restauration :

```bash
cat backups/<NOM_DU_DUMP>.sql | docker compose --env-file .env -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Ne restaurer un dump qu'en sachant quel etat de schema est attendu par la version du code redemarree.

## 6. Reinitialisation complete

Attention : cela supprime les donnees PostgreSQL du volume Docker.

```bash
docker compose --env-file .env -f docker-compose.prod.yml down -v
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

## 7. Checklist avant validation

- Le port `80` est ouvert dans GCP.
- Le fichier `.env` est present sur la VM.
- `POSTGRES_PASSWORD` a ete change.
- `ADMIN_PASSWORD_HASH` est renseigne.
- Une sauvegarde SQL a ete faite avant la mise a jour.
- `docker compose ... ps` montre les services en cours d'execution.
- `curl http://localhost/api/health` repond correctement.
- Le site repond sur `http://IP_DE_LA_VM`.
- L'administration reste accessible seulement apres connexion.

## 8. Procedure courte pour ta VM existante

Si la VM heberge deja une ancienne version du site, la sequence minimale est :

```bash
ssh <USER>@<IP_VM>
cd <DOSSIER_DU_REPO_SUR_LA_VM>
mkdir -p backups
docker compose --env-file .env -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backups/backup-$(date +%F-%H%M%S).sql
git pull --ff-only
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
docker compose --env-file .env -f docker-compose.prod.yml ps
curl http://localhost/api/health
```

Si tu veux une commande encore plus "copier-coller", remplace juste les placeholders `IP_VM`, `USER` et le chemin du repo.

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
