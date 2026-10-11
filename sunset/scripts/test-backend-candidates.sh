#!/bin/sh
set -eu

backup=${1:?Usage: test-backend-candidates.sh BACKUP RELEASE [PROJECT_DIR]}
release=${2:?Usage: test-backend-candidates.sh BACKUP RELEASE [PROJECT_DIR]}
project_dir=${3:-/home/defuziq/sunset}
case "$release" in *[!a-zA-Z0-9._-]*|'') echo 'Invalid release tag' >&2; exit 2 ;; esac

backup=$(realpath "$backup")
"$project_dir/scripts/verify-backup.sh" "$backup"
for service in auth-service product-service order-service notification-service api-gateway; do
  docker image inspect "sunset-$service:candidate-$release" >/dev/null
done

network="sunset-candidate-$$"
postgres="$network-postgres"
cleanup() {
  for service in auth-service product-service order-service notification-service api-gateway; do
    docker rm -f "$network-$service" >/dev/null 2>&1 || true
  done
  docker rm -f -v "$postgres" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

docker network create --internal "$network" >/dev/null
docker run -d --network "$network" --network-alias postgres --name "$postgres" \
  -e POSTGRES_PASSWORD=stage-only-local \
  -v "$backup:/tmp/backup.sql.gz:ro" postgres:16-alpine >/dev/null

ready=0
for _ in $(seq 1 60); do
  if docker exec "$postgres" pg_isready -U postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
test "$ready" -eq 1
docker exec "$postgres" sh -c \
  'gzip -dc /tmp/backup.sql.gz | psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q' >/dev/null

start_service() {
  service=$1
  port=$2
  container="$network-$service"
  if [ "$service" = api-gateway ]; then
    docker run -d --network "$network" --network-alias "$service" --name "$container" \
      -e JWT_SECRET=stage-only-0123456789-abcdef-0123456789 \
      -e MANAGEMENT_TRACING_ENABLED=false \
      "sunset-$service:candidate-$release" >/dev/null
  else
    docker run -d --network "$network" --network-alias "$service" --name "$container" \
      -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/postgres \
      -e SPRING_DATASOURCE_USERNAME=postgres \
      -e SPRING_DATASOURCE_PASSWORD=stage-only-local \
      -e SPRING_SECURITY_JWT_SECRET=stage-only-0123456789-abcdef-0123456789 \
      -e MANAGEMENT_TRACING_ENABLED=false \
      "sunset-$service:candidate-$release" >/dev/null
  fi
  ready=0
  for _ in $(seq 1 60); do
    if docker exec "$container" wget -qO- "http://127.0.0.1:$port/actuator/health" 2>/dev/null | grep -q '"UP"'; then
      ready=1
      break
    fi
    if [ "$(docker inspect --format '{{.State.Status}}' "$container")" = exited ]; then break; fi
    sleep 2
  done
  if [ "$ready" -ne 1 ]; then
    echo "Candidate failed: $service" >&2
    docker logs --tail 30 "$container" >&2
    exit 1
  fi
  printf 'Healthy candidate: %s\n' "$service"
}

start_service auth-service 8081
start_service product-service 8082
start_service order-service 8083
start_service notification-service 8084
start_service api-gateway 8080
docker exec "$network-api-gateway" wget -qO- http://127.0.0.1:8080/products/all | grep -q '\['
docker exec "$network-api-gateway" wget -qO- http://127.0.0.1:8080/api/v1/products/all | grep -q '\['
printf 'All backend candidates passed on an isolated production backup: %s\n' "$release"
