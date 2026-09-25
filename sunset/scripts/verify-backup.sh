#!/usr/bin/env sh
set -eu

backup=${1:?Usage: verify-backup.sh /path/to/backup.sql.gz}
test -s "$backup"
gzip -t "$backup"

if [ -f "$backup.sha256" ]; then
  cd "$(dirname "$backup")"
  sha256sum -c "$(basename "$backup").sha256"
fi

gzip -dc "$backup" | grep -q -- '-- PostgreSQL database dump'
printf 'Backup is readable: %s\n' "$backup"
