ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS store_reply TEXT;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS store_replied_at TIMESTAMPTZ;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS store_replied_by UUID;
