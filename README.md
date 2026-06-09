# Quiz Arena - Front, Back et Base de donnees

Quiz Arena est une application web de quiz argumente, avec une interface "Arcade Neon" (theme sombre, accents neon). Le joueur entre un pseudo (ou se connecte a son compte), choisit une categorie, voit une reponse a defendre, explique pourquoi elle est correcte, puis la communaute vote pour dire si cette explication merite les points.

Les joueurs peuvent creer un compte pour debloquer une page profil, des badges (achievements), un historique de parties et un pseudo reserve. A la fin d'une partie, une carte de score partageable est generee (partage natif, copie ou image PNG). Le mode invite reste disponible sans compte.

Le projet contient aussi un back-office securise pour gerer les questions, les categories, les explications attendues et les mots-cles de validation automatique.

## Ce que montre le projet

Ce projet montre une application complete avec :

- un site visible dans le navigateur ;
- un serveur Python qui gere les demandes du site ;
- une base de donnees PostgreSQL qui garde les utilisateurs, categories, questions, tentatives, explications, votes et sessions admin ;
- un outil d'administration pour consulter la base ;
- Docker Compose pour tout lancer avec une seule commande.

## Les parties du projet

| Partie | Technologie | Role |
| --- | --- | --- |
| Frontend | React + Vite | Affiche le site, le quiz, le classement et le back-office |
| Backend | Python + FastAPI | Verifie les explications, enregistre les scores, expose les votes et gere l'administration |
| Base de donnees | PostgreSQL | Stocke les utilisateurs, categories, questions, tentatives, votes et sessions |
| Admin BDD | Adminer | Permet de consulter les tables de la base dans le navigateur |
| Lancement | Docker Compose | Lance tous les services ensemble |

## Fonctionnalites principales

- Comptes joueurs : inscription, connexion, session par cookie `HttpOnly`.
- Page profil : avatar genere, statistiques, historique de parties, progression.
- Badges (achievements) debloques automatiquement en jouant.
- Carte de score partageable (partage natif, copie presse-papier ou image PNG).
- Mode invite : jouer sans compte avec un simple pseudo.
- Creation d'une partie avec un pseudo joueur.
- Choix d'une categorie ou de toutes les categories.
- Choix du nombre de questions : 5, 10 ou 15.
- Questions aleatoires sans repetition dans une partie.
- Affichage de la bonne reponse, puis saisie d'une explication par le joueur.
- Validation automatique de l'explication par mots-cles cote backend.
- Publication des explications dans un espace de vote public.
- Vote communautaire pour confirmer ou refuser les points d'une explication.
- Score calcule automatiquement.
- Enregistrement de chaque tentative en base de donnees.
- Page classement des meilleurs joueurs.
- Graphique de progression par categorie.
- Points solidaires fictifs, convertibles en impact UNICEF dans la presentation.
- Back-office admin pour ajouter, modifier ou supprimer des questions et categories.
- Champ d'explication attendue pour chaque question.
- Mots-cles de validation configurables par question.
- Import et export JSON des questions.
- Reset des questions initiales.

## Couverture des attendus du projet

| Attendu | Etat dans ce repo |
| --- | --- |
| Docker Front, Back, Base de donnees | Fait avec `docker-compose.yml` |
| Modelisation Users, Questions, Categories, Tentatives | Fait avec PostgreSQL |
| Backend Python | Fait avec FastAPI |
| Authentification admin | Fait avec session serveur et cookie `HttpOnly` |
| Roles User/Admin | Fait cote base avec `app_user.role` et session admin |
| CRUD questions/categories | Fait dans l'onglet Admin |
| Explication par question | Fait avec `explanation` et `explanation_keywords` |
| Quiz solo responsive | Fait dans l'onglet Jouer |
| Apprentissage inverse | Fait : la reponse est affichee, le joueur doit l'expliquer |
| Vote communautaire | Fait avec l'onglet Votes |
| Progression par categorie | Fait dans l'onglet Classement |
| Points solidaires fictifs | Fait avec `donation_points` |
| Deploiement Docker sur VM | Guide fourni dans `DEPLOY_GCP_VM.md` |
| Validation mail admin | Preparee en base avec `email_verified`, SMTP non branche dans ce prototype |
| Duel temps reel WebSocket | Non implemente dans ce MVP |

## Pre-requis

Avant de lancer le projet, il faut :

- installer Docker Desktop ;
- ouvrir Docker Desktop ;
- ouvrir PowerShell dans le dossier du projet.

Dossier du projet :

```text
Ouvrir PowerShell dans le dossier du repo Quiz Arena
```

## Lancer le projet

Dans PowerShell :

```powershell
docker compose up --build
```

Pour deployer sur une VM Google Cloud, utiliser le guide dedie :

```text
DEPLOY_GCP_VM.md
```

Le fichier `.env.example` sert de modele pour configurer les secrets. Pour une VM ou une mise en ligne, copier ce fichier en `.env`, puis changer les valeurs sensibles :

```powershell
copy .env.example .env
```

Valeurs importantes a modifier avant une mise en ligne :

- `POSTGRES_PASSWORD`
- `ADMIN_PASSWORD_HASH`
- `SESSION_COOKIE_SECURE`
- `CORS_ORIGINS`

Au premier lancement, Docker peut prendre du temps car il doit construire les conteneurs.

Quand le lancement est termine, ouvrir :

| Page | Adresse | Utilite |
| --- | --- | --- |
| Site | http://localhost:3000 | Jouer, voter, voir le classement, gerer les questions |
| API | http://localhost:8000 | Backend Python |
| Documentation API | http://localhost:8000/docs | Tester les routes du backend |
| Adminer | http://localhost:8080 | Voir la base PostgreSQL |

## Scenario de demonstration

Pour presenter le projet simplement :

1. Ouvrir http://localhost:3000.
2. Cliquer sur `Se connecter` et creer un compte (pseudo + mot de passe).
3. Choisir une categorie depuis l'onglet `Jouer`.
4. Lancer une partie de 5 questions.
5. Lire la reponse affichee et saisir une explication.
6. Montrer la validation de l'explication par le backend.
7. Montrer l'ecran de resultat, la carte de score partageable et le badge debloque.
8. Ouvrir l'onglet `Profil` pour montrer stats, badges et historique.
9. Ouvrir l'onglet `Votes`.
10. Voter pour accepter ou refuser les points d'une explication.
11. Ouvrir l'onglet `Classement`.
12. Montrer que le score et les points solidaires sont enregistres.
13. Montrer la progression par categorie.
14. Ouvrir l'onglet `Admin`.
15. Ajouter ou modifier une question avec son explication.
16. Ouvrir Adminer pour montrer les tables PostgreSQL.

## Back-office

Le back-office est accessible depuis l'onglet `Admin`.

Mot de passe par defaut :

```text
admin
```

Le mot de passe n'est pas stocke en clair dans le backend. Docker Compose utilise un hash PBKDF2 via la variable :

```text
ADMIN_PASSWORD_HASH
```

La securite admin est centralisee dans :

```text
backend/auth.py
```

Le fonctionnement est le suivant :

- l'administrateur envoie son mot de passe au backend ;
- le backend compare ce mot de passe avec le hash configure ;
- si le mot de passe est correct, le backend cree une session en base de donnees ;
- le navigateur recoit un cookie `HttpOnly` ;
- le JavaScript du frontend ne peut pas lire ce cookie ;
- les routes admin verifient la session cote serveur.

Dans le back-office, on peut :

- ajouter une question ;
- modifier une question ;
- supprimer une question ;
- creer, renommer et supprimer une categorie ;
- definir l'explication attendue d'une question ;
- definir les mots-cles utilises pour valider l'explication joueur ;
- rechercher dans les questions ;
- filtrer par categorie ;
- exporter les questions en JSON ;
- importer des questions depuis un fichier JSON ;
- remettre les questions initiales.

Pour changer le mot de passe admin :

1. Generer un hash :

```powershell
python backend\auth.py "nouveau-mot-de-passe"
```

2. Copier le hash obtenu dans `.env` :

```text
ADMIN_PASSWORD_HASH
```

3. Relancer le backend :

```powershell
docker compose up -d --build
```

## Base de donnees

La base utilisee est PostgreSQL.

Elle contient principalement ces tables :

| Table | Role |
| --- | --- |
| `app_user` | Stocke les joueurs, leur role, mot de passe (hash) et avatar |
| `category` | Stocke les categories gerees dans le back-office |
| `question` | Stocke les questions, les reponses, les explications et les mots-cles |
| `quiz_attempt` | Stocke les parties terminees, scores et points solidaires |
| `answer_explanation` | Stocke les explications publiees par les joueurs |
| `explanation_vote` | Stocke les votes publics sur les explications |
| `user_session` | Stocke les sessions joueur actives sous forme de hash |
| `user_badge` | Stocke les badges debloques par chaque joueur |
| `admin_session` | Stocke les sessions admin actives sous forme de hash |

La table `score` peut exister dans certaines bases locales anciennes, mais le MVP actuel utilise `quiz_attempt` pour les nouvelles parties.

## Connexion a Adminer

Ouvrir :

```text
http://localhost:8080
```

Utiliser ces informations :

```text
Systeme : PostgreSQL
Serveur : db
Utilisateur : quiz
Mot de passe : quiz
Base : quiz
```

## Verifier la base en ligne de commande

Nombre de questions :

```powershell
docker compose exec db psql -U quiz -d quiz -c "SELECT COUNT(*) FROM question;"
```

Nombre de tentatives :

```powershell
docker compose exec db psql -U quiz -d quiz -c "SELECT COUNT(*) FROM quiz_attempt;"
```

Nombre de votes :

```powershell
docker compose exec db psql -U quiz -d quiz -c "SELECT COUNT(*) FROM explanation_vote;"
```

## Architecture simplifiee

```text
Utilisateur
  |
  v
Navigateur web
  |
  v
Frontend React
  |
  | appels /api
  v
Backend Python FastAPI
  |
  v
Base PostgreSQL
```

Explication :

- le navigateur affiche le site ;
- le frontend envoie les demandes au backend ;
- le backend lit et modifie les donnees ;
- PostgreSQL conserve les questions et les scores.

## Structure du projet

```text
backend/
  auth.py                  Securite admin, hash mot de passe, sessions
  user_auth.py             Sessions joueur (cookie HttpOnly)
  badges.py                Catalogue et evaluation des badges
  main.py                  Routes API FastAPI
  database.py              Connexion PostgreSQL et creation des tables
  data/questions.seed.json Questions initiales
  requirements.txt         Dependances Python
  Dockerfile               Image Docker du backend

frontend/
  src/App.jsx              Structure principale (shell, nav, hero, toasts)
  src/FrontOffice.jsx      Parcours joueur
  src/Profile.jsx          Page profil (stats, badges, historique)
  src/CommunityVote.jsx    Votes publics sur les explications
  src/Leaderboard.jsx      Classement
  src/BackOffice.jsx       Administration des questions
  src/components/          Avatar, AuthModal, Hero, BadgeGrid, ShareCard, Toast
  src/styles/              Design tokens et base (theme Arcade Neon)
  src/lib/api.js           Appels vers le backend
  src/lib/AuthContext.jsx  Etat d'authentification joueur
  Dockerfile               Image Docker du frontend

docker-compose.yml         Lance le frontend, le backend, PostgreSQL et Adminer
docker-compose.prod.yml    Lance la version production pour une VM
DEPLOY_GCP_VM.md           Guide de deploiement sur Google Cloud VM
README.md                  Documentation du projet
```

## Routes principales de l'API

| Methode | Route | Utilite |
| --- | --- | --- |
| GET | `/api/stats` | Statistiques generales |
| GET | `/api/badges` | Catalogue des badges |
| POST | `/api/auth/register` | Inscription joueur |
| POST | `/api/auth/login` | Connexion joueur |
| GET | `/api/auth/me` | Joueur connecte (ou aucun) |
| POST | `/api/auth/logout` | Deconnexion joueur |
| GET | `/api/profile` | Profil, stats, badges, historique |
| GET | `/api/question` | Question aleatoire |
| POST | `/api/answer` | Verification d'une reponse |
| POST | `/api/explanation` | Verification automatique et publication d'une explication |
| GET | `/api/explanations` | Liste des explications ouvertes au vote |
| POST | `/api/explanations/{id}/vote` | Vote public sur une explication |
| GET | `/api/leaderboard` | Classement des scores |
| GET | `/api/progress` | Progression par categorie |
| POST | `/api/scores` | Enregistrement d'un score |
| POST | `/api/admin/auth` | Connexion admin |
| GET | `/api/admin/session` | Verification de la session admin |
| POST | `/api/admin/logout` | Deconnexion admin |
| GET | `/api/admin/questions` | Liste des questions |
| POST | `/api/admin/questions` | Ajout d'une question |
| PUT | `/api/admin/questions/{id}` | Modification d'une question |
| DELETE | `/api/admin/questions/{id}` | Suppression d'une question |
| POST | `/api/admin/reset` | Reset des questions initiales |
| POST | `/api/admin/import` | Import JSON des questions |

Documentation interactive :

```text
http://localhost:8000/docs
```

## Arreter le projet

Dans le terminal :

```text
Ctrl + C
```

Puis :

```powershell
docker compose down
```

## Reinitialiser completement la base

Attention : cette commande supprime les questions modifiees et les scores.

```powershell
docker compose down -v
docker compose up --build
```

## Problemes courants

### Le site affiche "Backend indisponible"

Verifier que Docker tourne :

```powershell
docker compose ps
```

Verifier que le backend repond :

```powershell
curl http://localhost:8000/api/stats
```

### Un port est deja utilise

Ports utilises :

- `3000` pour le site ;
- `8000` pour l'API ;
- `5432` pour PostgreSQL ;
- `8080` pour Adminer.

### La base ne contient plus les bonnes donnees

Utiliser le bouton `Reset` dans le back-office, ou reinitialiser avec :

```powershell
docker compose down -v
docker compose up --build
```

## Donnees initiales

Les questions de depart sont dans :

```text
backend/data/questions.seed.json
```

Au premier demarrage, si la table `question` est vide, le backend insere automatiquement ces questions dans PostgreSQL.
