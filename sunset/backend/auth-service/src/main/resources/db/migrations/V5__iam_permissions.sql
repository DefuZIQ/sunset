CREATE TABLE IF NOT EXISTS iam_user_permissions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(64) NOT NULL,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, permission),
    CONSTRAINT iam_permission_known CHECK (permission IN (
        'catalog:write', 'stock:write', 'orders:read', 'orders:manage',
        'reviews:moderate', 'promotions:manage', 'customers:read',
        'customers:bonuses:write', 'stores:manage'
    ))
);

CREATE TABLE IF NOT EXISTS iam_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_id UUID REFERENCES users(id) ON DELETE SET NULL,
    old_permissions TEXT NOT NULL,
    new_permissions TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
