#!/usr/bin/env sh
set -eu

usage='Usage: test-commerce-runtime.sh /absolute/commerce.dump'
test "$#" -eq 1 || { echo "$usage" >&2; exit 2; }
commerce_dump=$(realpath "$1")
test -s "$commerce_dump" || { echo 'Commerce dump is missing or empty' >&2; exit 2; }

suffix=$$
network="sunset-commerce-runtime-$suffix"
db="sunset-commerce-db-$suffix"
product="sunset-commerce-product-$suffix"
order="sunset-commerce-order-$suffix"
cleanup() {
  docker rm -f "$order" "$product" "$db" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

docker network create --internal "$network" >/dev/null
docker run -d --network "$network" --name "$db" \
  -e POSTGRES_PASSWORD=commerce-drill-local-only \
  -v "$commerce_dump:/tmp/commerce.dump:ro" postgres:16-alpine >/dev/null
ready=0
for _ in $(seq 1 60); do
  if docker exec "$db" pg_isready -U postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
test "$ready" -eq 1 || { echo 'Isolated PostgreSQL did not start' >&2; exit 1; }
docker exec "$db" pg_restore -U postgres -d postgres --no-owner --no-acl --exit-on-error /tmp/commerce.dump >/dev/null
identity_tables=$(docker exec "$db" psql -U postgres -d postgres -Atqc \
  "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('users','auth_sessions','mfa_totp')")
test "$identity_tables" -eq 0 || { echo 'Identity tables remain in commerce dump' >&2; exit 1; }

common_secret=commerce-drill-secret-at-least-32-characters
for service in product order; do
  if [ "$service" = product ]; then name=$product; image=sunset-product-service; port=8082; path=/products/all;
  else name=$order; image=sunset-order-service; port=8083; path=/order/promotions; fi
  docker run -d --network "$network" --name "$name" \
    -e SPRING_DATASOURCE_URL="jdbc:postgresql://$db:5432/postgres" \
    -e SPRING_DATASOURCE_USERNAME=postgres \
    -e SPRING_DATASOURCE_PASSWORD=commerce-drill-local-only \
    -e SPRING_SECURITY_JWT_SECRET="$common_secret" \
    -e IAM_MODE=remote -e IAM_AUTH_URL=http://auth-not-present:8081 \
    -e CUSTOMER_PROFILE_MODE=remote -e CUSTOMER_PROFILE_AUTH_URL=http://auth-not-present:8081 \
    -e INTERNAL_IAM_SECRET="$common_secret" "$image" >/dev/null
  healthy=0
  for _ in $(seq 1 60); do
    if docker exec "$name" wget -qO /dev/null "http://localhost:$port/actuator/health" >/dev/null 2>&1; then
      healthy=1; break
    fi
    sleep 1
  done
  if [ "$healthy" -ne 1 ]; then
    docker logs --tail 30 "$name" >&2
    echo "$service service failed to start on isolated commerce database" >&2
    exit 1
  fi
  docker exec "$name" wget -qO /dev/null "http://localhost:$port$path"
  printf '%s service started and read commerce data without users table\n' "$service"
done
