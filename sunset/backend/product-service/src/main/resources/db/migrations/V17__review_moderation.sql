ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS moderated_by UUID;

CREATE INDEX IF NOT EXISTS idx_product_reviews_visible_product
    ON product_reviews(product_id, created_at DESC) WHERE NOT is_hidden;
