#!/usr/bin/env sh
set -eu
umask 077

backup_dir=${1:-/home/defuziq/backups}
backup=${2:-}
if [ -z "$backup" ]; then
  backup=$(find "$backup_dir" -maxdepth 1 -type f -name 'sunset-*.sql.gz' -printf '%T@ %p\n' |
    sort -nr | head -n 1 | cut -d' ' -f2-)
fi
test -n "$backup"
test -f "$backup"
backup=$(realpath "$backup")
"$(dirname "$0")/verify-backup.sh" "$backup"

container="sunset-restore-drill-$$"
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM

docker run --rm -d --network none --name "$container" \
  -e POSTGRES_PASSWORD=restore-drill-local-only \
  -v "$backup:/tmp/backup.sql.gz:ro" postgres:16-alpine >/dev/null

ready=0
for _ in $(seq 1 60); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
test "$ready" -eq 1

docker exec "$container" sh -c \
  'gzip -dc /tmp/backup.sql.gz | psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q' \
  >/dev/null

table_count=$(docker exec "$container" psql -U postgres -d postgres -Atc \
  "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")
test "$table_count" -gt 0
printf 'Restore drill passed: %s tables from %s\n' "$table_count" "$backup"
