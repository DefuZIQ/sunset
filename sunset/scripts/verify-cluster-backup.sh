#!/usr/bin/env sh
set -eu

bundle=${1:?Usage: verify-cluster-backup.sh /absolute/sunset-cluster-directory}
bundle=$(realpath "$bundle")
test -d "$bundle"
for database in sunset sunset_staff sunset_commerce; do
  test -s "$bundle/$database.dump"
done
test -s "$bundle/SHA256SUMS"
(cd "$bundle" && sha256sum -c SHA256SUMS)
printf 'Cluster backup is readable: %s\n' "$bundle"
