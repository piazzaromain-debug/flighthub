# CLAUDE.md — TravelHub

## Vision du Projet

**TravelHub** est une application web communautaire permettant aux voyageurs de :
1. **Partager et découvrir** des bonnes adresses et infos utiles par destination (pays/ville), navigables sur une carte interactive.
2. **Se signaler présent** sur une localisation pendant une durée définie pour proposer des rencontres entre voyageurs.

Les contenus sont évalués par la communauté (système de votes). L'accès est contrôlé par 3 rôles : **Admin**, **Contributeur**, **Lecteur**.

---

## Stack Technique

| Couche | Technologie | Justification |
|---|---|---|
| **Frontend** | HTML/CSS/JS vanilla + Leaflet.js | Simple, pas de build, compatible Docker facilement |
| **Backend** | Python / FastAPI | Léger, moderne, async, bon écosystème |
| **Base de données** | PostgreSQL 16 + PostGIS | Standard, extension géospatiale native |
| **Auth** | JWT (email/mot de passe) avec bcrypt | Basique et sécurisé |
| **Conteneurisation** | Docker Compose | Orchestration locale sur macOS |
| **Carte** | Leaflet.js + OpenStreetMap tiles | Gratuit, open-source, pas de clé API |

---

## Architecture

```
travelhub/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py              # Point d'entrée FastAPI
│   │   ├── config.py            # Variables d'environnement / settings
│   │   ├── database.py          # Connexion SQLAlchemy + session
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # Modèle User (id, email, password_hash, role, created_at)
│   │   │   ├── spot.py          # Modèle Spot (id, titre, description, catégorie, lat, lng, pays, ville, auteur_id, created_at)
│   │   │   ├── vote.py          # Modèle Vote (id, spot_id, user_id, valeur +1/-1, created_at)
│   │   │   └── presence.py      # Modèle Presence (id, user_id, lat, lng, message, début, fin, created_at)
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # Pydantic : UserCreate, UserLogin, UserOut
│   │   │   ├── spot.py          # Pydantic : SpotCreate, SpotOut, SpotDetail
│   │   │   ├── vote.py          # Pydantic : VoteCreate, VoteOut
│   │   │   └── presence.py      # Pydantic : PresenceCreate, PresenceOut
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # POST /auth/register, POST /auth/login
│   │   │   ├── spots.py         # CRUD spots + GET géospatial
│   │   │   ├── votes.py         # POST /spots/{id}/vote
│   │   │   ├── presences.py     # CRUD présences actives
│   │   │   └── admin.py         # Gestion users (admin only)
│   │   ├── services/
│   │   │   ├── auth_service.py  # Hash, verify, create_token, decode_token
│   │   │   └── geo_service.py   # Requêtes PostGIS (rayon, bbox)
│   │   └── middleware/
│   │       └── auth.py          # Dépendance FastAPI : get_current_user, require_role
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf               # Serveur statique nginx
│   ├── index.html               # SPA point d'entrée
│   ├── css/
│   │   └── style.css            # Styles globaux
│   ├── js/
│   │   ├── app.js               # Router client-side (hash-based)
│   │   ├── api.js               # Fetch wrapper avec JWT auto-inject
│   │   ├── auth.js              # Pages login/register
│   │   ├── map.js               # Carte Leaflet principale
│   │   ├── spots.js             # Gestion des spots (CRUD, affichage)
│   │   ├── votes.js             # Système de votes
│   │   ├── presences.js         # Marquage présence
│   │   └── admin.js             # Panel admin
│   └── assets/
│       └── icons/               # Marqueurs custom pour la carte
├── db/
│   └── init.sql                 # Script init : extension PostGIS + tables + admin seed
└── .env                         # Variables d'environnement
```

---

## Modèle de Données

### Table `users`
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'lecteur',  -- 'admin', 'contributeur', 'lecteur'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table `spots`
```sql
CREATE TABLE spots (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,  -- 'restaurant', 'hotel', 'activite', 'transport', 'info_locale', 'danger', 'astuce'
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    score INTEGER DEFAULT 0,  -- Cache du score calculé
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_spots_location ON spots USING GIST(location);
CREATE INDEX idx_spots_country_city ON spots(country, city);
```

### Table `votes`
```sql
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    spot_id INTEGER REFERENCES spots(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(spot_id, user_id)  -- Un vote par user par spot
);
```

### Table `presences`
```sql
CREATE TABLE presences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    message VARCHAR(500),  -- "Dispo pour un café !" etc.
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_presences_location ON presences USING GIST(location);
CREATE INDEX idx_presences_active ON presences(ends_at);
```

---

## API Endpoints

### Auth
| Méthode | Route | Rôle min. | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Inscription (rôle par défaut : lecteur) |
| POST | `/api/auth/login` | public | Login → retourne JWT |
| GET | `/api/auth/me` | lecteur | Profil utilisateur courant |

### Spots
| Méthode | Route | Rôle min. | Description |
|---|---|---|---|
| GET | `/api/spots` | lecteur | Liste spots (filtres : country, city, category, bbox) |
| GET | `/api/spots/nearby?lat=X&lng=Y&radius=Z` | lecteur | Spots dans un rayon (PostGIS) |
| GET | `/api/spots/{id}` | lecteur | Détail d'un spot avec votes |
| POST | `/api/spots` | contributeur | Créer un spot |
| PUT | `/api/spots/{id}` | contributeur (auteur) / admin | Modifier un spot |
| DELETE | `/api/spots/{id}` | contributeur (auteur) / admin | Supprimer un spot |

### Votes
| Méthode | Route | Rôle min. | Description |
|---|---|---|---|
| POST | `/api/spots/{id}/vote` | lecteur | Voter (+1 ou -1), toggle si déjà voté |

### Présences
| Méthode | Route | Rôle min. | Description |
|---|---|---|---|
| GET | `/api/presences/active?lat=X&lng=Y&radius=Z` | lecteur | Présences actives à proximité |
| POST | `/api/presences` | contributeur | Se marquer présent |
| DELETE | `/api/presences/{id}` | contributeur (auteur) / admin | Annuler sa présence |

### Admin
| Méthode | Route | Rôle min. | Description |
|---|---|---|---|
| GET | `/api/admin/users` | admin | Liste tous les utilisateurs |
| PUT | `/api/admin/users/{id}/role` | admin | Changer le rôle d'un user |
| DELETE | `/api/admin/users/{id}` | admin | Supprimer un utilisateur |

---

## Règles Métier

1. **Inscription** : tout nouvel utilisateur est `lecteur` par défaut. Seul un admin peut promouvoir en `contributeur` ou `admin`.
2. **Votes** : tous les inscrits (y compris lecteurs) peuvent voter. Un seul vote par spot par utilisateur. Revoter inverse le vote.
3. **Score** : le champ `score` sur `spots` est mis à jour à chaque vote (trigger ou calcul côté API).
4. **Présences** : durée max 24h. Les présences expirées ne sont plus retournées par l'API. Un cron ou un filtre SQL `WHERE ends_at > NOW()` suffit.
5. **Spots** : un contributeur ne peut modifier/supprimer que ses propres spots. Un admin peut tout modifier/supprimer.
6. **Sécurité** : mots de passe hashés avec bcrypt (coût 12). JWT expire après 24h. CORS configuré pour le frontend uniquement.

---

## Configuration Docker

### docker-compose.yml
```yaml
version: "3.8"

services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: travelhub
      POSTGRES_USER: travelhub
      POSTGRES_PASSWORD: ${DB_PASSWORD:-travelhub_dev}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U travelhub"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://travelhub:${DB_PASSWORD:-travelhub_dev}@db:5432/travelhub
      JWT_SECRET: ${JWT_SECRET:-dev_secret_change_me}
      CORS_ORIGINS: http://localhost:3000
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend/app:/app/app  # Hot reload en dev

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

### backend/Dockerfile
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### backend/requirements.txt
```
fastapi==0.115.*
uvicorn[standard]==0.34.*
sqlalchemy[asyncio]==2.0.*
asyncpg==0.30.*
geoalchemy2==0.15.*
pydantic==2.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
python-multipart==0.0.*
```

### frontend/Dockerfile
```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
```

### frontend/nginx.conf
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Variables d'Environnement (.env)
```env
DB_PASSWORD=travelhub_dev
JWT_SECRET=change_this_to_a_random_string_in_prod
```

---

## UI / Frontend — Directives de Design

- **Carte** : plein écran avec panneau latéral rétractable (drawer). Leaflet.js + tuiles OpenStreetMap.
- **Marqueurs** : icônes différentes par catégorie de spot. Couleur reflète le score (vert = positif, rouge = négatif).
- **Présences** : cercles pulsants sur la carte avec avatar/initiales.
- **Navigation** : hash-router (`#login`, `#map`, `#spot/123`, `#admin`).
- **Responsive** : mobile-first, le drawer passe en bottom-sheet sur mobile.
- **Thème** : palette voyage/exploration — tons sable/terre cuite avec accents bleu profond.

---

## Seed Data (init.sql)

Le script `db/init.sql` doit :
1. Activer l'extension PostGIS.
2. Créer les tables ci-dessus.
3. Insérer un utilisateur admin : `admin@travelhub.com` / `admin123` (hashé bcrypt).
4. Insérer 5-10 spots d'exemple à Paris, Tokyo, New York pour démonstration.

---

## Commandes de Développement

```bash
# Lancer tout le stack
docker compose up --build

# Reconstruire un seul service
docker compose up --build backend

# Voir les logs
docker compose logs -f backend

# Accéder à la DB
docker compose exec db psql -U travelhub -d travelhub

# Arrêter et nettoyer
docker compose down -v
```

---

## Contraintes Techniques

- **Pas de framework JS** côté frontend (pas de React/Vue/Angular). Vanilla JS uniquement.
- **Pas de ORM lourd** : SQLAlchemy en mode Core ou léger. Les requêtes PostGIS complexes en SQL brut si besoin.
- **Pas de service externe** : tout tourne en local dans Docker. Pas de clé API tierce.
- **Python 3.12+**, type hints partout, async/await pour les routes et la DB.
- **Chaque fichier** doit avoir un commentaire en-tête expliquant son rôle.
- **Gestion d'erreurs** : chaque route retourne des codes HTTP appropriés avec messages explicites.
