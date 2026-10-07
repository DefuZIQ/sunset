CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(60) NOT NULL,
    city VARCHAR(120) NOT NULL,
    street VARCHAR(160) NOT NULL,
    house VARCHAR(40) NOT NULL,
    building VARCHAR(40),
    structure VARCHAR(40),
    entrance VARCHAR(40),
    floor VARCHAR(40),
    apartment VARCHAR(40),
    intercom VARCHAR(60),
    postal_code VARCHAR(20),
    comment VARCHAR(500),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX customer_addresses_user_idx ON customer_addresses(user_id, created_at);
