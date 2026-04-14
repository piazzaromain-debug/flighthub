# TravelHub

Application web communautaire pour voyageurs : partage de bonnes adresses géolocalisées et signalement de présence pour rencontres.

## Stack

- **Backend** : Python 3.12 · FastAPI · SQLAlchemy async · PostGIS · JWT
- **Frontend** : HTML/CSS/JS vanilla · Leaflet.js
- **Infra** : Docker Compose (db PostGIS + backend + frontend nginx)

## Démarrage

```bash
docker compose up --build
```

Puis ouvrir http://localhost:3000

## Comptes seed

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@travelhub.com | admin123 | admin |
| alice@travelhub.com | alice123 | contributeur |
| bob@travelhub.com | bob123 | contributeur |

## Architecture

Voir `CLAUDE.md` pour la spécification complète.
