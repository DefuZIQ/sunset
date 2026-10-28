CREATE TABLE mfa_setup_challenges (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX mfa_setup_challenges_expiry_idx ON mfa_setup_challenges(expires_at);
