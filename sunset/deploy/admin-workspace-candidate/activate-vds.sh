#!/bin/sh
set -eu

old=/srv/sunset/releases/admin-workspace-20261021
new=/srv/sunset/releases/admin-workspace-20261021b
current=/srv/sunset/current
next=/srv/sunset/.current-admin-workspace-20261021b
rollback_next=/srv/sunset/.rollback-admin-workspace-20261021b

test "$(id -u)" -eq 0
test "$(readlink -f "$current")" = "$old"
test -f "$new/index.html"
test -f "$new/admin/index.html"
test ! -e "$next"
test ! -e "$rollback_next"
nginx -t

restore() {
  ln -s "$old" "$rollback_next"
  mv -Tf "$rollback_next" "$current"
}
trap 'result=$?; if [ "$result" -ne 0 ]; then restore; fi' EXIT

ln -s "$new" "$next"
mv -Tf "$next" "$current"
curl -fsS --max-time 15 --resolve admin.t3ch.pro:443:127.0.0.1 https://admin.t3ch.pro/ | grep -q 'SUNSET CONTROL'
curl -fsS --max-time 15 --resolve t3ch.pro:443:127.0.0.1 https://t3ch.pro/ >/dev/null
trap - EXIT
printf 'Admin workspace static release active; previous release: %s\n' "$old"
