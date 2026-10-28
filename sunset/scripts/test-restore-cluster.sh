#!/usr/bin/env sh
set -eu

bundle=${1:?Usage: test-restore-cluster.sh /absolute/sunset-cluster-directory}
bundle=$(realpath "$bundle")
test -d "$bundle"
(cd "$bundle" && sha256sum -c SHA256SUMS)

container="sunset-cluster-restore-$$"
cleanup() { docker stop "$container" > /dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM
docker run --rm -d --network none --name "$container" \
  -e POSTGRES_PASSWORD=cluster-restore-drill-only \
  -v "$bundle:/tmp/bundle:ro" postgres:16-alpine > /dev/null

ready=0
for _ in $(seq 1 60); do
  if docker exec "$container" pg_isready -U postgres > /dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
test "$ready" -eq 1 || { echo 'Restore PostgreSQL did not start' >&2; exit 1; }

for database in sunset sunset_staff sunset_commerce; do
  docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
    -c "CREATE DATABASE $database"
  docker exec "$container" pg_restore -U postgres -d "$database" \
    --no-owner --no-acl --exit-on-error "/tmp/bundle/$database.dump" > /dev/null
  table_count=$(docker exec "$container" psql -U postgres -d "$database" -Atqc \
    "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
  test "$table_count" -gt 0 || { echo "No tables restored for $database" >&2; exit 1; }
  printf '%s restored: %s tables\n' "$database" "$table_count"
done

commerce_users=$(docker exec "$container" psql -U postgres -d sunset_commerce -Atqc \
  "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='users'")
test "$commerce_users" -eq 0 || { echo 'Customer users leaked into commerce backup' >&2; exit 1; }
legacy_commerce=$(docker exec "$container" psql -U postgres -d sunset -Atqc \
  "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('products','orders','product_stock','loyalty_transactions')")
test "$legacy_commerce" -eq 0 || { echo 'Legacy commerce tables remain in customer backup' >&2; exit 1; }
products=$(docker exec "$container" psql -U postgres -d sunset_commerce -Atqc \
  'SELECT count(*) FROM products')
orders=$(docker exec "$container" psql -U postgres -d sunset_commerce -Atqc \
  'SELECT count(*) FROM orders')
printf 'Cluster restore passed: %s products, %s orders\n' "$products" "$orders"
