CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    hours VARCHAR(255),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE stores ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'STORE';

INSERT INTO stores(id, name, city, address, active, kind)
VALUES ('00000000-0000-4000-8000-000000000001', 'Центральный склад', 'Нижний Новгород', '', TRUE, 'WAREHOUSE')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS location_stock (
    location_id UUID NOT NULL REFERENCES stores(id),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_id UUID NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (location_id, product_id, size_id, color_id)
);

INSERT INTO location_stock(location_id, product_id, size_id, color_id, quantity)
SELECT '00000000-0000-4000-8000-000000000001', ps.product_id, ps.size_id, ps.color_id, ps.quantity
FROM product_stock ps
WHERE NOT EXISTS (
    SELECT 1 FROM location_stock ls
    WHERE ls.product_id=ps.product_id AND ls.size_id=ps.size_id AND ls.color_id=ps.color_id
)
ON CONFLICT (location_id, product_id, size_id, color_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_location_stock_product ON location_stock(product_id);
