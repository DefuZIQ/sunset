CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT auth_sessions_expiry CHECK (expires_at > issued_at)
);

CREATE INDEX auth_sessions_user_active_idx ON auth_sessions(user_id, expires_at)
    WHERE revoked_at IS NULL;
