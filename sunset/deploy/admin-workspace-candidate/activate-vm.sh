#!/bin/sh
set -eu

cd /home/defuziq/sunset
compose=docker-compose.prod.yml
candidate=sunset-web:candidate-admin-workspace-20261021b
rollback=sunset-web:rollback-admin-workspace-20261021b

docker image inspect "$candidate" >/dev/null
docker compose -f "$compose" config --quiet
container=$(docker compose -f "$compose" ps -q web)
test -n "$container"
previous=$(docker inspect --format '{{.Image}}' "$container")
curl -fsS --max-time 15 http://127.0.0.1/admin/ >/dev/null
docker image tag "$previous" "$rollback"

restore() {
  docker image tag "$rollback" sunset-web:latest
  docker compose -f "$compose" up -d --no-deps --no-build --force-recreate --wait web
  curl -fsS --max-time 15 http://127.0.0.1/admin/ >/dev/null
}
trap 'result=$?; if [ "$result" -ne 0 ]; then restore; fi' EXIT

docker image tag "$candidate" sunset-web:latest
docker compose -f "$compose" up -d --no-deps --no-build --force-recreate --wait web
curl -fsS --max-time 15 http://127.0.0.1/admin/ | grep -q 'SUNSET CONTROL'
curl -fsS --max-time 15 http://127.0.0.1/ >/dev/null
trap - EXIT
printf 'Admin workspace active; rollback image: %s\n' "$rollback"
