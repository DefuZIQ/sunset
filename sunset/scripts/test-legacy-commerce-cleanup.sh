#!/usr/bin/env sh
set -eu

bundle=${1:?Usage: test-legacy-commerce-cleanup.sh /absolute/sunset-cluster-directory}
bundle=$(realpath "$bundle")
test -d "$bundle"
(cd "$bundle" && sha256sum -c SHA256SUMS)

container="sunset-legacy-cleanup-drill-$$"
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM
docker run --rm -d --network none --name "$container" \
  -e POSTGRES_PASSWORD=legacy-cleanup-drill-only \
  -v "$bundle:/tmp/bundle:ro" postgres:16-alpine >/dev/null

ready=0
for _ in $(seq 1 60); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
test "$ready" -eq 1 || { echo 'Isolated PostgreSQL did not start' >&2; exit 1; }

for database in sunset sunset_commerce; do
  docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
    -c "CREATE DATABASE $database"
  docker exec "$container" pg_restore -U postgres -d "$database" \
    --no-owner --no-acl --exit-on-error "/tmp/bundle/$database.dump" >/dev/null
done

customer_counts="SELECT concat_ws(',',
  (SELECT count(*) FROM users),
  (SELECT count(*) FROM auth_sessions),
  (SELECT count(*) FROM customer_addresses),
  (SELECT count(*) FROM notifications),
  (SELECT count(*) FROM newsletter_subscriptions))"
before=$(docker exec "$container" psql -U postgres -d sunset -Atqc "$customer_counts")

docker exec -i "$container" psql -U postgres -d sunset -v ON_ERROR_STOP=1 -q \
  <"$(dirname "$0")/legacy-commerce-cleanup.sql"

after=$(docker exec "$container" psql -U postgres -d sunset -Atqc "$customer_counts")
test "$before" = "$after" || { echo 'Customer row counts changed' >&2; exit 1; }
customer_tables=$(docker exec "$container" psql -U postgres -d sunset -Atqc \
  "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
commerce_tables=$(docker exec "$container" psql -U postgres -d sunset_commerce -Atqc \
  "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
test "$customer_tables" -eq 16 || { echo 'Unexpected customer table count' >&2; exit 1; }
test "$commerce_tables" -eq 27 || { echo 'Unexpected commerce table count' >&2; exit 1; }
printf 'Legacy cleanup rehearsal passed: %s customer tables, %s commerce tables; customer counts %s\n' \
  "$customer_tables" "$commerce_tables" "$after"
