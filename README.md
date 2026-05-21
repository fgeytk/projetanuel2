# Quiz MVP - Projet Annuel 2

Petit quiz a choix multiples avec un backend FastAPI, un frontend React et une base SQLite.

## Stack

- Backend : Python, FastAPI, Uvicorn, SQLite
- Frontend : React 18, Vite
- Docker : `docker compose`
- Donnees initiales : `quiz (5).sql`, importees automatiquement dans SQLite au premier lancement

## Structure

```text
projetanuel2/
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── database.py
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── App.jsx
│   │   ├── FrontOffice.jsx
│   │   ├── BackOffice.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
└── quiz (5).sql
```

## Schema Docker

```text
Navigateur
    |
    | http://localhost:3000
    v
Frontend React / Vite
conteneur: frontend
port: 3000
    |
    | proxy /api vers http://backend:8000
    v
Backend FastAPI / Uvicorn
conteneur: backend
port: 8000
    |
    | lit et ecrit
    v
Volume Docker quiz-data
fichier: /data/quiz.db
    ^
    |
    | import au premier lancement si la base est vide
    |
quiz (5).sql
```

## Lancement avec Docker

```powershell
docker compose up --build
```

- Frontend : http://localhost:3000
- Backend : http://localhost:8000
- Documentation API : http://localhost:8000/docs

Pour arreter les conteneurs :

```powershell
docker compose down
```

La base SQLite est stockee dans le volume Docker `quiz-data`. Pour repartir d'une base vide et reimporter le dump SQL :

```powershell
docker compose down -v
docker compose up --build
```

## API

| Methode | Endpoint                        | Description                         |
|---------|---------------------------------|-------------------------------------|
| GET     | `/api/categories`               | Liste des categories distinctes     |
| GET     | `/api/question?categorie=<cat>` | Question aleatoire filtree ou non   |
| POST    | `/api/answer`                   | Verifie une reponse `{id, answer}`  |

## Back-office admin

Le bouton `Admin` dans l'interface ouvre un back-office pour gerer les questions :

- creer une question
- modifier une question existante
- supprimer une question
- consulter toutes les questions de la base

Endpoints utilises par le back-office :

| Methode | Endpoint                         | Description              |
|---------|----------------------------------|--------------------------|
| GET     | `/api/admin/questions`           | Liste toutes les questions |
| POST    | `/api/admin/questions`           | Cree une question        |
| PUT     | `/api/admin/questions/{id}`      | Modifie une question     |
| DELETE  | `/api/admin/questions/{id}`      | Supprime une question    |

## Frontend

Le frontend est separe en plusieurs fichiers :

- `frontend/src/App.jsx` : navigation entre le quiz et l'admin
- `frontend/src/FrontOffice.jsx` : selection de categorie, affichage des questions, score et feedback
- `frontend/src/BackOffice.jsx` : formulaire CRUD et tableau de gestion des questions

Les styles sont centralises dans `frontend/src/App.css`.

## Donnees

- 100 questions reparties en 10 categories : Geographie, Histoire, Sciences, Cinema, Musique, Technologie, Sports, Litterature, Nature, Gastronomie
- Bareme : 5 / 10 / 15 / 20 / 25 points selon la difficulte
