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
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
└── quiz (5).sql
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

## Donnees

- 100 questions reparties en 10 categories : Geographie, Histoire, Sciences, Cinema, Musique, Technologie, Sports, Litterature, Nature, Gastronomie
- Bareme : 5 / 10 / 15 / 20 / 25 points selon la difficulte
