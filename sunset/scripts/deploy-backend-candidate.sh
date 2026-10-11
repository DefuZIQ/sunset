#!/bin/sh
set -eu
COMPOSE_PROGRESS=plain
export COMPOSE_PROGRESS

mode=${1:-}
service=${2:-}
release=${3:-}
backup=${4:-}
project_dir=${5:-/home/defuziq/sunset}

case "$mode" in --check|--apply) ;; *) echo 'Usage: deploy-backend-candidate.sh --check|--apply SERVICE RELEASE BACKUP [PROJECT_DIR]' >&2; exit 2 ;; esac
case "$service" in auth-service|product-service|order-service|notification-service|api-gateway) ;; *) echo 'Unknown service' >&2; exit 2 ;; esac
case "$release" in ''|*[!a-zA-Z0-9._-]*) echo 'Invalid release tag' >&2; exit 2 ;; esac
test -f "$project_dir/docker-compose.prod.yml"
test -f "$backup"

cd "$project_dir"
docker info >/dev/null 2>&1
docker compose -f docker-compose.prod.yml config --quiet
"$project_dir/scripts/verify-backup.sh" "$backup"

image="sunset-$service"
candidate="$image:candidate-$release"
rollback_tag="$image:rollback-$release"
docker image inspect "$candidate" >/dev/null
if docker image inspect "$rollback_tag" >/dev/null 2>&1; then
  echo "Rollback tag already exists: $rollback_tag" >&2
  exit 1
fi

container=$(docker compose -f docker-compose.prod.yml ps -q "$service")
test -n "$container"
current_image=$(docker inspect --format '{{.Image}}' "$container")
current_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")
test "$current_health" = healthy
curl -fsS --max-time 15 -o /dev/null http://127.0.0.1/

printf 'Service: %s\nCurrent image: %s\nCandidate: %s\nRollback tag: %s\n' \
  "$service" "$current_image" "$candidate" "$rollback_tag"
if [ "$mode" = --check ]; then
  echo 'Preflight passed; no image or container changed.'
  exit 0
fi

rollback() {
  echo "Rollout failed; restoring $rollback_tag" >&2
  if docker image tag "$rollback_tag" "$image:latest" &&
     docker compose -f docker-compose.prod.yml up -d --no-deps --no-build --wait --force-recreate "$service"; then
    echo 'Rollback completed.' >&2
  else
    echo "Automatic rollback failed. Restore $rollback_tag manually." >&2
  fi
}

docker image tag "$current_image" "$rollback_tag"
docker image tag "$candidate" "$image:latest"
if ! docker compose -f docker-compose.prod.yml up -d --no-deps --no-build --wait --force-recreate "$service"; then
  rollback
  exit 1
fi
if ! curl -fsS --max-time 15 -o /dev/null http://127.0.0.1/; then
  rollback
  exit 1
fi
if [ "$service" = product-service ] || [ "$service" = api-gateway ]; then
  if ! curl -fsS --max-time 15 -o /dev/null http://127.0.0.1/products/all; then
    rollback
    exit 1
  fi
fi
echo "Rollout succeeded; previous image remains tagged $rollback_tag"
