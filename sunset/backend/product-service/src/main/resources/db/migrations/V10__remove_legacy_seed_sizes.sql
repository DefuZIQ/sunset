-- Remove the old generic XS–L rows from the seeded collection.
-- The gender/garment-specific rows added in V8 remain untouched.
DELETE FROM product_stock ps
USING sizes s
WHERE ps.size_id=s.id
  AND s.type='clothing'
  AND (ps.product_id::text LIKE '40000000-%' OR ps.product_id::text LIKE '41000000-%');
