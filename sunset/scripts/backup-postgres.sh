#!/usr/bin/env sh
set -eu
umask 077

project_dir=${1:-/home/defuziq/sunset}
backup_dir=${2:-/home/defuziq/backups}
retention_days=${BACKUP_RETENTION_DAYS:-14}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_dir/sunset-$timestamp.sql.gz"
test ! -e "$target"

mkdir -p "$backup_dir"
cd "$project_dir"
temporary_sql=$(mktemp "$backup_dir/.sunset-$timestamp.sql.XXXXXX")
temporary_gzip=$(mktemp "$backup_dir/.sunset-$timestamp.sql.gz.XXXXXX")
cleanup() { rm -f -- "$temporary_sql" "$temporary_gzip"; }
trap cleanup EXIT HUP INT TERM

if ! docker compose -f docker-compose.prod.yml exec -T postgres sh -c \
  'pg_dump --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$temporary_sql"; then
  printf '%s\n' 'PostgreSQL dump failed; no backup was published' >&2
  exit 1
fi

test -s "$temporary_sql"
grep -q -- '-- PostgreSQL database dump' "$temporary_sql"
gzip -9 < "$temporary_sql" > "$temporary_gzip"
gzip -t "$temporary_gzip"
mv "$temporary_gzip" "$target"
sha256sum "$target" > "$target.sha256"
"$project_dir/scripts/verify-backup.sh" "$target"
find "$backup_dir" -type f \( -name 'sunset-*.sql.gz' -o -name 'sunset-*.sql.gz.sha256' \) \
  -mtime "+$retention_days" -delete

printf '%s\n' "$target"
