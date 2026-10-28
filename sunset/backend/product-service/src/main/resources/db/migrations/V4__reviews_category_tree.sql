CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(220) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);

INSERT INTO categories (id, name, parent_id)
VALUES ('10000000-0000-0000-0000-000000000100', 'Женская одежда', NULL)
ON CONFLICT (name) DO NOTHING;

UPDATE categories
SET parent_id = (SELECT id FROM categories WHERE name = 'Женская одежда')
WHERE name IN ('Боди', 'Пиджаки', 'Платья', 'Джинсы', 'Кофты', 'Верхняя одежда')
  AND parent_id IS NULL;
