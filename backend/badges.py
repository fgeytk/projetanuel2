BADGES = [
    {
        "code": "first_game",
        "name": "Première partie",
        "description": "Termine ta première partie.",
        "icon": "🎮",
    },
    {
        "code": "streak_10",
        "name": "Habitué",
        "description": "Joue 10 parties.",
        "icon": "🔥",
    },
    {
        "code": "perfect",
        "name": "Sans-faute",
        "description": "Réalise un score parfait sur une partie.",
        "icon": "💯",
    },
    {
        "code": "polyglot",
        "name": "Touche-à-tout",
        "description": "Joue dans toutes les catégories disponibles.",
        "icon": "🧭",
    },
    {
        "code": "donor_100",
        "name": "Généreux",
        "description": "Cumule 100 points solidaires.",
        "icon": "💖",
    },
    {
        "code": "accepted_explainer",
        "name": "Orateur validé",
        "description": "Fais valider une explication par la communauté.",
        "icon": "🗣️",
    },
]

BADGES_BY_CODE = {badge["code"]: badge for badge in BADGES}


def evaluate_badges(stats: dict) -> list[str]:
    """Return the list of badge codes earned for the given aggregate stats."""
    earned = []

    if stats.get("games", 0) >= 1:
        earned.append("first_game")
    if stats.get("games", 0) >= 10:
        earned.append("streak_10")
    if stats.get("perfectGames", 0) >= 1:
        earned.append("perfect")
    total_categories = stats.get("totalCategories", 0)
    if total_categories > 0 and stats.get("distinctCategories", 0) >= total_categories:
        earned.append("polyglot")
    if stats.get("donationPoints", 0) >= 100:
        earned.append("donor_100")
    if stats.get("acceptedExplanations", 0) >= 1:
        earned.append("accepted_explainer")

    return earned
