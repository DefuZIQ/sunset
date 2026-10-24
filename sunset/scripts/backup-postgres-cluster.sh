#!/usr/bin/env sh
set -eu
umask 077

project_dir=${1:-/home/defuziq/sunset-staging-db-split/sunset}
backup_dir=${2:-/home/defuziq/backups}
env_file=${3:-/home/defuziq/sunset/.env}
compose_file="$project_dir/docker-compose.prod.yml"
test -r "$compose_file"
test -r "$env_file"
mkdir -p "$backup_dir"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_dir/sunset-cluster-$timestamp"
test ! -e "$target" || { echo "Backup already exists: $target" >&2; exit 1; }
temporary=$(mktemp -d "$backup_dir/.sunset-cluster-$timestamp.XXXXXX")
cleanup() { test ! -d "$temporary" || rm -r -- "$temporary"; }
trap cleanup EXIT HUP INT TERM

for database in sunset sunset_staff sunset_commerce; do
  output="$temporary/$database.dump"
  docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
    sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$1"' sh "$database" > "$output"
  test -s "$output"
  docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
    pg_restore -l < "$output" > /dev/null
done

(cd "$temporary" && sha256sum sunset.dump sunset_staff.dump sunset_commerce.dump > SHA256SUMS)
mv -- "$temporary" "$target"
trap - EXIT HUP INT TERM
printf 'Cluster backup verified: %s\n' "$target"
