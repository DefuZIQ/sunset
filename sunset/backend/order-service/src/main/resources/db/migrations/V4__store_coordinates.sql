CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    hours VARCHAR(255),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE stores ALTER COLUMN latitude TYPE NUMERIC(10,7);
ALTER TABLE stores ALTER COLUMN longitude TYPE NUMERIC(10,7);

UPDATE stores
SET latitude = 56.3269000, longitude = 44.0059000
WHERE city = 'Нижний Новгород' AND address = 'Большая Покровская, 34';
