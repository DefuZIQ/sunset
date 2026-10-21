#!/bin/sh
set -eu

old=/srv/sunset/releases/catalog-search-20261021
new=/srv/sunset/releases/mfa-qr-20261021
current=/srv/sunset/current
next=/srv/sunset/.current-mfa-qr-20261021
rollback_next=/srv/sunset/.rollback-mfa-qr-20261021

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
printf 'MFA QR static release active; previous release: %s\n' "$old"
