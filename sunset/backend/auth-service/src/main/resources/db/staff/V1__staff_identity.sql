-- Target schema for a dedicated PostgreSQL staff database. This file is not
-- included in the current customer/shared-database Liquibase changelog.
-- Apply only through the future staff datasource after a verified backup.
CREATE TABLE staff_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    role_code VARCHAR(40) NOT NULL CHECK (role_code IN
        ('OWNER', 'ADMIN', 'WAREHOUSE_ADMIN', 'STORE_MANAGER', 'CONTENT_MARKETING', 'LEGACY_STAFF')),
    location_id UUID,
    disabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT staff_location_scope CHECK (
        (role_code IN ('WAREHOUSE_ADMIN', 'STORE_MANAGER') AND location_id IS NOT NULL)
        OR (role_code NOT IN ('WAREHOUSE_ADMIN', 'STORE_MANAGER') AND location_id IS NULL)
    )
);
CREATE UNIQUE INDEX staff_accounts_email_unique ON staff_accounts (lower(email));

CREATE TABLE staff_permissions (
    staff_id UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
    permission VARCHAR(64) NOT NULL,
    PRIMARY KEY (staff_id, permission),
    CONSTRAINT staff_permission_known CHECK (permission IN (
        'catalog:write', 'stock:write', 'orders:read', 'orders:manage',
        'reviews:moderate', 'promotions:manage', 'customers:read',
        'customers:bonuses:write', 'stores:manage'
    ))
);

CREATE TABLE staff_sessions (
    id UUID PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT staff_sessions_expiry CHECK (expires_at > issued_at)
);
CREATE INDEX staff_sessions_active_idx ON staff_sessions(staff_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE staff_mfa_totp (
    staff_id UUID PRIMARY KEY REFERENCES staff_accounts(id) ON DELETE CASCADE,
    secret_ciphertext TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_step BIGINT NOT NULL DEFAULT -1,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE staff_mfa_recovery_codes (
    staff_id UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
    code_hash CHAR(64) NOT NULL,
    PRIMARY KEY (staff_id, code_hash)
);
CREATE TABLE staff_mfa_login_challenges (
    token_hash CHAR(64) PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX staff_mfa_login_challenges_expiry_idx ON staff_mfa_login_challenges(expires_at);
CREATE TABLE staff_mfa_setup_challenges (
    token_hash CHAR(64) PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX staff_mfa_setup_challenges_expiry_idx ON staff_mfa_setup_challenges(expires_at);

CREATE TABLE staff_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_staff_id UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
    target_staff_id UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
    old_access TEXT NOT NULL,
    new_access TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX staff_access_audit_recent_idx ON staff_access_audit(occurred_at DESC, id DESC);
