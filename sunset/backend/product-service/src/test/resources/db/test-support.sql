CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Product reviews refer to the auth-service table in the shared production database.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100),
    last_name VARCHAR(100)
);
