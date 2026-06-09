# Deploiement sur une VM Google Cloud

Ce guide explique comment deployer Quiz Arena proprement sur une VM GCP avec Docker Compose.

## Architecture en production

En production, on n'utilise pas le serveur de developpement Vite.

```text
Internet
  |
  | port 80
  v
Nginx dans le conteneur frontend
  |
  | /api
  v
Backend FastAPI
  |
  v
PostgreSQL
```

Seul le port `80` est expose publiquement.

Le backend et PostgreSQL restent accessibles uniquement entre conteneurs Docker.

## Fichiers utilises pour la production

| Fichier | Role |
| --- | --- |
| `docker-compose.prod.yml` | Lance la version production |
| `frontend/Dockerfile.prod` | Build React puis sert le site avec Nginx |
| `frontend/nginx.conf` | Redirige `/api` vers le backend |
| `backend/Dockerfile.prod` | Lance FastAPI sans mode reload |
| `.env.production.example` | Modele des variables de production |

## 1. Preparer la VM GCP

La VM doit avoir :

- Ubuntu ou Debian ;
- au moins 1 vCPU ;
- au moins 1 Go de RAM, 2 Go recommande ;
- Docker installe ;
- le port `80` ouvert dans le firewall GCP.

Dans Google Cloud, ouvrir le trafic HTTP sur la VM :

- soit en cochant `Allow HTTP traffic` sur la VM ;
- soit en creant une regle firewall qui autorise `tcp:80`.

Ne pas ouvrir PostgreSQL publiquement. Le port `5432` ne doit pas etre expose sur Internet.

## 2. Installer Docker sur la VM

Se connecter en SSH a la VM, puis lancer :

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker version
docker compose version
```

Si `docker compose version` fonctionne, la VM est prete.

## 3. Envoyer le projet sur la VM

Option recommandee : utiliser Git.

```bash
git clone <URL_DU_REPO>
cd projetanuel2
```

Si le repo est deja sur la VM :

```bash
cd projetanuel2
git pull
```

## 4. Creer le fichier `.env`

Sur la VM :

```bash
cp .env.production.example .env
nano .env
```

Changer au minimum :

```text
POSTGRES_PASSWORD=un-long-mot-de-passe-bdd
ADMIN_PASSWORD_HASH=hash-du-mot-de-passe-admin
```

## 5. Generer le hash admin

Depuis le dossier du projet sur la VM :

```bash
docker run --rm -v "$PWD:/app" -w /app python:3.12-slim python backend/auth.py "mot-de-passe-admin"
```

Copier le resultat dans `.env` :

```text
ADMIN_PASSWORD_HASH=pbkdf2_sha256:...
```

Important : ne pas mettre le mot de passe admin en clair dans `.env`.

## 6. Lancer la production

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Verifier les conteneurs :

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
```

Verifier les logs :

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f
```

## 7. Tester le site

Dans le navigateur :

```text
http://IP_DE_LA_VM
```

Tester aussi l'API :

```bash
curl http://localhost/api/stats
```

Depuis la VM, cette commande doit renvoyer les statistiques du quiz.

## 8. Verifier la base PostgreSQL

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM question;"
```

Au premier demarrage, la table `question` doit contenir les questions initiales.

## 9. Mettre a jour le site

Quand le code change :

```bash
git pull
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Les donnees PostgreSQL restent conservees dans le volume Docker.

## 10. Arreter la production

```bash
docker compose --env-file .env -f docker-compose.prod.yml down
```

Cette commande arrete les conteneurs mais garde les donnees.

## 11. Reinitialiser completement

Attention : cette commande supprime la base de donnees.

```bash
docker compose --env-file .env -f docker-compose.prod.yml down -v
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

## 12. HTTPS

Pour une demo rapide, HTTP sur le port `80` suffit.

Pour une vraie mise en ligne avec un nom de domaine, il faut ajouter HTTPS avec un reverse proxy comme Caddy, Traefik ou Nginx + Certbot.

Quand HTTPS est actif, mettre dans `.env` :

```text
SESSION_COOKIE_SECURE=true
```

Sans HTTPS, garder :

```text
SESSION_COOKIE_SECURE=false
```

## Checklist finale

- Docker fonctionne sur la VM.
- Le port `80` est ouvert dans GCP.
- `.env` existe sur la VM.
- `POSTGRES_PASSWORD` a ete change.
- `ADMIN_PASSWORD_HASH` a ete genere.
- `docker compose --env-file .env -f docker-compose.prod.yml up -d --build` fonctionne.
- Le site repond sur `http://IP_DE_LA_VM`.
- L'onglet Admin fonctionne avec le mot de passe choisi.
