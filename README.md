# Quiz Brain — Le concours de vannes

Quiz Brain est une application web ou les joueurs s'affrontent a coups d'humour. Une question s'affiche, et chaque joueur doit ecrire la reponse la plus drole possible — sans connaitre la bonne reponse. Le public vote ensuite pour les vannes les plus marrantes.

Les joueurs peuvent creer un compte pour debloquer des badges, suivre leur progression et reserver leur nom de scene au classement. Le mode invite reste disponible sans compte. A la fin d'un passage, une carte de score partageable est generee (partage natif, copie ou image PNG).

Le projet inclut un back-office securise pour gerer les questions, les categories et les mots-cles de validation automatique.

## Equipe

| Membre | Role |
| --- | --- |
| Titouan Charles | Developpement fullstack |

## Stack technique

| Partie | Technologie | Role |
| --- | --- | --- |
| Frontend | React + Vite | Interface du quiz, classement, jury, profil et back-office |
| Backend | Python + FastAPI | Validation des vannes, gestion des scores, votes, administration |
| Base de donnees | PostgreSQL | Stockage des utilisateurs, questions, tentatives, votes et sessions |
| Admin BDD | Adminer | Consultation des tables dans le navigateur |
| Conteneurisation | Docker Compose | Orchestration de tous les services |

## Fonctionnalites

### Parcours joueur

- Creation de compte (inscription, connexion, session par cookie `HttpOnly`).
- Mode invite : jouer sans compte avec un simple pseudo.
- Choix d'un theme ou de tous les themes, et du nombre de questions (5, 10 ou 15).
- Questions aleatoires sans repetition dans un passage.
- Le joueur ecrit une vanne drole sans voir la bonne reponse.
- Validation automatique par mots-cles cote backend.
- Publication des vannes dans l'espace du jury public.
- Vote du public pour decider si la vanne merite ses points.
- Score calcule et enregistre automatiquement.

### Profil et progression

- Page profil avec avatar genere, statistiques et historique des passages.
- Badges debloques automatiquement en jouant.
- Classement des meilleurs joueurs.
- Progression par theme.
- Points de rire fictifs, convertibles en impact solidaire (UNICEF) dans la presentation.
- Carte de score partageable (partage natif, copie presse-papier, image PNG).

### Back-office admin

- Ajouter, modifier, supprimer des questions et des categories.
- Definir les mots-cles de validation par question.
- Import et export JSON des questions.
- Reset des questions initiales.
- Recherche et filtrage par categorie.

## Pre-requis

- Docker Desktop installe et ouvert.
- PowerShell ouvert dans le dossier du projet.

## Lancer le projet

```powershell
docker compose up --build
```

Au premier lancement, Docker construit les conteneurs (peut prendre quelques minutes).

Le fichier `.env.example` sert de modele. Pour une mise en ligne, le copier en `.env` et modifier les valeurs sensibles :

```powershell
copy .env.example .env
```

Valeurs importantes a modifier avant deploiement :

- `POSTGRES_PASSWORD`
- `ADMIN_PASSWORD_HASH`
- `SESSION_COOKIE_SECURE`
- `CORS_ORIGINS`

Un guide de deploiement sur VM Google Cloud est fourni dans `DEPLOY_GCP_VM.md`.

## Acces

| Page | Adresse | Utilite |
| --- | --- | --- |
| Site | http://localhost:3000 | Jouer, voter, voir le classement |
| API | http://localhost:8000 | Backend Python |
| Documentation API | http://localhost:8000/docs | Tester les routes |
| Adminer | http://localhost:8080 | Consulter la base PostgreSQL |

## Scenario de demonstration

1. Ouvrir http://localhost:3000.
2. Creer un compte depuis `Se connecter`.
3. Aller sur `Jouer`, choisir un theme, lancer un passage de 5 questions.
4. Ecrire une vanne pour chaque question (la bonne reponse n'est pas affichee).
5. Montrer le feedback automatique du backend.
6. Montrer l'ecran de resultat et la carte de score partageable.
7. Ouvrir l'onglet `Profil` : stats, badges, historique.
8. Ouvrir l'onglet `Le jury` et voter sur les vannes des autres joueurs.
9. Ouvrir l'onglet `Classement` : scores et progression par theme.
10. Se connecter en admin et ouvrir le back-office.
11. Ajouter ou modifier une question.
12. Ouvrir Adminer pour montrer les tables PostgreSQL.

## Back-office

Accessible depuis le menu compte pour les administrateurs.

Mot de passe par defaut : `admin`

Le mot de passe est stocke sous forme de hash PBKDF2 via la variable `ADMIN_PASSWORD_HASH`. Pour le changer :

```powershell
python backend\auth.py "nouveau-mot-de-passe"
```

Copier le hash obtenu dans `.env`, puis relancer :

```powershell
docker compose up -d --build
```

La securite admin est centralisee dans `backend/auth.py` : le backend compare le mot de passe au hash, cree une session en base, et envoie un cookie `HttpOnly` que le JavaScript ne peut pas lire.

## Base de donnees

PostgreSQL avec les tables suivantes :

| Table | Role |
| --- | --- |
| `app_user` | Joueurs, role, mot de passe (hash), avatar |
| `category` | Categories gerees dans le back-office |
| `question` | Questions, reponses, mots-cles de validation |
| `quiz_attempt` | Parties terminees, scores, points de rire |
| `answer_explanation` | Vannes publiees par les joueurs |
| `explanation_vote` | Votes du public sur les vannes |
| `user_session` | Sessions joueur actives |
| `user_badge` | Badges debloques par joueur |
| `admin_session` | Sessions admin actives |

Connexion Adminer (http://localhost:8080) :

| Champ | Valeur |
| --- | --- |
| Systeme | PostgreSQL |
| Serveur | db |
| Utilisateur | quiz |
| Mot de passe | quiz |
| Base | quiz |

## Architecture

```text
Navigateur
  |
  v
Frontend React (port 3000)
  |
  | /api
  v
Backend FastAPI (port 8000)
  |
  v
PostgreSQL (port 5432)
```

Le frontend envoie les requetes au backend, qui lit et modifie les donnees en base. Adminer (port 8080) permet de consulter les tables directement.

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
  src/App.jsx              Shell principal (nav, hero, toasts)
  src/FrontOffice.jsx      Parcours joueur (scene, vannes, feedback)
  src/Profile.jsx          Page profil (stats, badges, historique)
  src/CommunityVote.jsx    Jury public (votes sur les vannes)
  src/Leaderboard.jsx      Classement et progression
  src/BackOffice.jsx       Administration des questions
  src/components/          Avatar, AuthModal, Hero, BadgeGrid, ShareCard, Toast
  src/styles/              Design tokens et base
  src/lib/api.js           Appels vers le backend
  src/lib/AuthContext.jsx  Etat d'authentification joueur
  Dockerfile               Image Docker du frontend

docker-compose.yml         Orchestration dev (frontend, backend, PostgreSQL, Adminer)
docker-compose.prod.yml    Orchestration production pour VM
DEPLOY_GCP_VM.md           Guide de deploiement Google Cloud VM
```

## Routes principales de l'API

| Methode | Route | Utilite |
| --- | --- | --- |
| GET | `/api/stats` | Statistiques generales |
| GET | `/api/badges` | Catalogue des badges |
| POST | `/api/auth/register` | Inscription joueur |
| POST | `/api/auth/login` | Connexion joueur |
| GET | `/api/auth/me` | Joueur connecte |
| POST | `/api/auth/logout` | Deconnexion joueur |
| GET | `/api/profile` | Profil, stats, badges, historique |
| GET | `/api/question` | Question aleatoire (sans la bonne reponse) |
| POST | `/api/explanation` | Validation automatique et publication d'une vanne |
| GET | `/api/explanations` | Vannes ouvertes au vote du jury |
| POST | `/api/explanations/{id}/vote` | Vote du public sur une vanne |
| GET | `/api/leaderboard` | Classement des scores |
| GET | `/api/progress` | Progression par theme |
| POST | `/api/scores` | Enregistrement d'un score |
| POST | `/api/admin/auth` | Connexion admin |
| GET | `/api/admin/session` | Verification session admin |
| POST | `/api/admin/logout` | Deconnexion admin |
| GET | `/api/admin/questions` | Liste des questions |
| POST | `/api/admin/questions` | Ajout d'une question |
| PUT | `/api/admin/questions/{id}` | Modification d'une question |
| DELETE | `/api/admin/questions/{id}` | Suppression d'une question |
| POST | `/api/admin/reset` | Reset des questions initiales |
| POST | `/api/admin/import` | Import JSON des questions |

Documentation interactive : http://localhost:8000/docs

## Arreter le projet

```powershell
docker compose down
```

## Reinitialiser la base

Supprime toutes les donnees (questions modifiees, scores, comptes) :

```powershell
docker compose down -v
docker compose up --build
```

## Problemes courants

| Probleme | Solution |
| --- | --- |
| "Backend indisponible" | Verifier que Docker tourne (`docker compose ps`) et que le backend repond (`curl http://localhost:8000/api/stats`) |
| Port deja utilise | Ports necessaires : 3000 (site), 8000 (API), 5432 (PostgreSQL), 8080 (Adminer) |
| Donnees corrompues | Bouton `Reset` dans le back-office, ou `docker compose down -v && docker compose up --build` |

## Donnees initiales

Les questions de depart sont dans `backend/data/questions.seed.json`. Au premier demarrage, si la table `question` est vide, le backend les insere automatiquement.
