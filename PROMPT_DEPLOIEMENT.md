# PROMPT DE DÉPLOIEMENT — TravelHub

Colle ce prompt dans Claude Code après avoir placé le CLAUDE.md à la racine de ton projet.

---

## Prompt à copier :

```
Lis le fichier CLAUDE.md à la racine du projet. C'est la spécification complète de l'application TravelHub.

Implémente le projet complet en suivant EXACTEMENT l'architecture, les modèles de données, les endpoints API et la configuration Docker décrits dans le CLAUDE.md.

Procède dans cet ordre strict :

### Phase 1 — Infrastructure
1. Crée le `docker-compose.yml` tel que décrit.
2. Crée le fichier `.env` avec les valeurs par défaut.
3. Crée `db/init.sql` : extension PostGIS, toutes les tables avec index, seed admin (hash bcrypt du mot de passe `admin123`), et 8 spots d'exemple répartis sur Paris, Tokyo et New York avec des coordonnées GPS réelles.

### Phase 2 — Backend
4. Crée `backend/Dockerfile` et `backend/requirements.txt`.
5. Implémente `app/config.py` (lecture des variables d'environnement via pydantic-settings).
6. Implémente `app/database.py` (engine async SQLAlchemy + session maker).
7. Implémente tous les modèles dans `app/models/` (User, Spot, Vote, Presence) avec les colonnes exactes du CLAUDE.md. Utilise GeoAlchemy2 pour les colonnes GEOGRAPHY.
8. Implémente tous les schémas Pydantic dans `app/schemas/`.
9. Implémente `app/services/auth_service.py` : hash_password, verify_password, create_access_token, decode_access_token. Utilise passlib/bcrypt et python-jose.
10. Implémente `app/services/geo_service.py` : fonctions pour requêtes spatiales (spots dans un rayon, spots dans une bounding box).
11. Implémente `app/middleware/auth.py` : dépendances FastAPI `get_current_user` et `require_role(role)`.
12. Implémente tous les routers dans `app/routers/` en respectant exactement les endpoints, les rôles minimum et les règles métier du CLAUDE.md.
13. Implémente `app/main.py` : app FastAPI, inclusion des routers sous le préfixe `/api`, configuration CORS.

### Phase 3 — Frontend
14. Crée `frontend/Dockerfile` et `frontend/nginx.conf` (proxy `/api/` vers le backend).
15. Crée `frontend/index.html` : structure SPA avec zones pour la carte, le drawer latéral, et les modales.
16. Crée `frontend/css/style.css` : thème voyage (palette sable/terre cuite + bleu profond), responsive mobile-first, animations pour le drawer et les marqueurs.
17. Crée `frontend/js/api.js` : wrapper fetch qui injecte automatiquement le JWT depuis localStorage, gère les erreurs 401 (redirect login).
18. Crée `frontend/js/app.js` : hash-router gérant les vues `#login`, `#register`, `#map`, `#spot/:id`, `#admin`, `#presence`.
19. Crée `frontend/js/auth.js` : formulaires login/register, stockage du JWT, affichage conditionnel selon le rôle.
20. Crée `frontend/js/map.js` : carte Leaflet plein écran, chargement des spots comme marqueurs (icônes par catégorie, couleur par score), clustering si beaucoup de points, popup au clic avec résumé + lien détail.
21. Crée `frontend/js/spots.js` : formulaire de création de spot (avec sélection du point sur la carte), vue détail avec votes, liste filtrée dans le drawer.
22. Crée `frontend/js/votes.js` : boutons upvote/downvote sur chaque spot, mise à jour du score en temps réel dans l'UI.
23. Crée `frontend/js/presences.js` : formulaire "Je suis là" (clic sur carte + durée + message), affichage des présences actives comme cercles pulsants sur la carte.
24. Crée `frontend/js/admin.js` : tableau des utilisateurs avec changement de rôle et suppression.

### Phase 4 — Vérification
25. Vérifie que `docker compose up --build` lance les 3 services sans erreur.
26. Vérifie que la page s'affiche sur http://localhost:3000.
27. Vérifie que le login admin fonctionne (admin@travelhub.com / admin123).
28. Vérifie que les spots seed s'affichent sur la carte.

Chaque fichier doit avoir un commentaire en-tête expliquant son rôle. Tout le code Python doit utiliser les type hints et async/await. Gère les erreurs proprement avec des HTTPException et des messages clairs.
```

---

## Comment l'utiliser

1. Crée un dossier vide pour ton projet :
   ```bash
   mkdir travelhub && cd travelhub
   ```

2. Place le fichier `CLAUDE.md` à la racine :
   ```bash
   # Copie le CLAUDE.md dans travelhub/CLAUDE.md
   ```

3. Ouvre Claude Code dans ce dossier :
   ```bash
   claude
   ```

4. Colle le prompt ci-dessus.

5. Une fois tout généré, lance :
   ```bash
   docker compose up --build
   ```

6. Ouvre ton navigateur sur **http://localhost:3000**

7. Connecte-toi avec `admin@travelhub.com` / `admin123`

---

## Itérations suggérées après le déploiement initial

Une fois que la base fonctionne, tu peux demander à Claude Code des améliorations par étapes :

- **"Ajoute un système de recherche par pays/ville avec autocomplétion dans le drawer"**
- **"Ajoute des notifications toast quand un vote est enregistré ou qu'un spot est créé"**
- **"Ajoute un filtre par catégorie sur la carte avec des toggles visuels"**
- **"Ajoute la géolocalisation du navigateur pour centrer la carte sur ma position"**
- **"Ajoute un mode sombre"**
- **"Ajoute l'export des spots favoris en PDF"**
