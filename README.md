# Quiz MVP – Projet Annuel 2

Petit quiz à choix multiples (FR) avec un backend FastAPI et un frontend React.

## Stack

- **Backend** : Python, FastAPI, Uvicorn, SQLite (`backend/quiz.db`)
- **Frontend** : React 18, Vite
- **Données initiales** : `quiz (5).sql` (dump phpMyAdmin) → ré-importé automatiquement dans SQLite au premier lancement

## Structure

```
projetanuel2/
├── backend/
│   ├── main.py            # API FastAPI (3 endpoints)
│   ├── database.py        # Init SQLite + seed depuis le .sql
│   ├── requirements.txt   # fastapi, uvicorn
│   └── quiz.db            # généré au 1er run
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # UI complète (catégorie → question → résultat)
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js     # proxy /api → :8000
│   └── package.json
├── quiz (5).sql           # dump MySQL d'origine (100 questions)
└── start.ps1              # lance back + front en une commande
```

## Lancement

### En une commande (Windows)

```powershell
.\start.ps1
```

Le script tue les anciennes instances sur les ports 8000/3000, initialise la BDD, puis ouvre deux fenêtres PowerShell (backend + frontend).

### Manuellement

Backend :
```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Frontend :
```powershell
cd frontend
npm install
npm run dev
```

- Frontend : http://localhost:3000
- Backend  : http://localhost:8000 (docs auto : `/docs`)

## API

| Méthode | Endpoint                          | Description                          |
|---------|-----------------------------------|--------------------------------------|
| GET     | `/api/categories`                 | Liste des catégories distinctes      |
| GET     | `/api/question?categorie=<cat>`   | Question aléatoire (filtrée ou non)  |
| POST    | `/api/answer`                     | Vérifie une réponse `{id, answer}`   |

## Données

- **100 questions** réparties en 10 catégories : Géographie, Histoire, Sciences, Cinéma, Musique, Technologie, Sports, Littérature, Nature, Gastronomie
- Barème : 5 / 10 / 15 / 20 / 25 points selon la difficulté
