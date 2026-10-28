CREATE TABLE IF NOT EXISTS product_review_photos (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(16) NOT NULL,
    image_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_review_photos_owner
    ON product_review_photos(user_id, product_id, created_at);

CREATE INDEX IF NOT EXISTS idx_product_review_photos_created_at
    ON product_review_photos(created_at);
