ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_store_id UUID REFERENCES stores(id);
CREATE INDEX IF NOT EXISTS idx_deliveries_pickup_store ON deliveries(pickup_store_id, order_id);
