#!/usr/bin/env sh
set -eu

project_dir=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
test_dir=$(mktemp -d)
cleanup_test() { rm -r -- "$test_dir"; }
trap cleanup_test EXIT HUP INT TERM
mkdir -p "$test_dir/backups"

if (
  docker() {
    printf '%s\n' '-- PostgreSQL database dump' 'partial output'
    return 42
  }
  set -- "$project_dir" "$test_dir/backups"
  . "$project_dir/scripts/backup-postgres.sh"
); then
  printf '%s\n' 'FAIL: failed pg_dump was accepted' >&2
  exit 1
fi
if find "$test_dir/backups" -type f | grep -q .; then
  printf '%s\n' 'FAIL: failed pg_dump left backup files' >&2
  exit 1
fi

(
  docker() {
    printf '%s\n' '-- PostgreSQL database dump' 'CREATE TABLE sample (id integer);'
  }
  set -- "$project_dir" "$test_dir/backups"
  . "$project_dir/scripts/backup-postgres.sh"
)

backup=$(find "$test_dir/backups" -maxdepth 1 -type f -name 'sunset-*.sql.gz' -print -quit)
test -n "$backup"
"$project_dir/scripts/verify-backup.sh" "$backup"
printf '%s\n' 'PASS backup success and failed-dump cleanup'
