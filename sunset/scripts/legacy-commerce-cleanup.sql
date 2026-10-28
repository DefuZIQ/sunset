-- Apply only after a verified three-database backup and a successful isolated
-- runtime rehearsal. RESTRICT aborts if customer-owned objects depend on these.
BEGIN;
DO $$
DECLARE
  expected text[] := ARRAY[
    'categories','colors','deliveries','images','location_stock',
    'loyalty_accounts','loyalty_transactions','order_events','order_items',
    'orders','payments','product_categories','product_colors',
    'product_images','product_review_helpful_votes','product_review_photos',
    'product_reviews','product_stock','products','promotions',
    'return_requests','review_comments','sizes','stock_reservations','stores'
  ];
  present text[];
BEGIN
  IF current_database() <> 'sunset' THEN
    RAISE EXCEPTION 'Legacy cleanup is allowed only in the sunset customer database';
  END IF;
  SELECT array_agg(tablename ORDER BY tablename) INTO present
  FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY(expected);
  IF present IS DISTINCT FROM (SELECT array_agg(name ORDER BY name) FROM unnest(expected) name) THEN
    RAISE EXCEPTION 'Legacy commerce table set is incomplete; aborting';
  END IF;
END $$;
DROP TABLE categories, colors, deliveries, images, location_stock,
  loyalty_accounts, loyalty_transactions, order_events, order_items,
  orders, payments, product_categories, product_colors, product_images,
  product_review_helpful_votes, product_review_photos, product_reviews,
  product_stock, products, promotions, return_requests, review_comments,
  sizes, stock_reservations, stores RESTRICT;
COMMIT;
