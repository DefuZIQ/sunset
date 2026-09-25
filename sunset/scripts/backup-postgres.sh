#!/usr/bin/env sh
set -eu

project_dir=${1:-/home/defuziq/sunset}
backup_dir=${2:-/home/defuziq/backups}
retention_days=${BACKUP_RETENTION_DAYS:-14}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_dir/sunset-$timestamp.sql.gz"
temporary="$target.part"

mkdir -p "$backup_dir"
cd "$project_dir"

docker compose -f docker-compose.prod.yml exec -T postgres sh -c \
  'pg_dump --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "$temporary"

gzip -t "$temporary"
mv "$temporary" "$target"
sha256sum "$target" > "$target.sha256"
find "$backup_dir" -type f \( -name 'sunset-*.sql.gz' -o -name 'sunset-*.sql.gz.sha256' \) \
  -mtime "+$retention_days" -delete

printf '%s\n' "$target"
