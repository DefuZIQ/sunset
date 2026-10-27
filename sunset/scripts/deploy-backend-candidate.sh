#!/bin/sh
set -eu
COMPOSE_PROGRESS=plain
export COMPOSE_PROGRESS

mode=${1:-}
service=${2:-}
release=${3:-}
backup=${4:-}
project_dir=${5:-/home/defuziq/sunset}
env_file=${SUNSET_ENV_FILE:-$project_dir/.env}

case "$mode" in --check|--apply) ;; *) echo 'Usage: deploy-backend-candidate.sh --check|--apply SERVICE RELEASE CLUSTER_BACKUP [PROJECT_DIR]' >&2; exit 2 ;; esac
case "$service" in auth-service|staff-auth-service|product-service|order-service|notification-service|api-gateway|web) ;; *) echo 'Unknown service' >&2; exit 2 ;; esac
case "$release" in ''|*[!a-zA-Z0-9._-]*) echo 'Invalid release tag' >&2; exit 2 ;; esac
test -f "$project_dir/docker-compose.prod.yml"
test -r "$env_file"
env_file=$(realpath "$env_file")
sh "$project_dir/scripts/verify-cluster-backup.sh" "$backup"

cd "$project_dir"
docker info >/dev/null 2>&1
compose() { docker compose -p sunset --env-file "$env_file" -f docker-compose.prod.yml "$@"; }
compose config --quiet
if [ "$service" = auth-service ] || [ "$service" = staff-auth-service ]; then
  image=sunset-auth-service
  active_tag="$image:db-split"
  rollout_services='auth-service staff-auth-service'
else
  image="sunset-$service"
  active_tag="$image:latest"
  rollout_services=$service
fi
candidate="$image:candidate-$release"
rollback_tag="$image:rollback-$release"
docker image inspect "$candidate" >/dev/null
if docker image inspect "$rollback_tag" >/dev/null 2>&1; then
  echo "Rollback tag already exists: $rollback_tag" >&2
  exit 1
fi

current_image=
for rollout_service in $rollout_services; do
  container=$(compose ps -q "$rollout_service")
  test -n "$container"
  service_image=$(docker inspect --format '{{.Image}}' "$container")
  if [ -n "$current_image" ] && [ "$current_image" != "$service_image" ]; then
    echo 'Auth containers use different images; a combined rollback is unsafe.' >&2
    exit 1
  fi
  current_image=$service_image
  current_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")
  if [ "$rollout_service" = web ]; then
    test "$current_health" = running
  else
    test "$current_health" = healthy
  fi
done
curl -fsS --max-time 15 -o /dev/null http://127.0.0.1/

printf 'Services: %s\nCurrent image: %s\nCandidate: %s\nActive tag: %s\nRollback tag: %s\n' \
  "$rollout_services" "$current_image" "$candidate" "$active_tag" "$rollback_tag"
if [ "$mode" = --check ]; then
  echo 'Preflight passed; no image or container changed.'
  exit 0
fi

rollback() {
  echo "Rollout failed; restoring $rollback_tag" >&2
  if docker image tag "$rollback_tag" "$active_tag" &&
     compose up -d --no-deps --no-build --wait --force-recreate $rollout_services; then
    echo 'Rollback completed.' >&2
  else
    echo "Automatic rollback failed. Restore $rollback_tag manually." >&2
  fi
}

docker image tag "$current_image" "$rollback_tag"
docker image tag "$candidate" "$active_tag"
if ! compose up -d --no-deps --no-build --wait --force-recreate $rollout_services; then
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
