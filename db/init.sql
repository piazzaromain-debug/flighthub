-- init.sql — Initialisation de la base TravelHub : extensions, tables, index, seed.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'lecteur',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE spots (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_spots_location ON spots USING GIST(location);
CREATE INDEX idx_spots_country_city ON spots(country, city);

CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    spot_id INTEGER REFERENCES spots(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(spot_id, user_id)
);

CREATE TABLE presences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    message VARCHAR(500),
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_presences_location ON presences USING GIST(location);
CREATE INDEX idx_presences_active ON presences(ends_at);

-- Admin seed : mot de passe "admin123" hashé bcrypt via pgcrypto (compatible passlib).
INSERT INTO users (email, password_hash, username, role) VALUES
('admin@travelhub.com', crypt('admin123', gen_salt('bf', 12)), 'admin', 'admin'),
('alice@travelhub.com', crypt('alice123', gen_salt('bf', 12)), 'alice', 'contributeur'),
('bob@travelhub.com',   crypt('bob123',   gen_salt('bf', 12)), 'bob',   'contributeur');

-- Spots d'exemple (Paris, Tokyo, New York)
INSERT INTO spots (title, description, category, country, city, location, author_id, score) VALUES
('Café de Flore', 'Café mythique de Saint-Germain-des-Prés.', 'restaurant', 'France', 'Paris',
    ST_GeogFromText('SRID=4326;POINT(2.3325 48.8540)'), 2, 5),
('Tour Eiffel — vue Trocadéro', 'Meilleur angle pour la photo, surtout au coucher du soleil.', 'astuce', 'France', 'Paris',
    ST_GeogFromText('SRID=4326;POINT(2.2880 48.8616)'), 2, 12),
('Métro Châtelet — attention pickpockets', 'Zone à surveiller, surtout aux heures de pointe.', 'danger', 'France', 'Paris',
    ST_GeogFromText('SRID=4326;POINT(2.3470 48.8584)'), 3, 3),
('Shibuya Crossing', 'Le carrefour le plus célèbre du monde.', 'activite', 'Japon', 'Tokyo',
    ST_GeogFromText('SRID=4326;POINT(139.7005 35.6595)'), 2, 20),
('Ichiran Ramen Shibuya', 'Ramen tonkotsu en cabine individuelle — file le matin.', 'restaurant', 'Japon', 'Tokyo',
    ST_GeogFromText('SRID=4326;POINT(139.7030 35.6614)'), 3, 15),
('Pass JR — à acheter avant arrivée', 'Indispensable pour les trajets longue distance en train.', 'info_locale', 'Japon', 'Tokyo',
    ST_GeogFromText('SRID=4326;POINT(139.7671 35.6812)'), 2, 8),
('Central Park — Bethesda Terrace', 'Superbe fontaine et architecture, cœur du parc.', 'activite', 'USA', 'New York',
    ST_GeogFromText('SRID=4326;POINT(-73.9710 40.7736)'), 3, 10),
('Joe''s Pizza — Greenwich Village', 'La slice new-yorkaise par excellence.', 'restaurant', 'USA', 'New York',
    ST_GeogFromText('SRID=4326;POINT(-74.0020 40.7305)'), 2, 7);
