CREATE TABLE IF NOT EXISTS iam_staff_role_assignments (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role_code VARCHAR(40) NOT NULL CHECK (role_code IN ('OWNER', 'WAREHOUSE_ADMIN', 'STORE_MANAGER', 'CONTENT_MARKETING')),
    location_id UUID,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT iam_location_scope_required CHECK (
        (role_code IN ('WAREHOUSE_ADMIN', 'STORE_MANAGER') AND location_id IS NOT NULL)
        OR (role_code IN ('OWNER', 'CONTENT_MARKETING') AND location_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_iam_staff_role_location ON iam_staff_role_assignments(location_id);
