#!/usr/bin/env sh
set -eu
umask 077

usage='Usage: test-commerce-extraction.sh /absolute/source.dump /absolute/commerce.dump'
test "$#" -eq 2 || { echo "$usage" >&2; exit 2; }
source_dump=$(realpath "$1")
target_dump=$2
test -s "$source_dump" || { echo 'Source dump is missing or empty' >&2; exit 2; }
case "$target_dump" in /*) ;; *) echo 'Output path must be absolute' >&2; exit 2 ;; esac
test ! -e "$target_dump" || { echo 'Output dump already exists' >&2; exit 2; }
test -d "$(dirname "$target_dump")" || { echo 'Output directory does not exist' >&2; exit 2; }

container="sunset-commerce-drill-$$"
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM

docker run --rm -d --network none --name "$container" \
  -e POSTGRES_PASSWORD=commerce-drill-local-only \
  -v "$source_dump:/tmp/source.dump:ro" postgres:16-alpine >/dev/null

ready=0
for _ in $(seq 1 60); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
test "$ready" -eq 1 || { echo 'Isolated PostgreSQL did not start' >&2; exit 1; }
docker exec "$container" pg_restore -l /tmp/source.dump >/dev/null
docker exec "$container" pg_restore -U postgres -d postgres --no-owner --no-acl --exit-on-error /tmp/source.dump >/dev/null

counts_sql="SELECT string_agg(table_name || ':' || row_count, ',' ORDER BY table_name) FROM (
  SELECT 'categories' AS table_name, count(*)::text AS row_count FROM categories UNION ALL
  SELECT 'products', count(*)::text FROM products UNION ALL
  SELECT 'product_stock', count(*)::text FROM product_stock UNION ALL
  SELECT 'location_stock', count(*)::text FROM location_stock UNION ALL
  SELECT 'stores', count(*)::text FROM stores UNION ALL
  SELECT 'orders', count(*)::text FROM orders UNION ALL
  SELECT 'order_items', count(*)::text FROM order_items UNION ALL
  SELECT 'payments', count(*)::text FROM payments UNION ALL
  SELECT 'deliveries', count(*)::text FROM deliveries UNION ALL
  SELECT 'loyalty_accounts', count(*)::text FROM loyalty_accounts UNION ALL
  SELECT 'loyalty_transactions', count(*)::text FROM loyalty_transactions UNION ALL
  SELECT 'promotions', count(*)::text FROM promotions UNION ALL
  SELECT 'product_reviews', count(*)::text FROM product_reviews UNION ALL
  SELECT 'review_comments', count(*)::text FROM review_comments UNION ALL
  SELECT 'return_requests', count(*)::text FROM return_requests
) rows"
before=$(docker exec "$container" psql -U postgres -d postgres -Atqc "$counts_sql")

docker exec -i "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<'SQL'
BEGIN;
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_constraint
      WHERE contype = 'f' AND confrelid = 'users'::regclass
        AND conrelid::regclass::text IN
          ('loyalty_accounts','loyalty_transactions','product_review_photos','product_reviews','review_comments')) <> 5 THEN
    RAISE EXCEPTION 'Expected exactly five commerce foreign keys to users';
  END IF;
END
$$;
ALTER TABLE loyalty_accounts DROP CONSTRAINT loyalty_accounts_user_id_fkey;
ALTER TABLE loyalty_transactions DROP CONSTRAINT loyalty_transactions_user_id_fkey;
ALTER TABLE product_review_photos DROP CONSTRAINT product_review_photos_user_id_fkey;
ALTER TABLE product_reviews DROP CONSTRAINT product_reviews_user_id_fkey;
ALTER TABLE review_comments DROP CONSTRAINT review_comments_user_id_fkey;
DROP TABLE auth_sessions, customer_addresses, iam_access_audit,
  iam_staff_role_assignments, iam_user_permissions,
  mfa_login_challenges, mfa_recovery_codes, mfa_setup_challenges, mfa_totp,
  user_roles, roles, newsletter_subscriptions, notifications, users RESTRICT;
COMMIT;
SQL

after=$(docker exec "$container" psql -U postgres -d postgres -Atqc "$counts_sql")
test "$before" = "$after" || { echo 'Commerce row counts changed during extraction' >&2; exit 1; }
remaining=$(docker exec "$container" psql -U postgres -d postgres -Atqc "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('users','auth_sessions','mfa_totp','notifications','newsletter_subscriptions')")
test "$remaining" -eq 0 || { echo 'Identity or notification tables remain in commerce copy' >&2; exit 1; }

docker exec "$container" pg_dump -Fc -U postgres -d postgres >"$target_dump"
test -s "$target_dump" || { echo 'Sanitized dump is empty' >&2; exit 1; }
docker exec -i "$container" pg_restore -l <"$target_dump" >/dev/null
printf 'Commerce extraction passed. Rows: %s\nOutput: %s\n' "$after" "$target_dump"
