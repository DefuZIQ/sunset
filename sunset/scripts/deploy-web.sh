#!/bin/sh
set -eu

mode=${1:---check}
project_dir=${2:-/home/defuziq/sunset}
compose_file=docker-compose.prod.yml
minimum_free_kb=4194304

case "$mode" in
  --check|--apply) ;;
  *) printf 'Usage: %s --check|--apply [project-directory]\n' "$0" >&2; exit 2 ;;
esac

if [ ! -f "$project_dir/$compose_file" ] || [ ! -f "$project_dir/frontend/Dockerfile" ]; then
  printf 'SUNSET project files not found in %s\n' "$project_dir" >&2
  exit 2
fi
cd "$project_dir"

if ! docker info >/dev/null 2>&1; then
  printf 'Docker is unavailable. Run with a user allowed to manage Docker.\n' >&2
  exit 1
fi
docker compose -f "$compose_file" config --quiet

free_kb=$(df -Pk . | awk 'NR==2 {print $4}')
case "$free_kb" in
  ''|*[!0-9]*) printf 'Could not read free disk space.\n' >&2; exit 1 ;;
esac
printf 'Free disk space: %s MiB\n' "$((free_kb / 1024))"
if [ "$free_kb" -lt "$minimum_free_kb" ]; then
  printf 'At least 4 GiB is required before building a production image.\n' >&2
  exit 1
fi

web_container=$(docker compose -f "$compose_file" ps -q web)
if [ -z "$web_container" ]; then
  printf 'The current web container was not found; refusing to deploy without a rollback image.\n' >&2
  exit 1
fi
current_image=$(docker inspect --format '{{.Image}}' "$web_container")
smoke_url=${SUNSET_SMOKE_URL:-http://127.0.0.1/}
if ! curl -fsS --max-time 15 -o /dev/null "$smoke_url"; then
  printf 'Current storefront smoke check failed; refusing to deploy.\n' >&2
  exit 1
fi
printf 'Current web image: %s\n' "$current_image"

if [ "$mode" = '--check' ]; then
  printf 'Preflight passed. No files, images or containers changed.\n'
  exit 0
fi

rollback() {
  printf 'Web rollout failed; restoring the previous image.\n' >&2
  if docker image tag sunset-web:rollback sunset-web:latest &&
     docker compose -f "$compose_file" up -d --no-deps --wait --force-recreate web &&
     curl -fsS --max-time 15 -o /dev/null "$smoke_url"; then
    printf 'Rollback completed.\n' >&2
  else
    printf 'Automatic rollback failed; inspect web container and use sunset-web:rollback manually.\n' >&2
  fi
}

docker image tag "$current_image" sunset-web:rollback
if ! docker compose -f "$compose_file" build web; then
  printf 'Build failed; the running storefront was not replaced.\n' >&2
  exit 1
fi
if ! docker compose -f "$compose_file" up -d --no-deps --wait web; then
  rollback
  exit 1
fi
if ! curl -fsS --max-time 15 -o /dev/null "$smoke_url"; then
  rollback
  exit 1
fi
printf 'Web rollout succeeded. Previous image remains tagged sunset-web:rollback.\n'
