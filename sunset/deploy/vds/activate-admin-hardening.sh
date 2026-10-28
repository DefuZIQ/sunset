#!/bin/sh
set -eu

new_release=/srv/sunset/releases/admin-hardening-20261021
old_release=/srv/sunset/releases/admin-origin-20261021
current_link=/srv/sunset/current
next_link=/srv/sunset/.current-admin-hardening-20261021
active_config=/etc/nginx/sites-available/sunset
candidate_config=/etc/nginx/sites-available/sunset-admin-hardening-candidate
backup_config=/etc/nginx/sites-available/sunset-admin-origin-20261021-rollback

test "$(id -u)" -eq 0
test "$(readlink -f "$current_link")" = "$old_release"
test -f "$new_release/index.html"
test -f "$new_release/admin/index.html"
test -f "$candidate_config"
test ! -e "$backup_config"
test ! -e "$next_link"
cp -p "$active_config" "$backup_config"

rollback() {
    cp -p "$backup_config" "$active_config"
    if [ -L "$next_link" ]; then rm "$next_link"; fi
    ln -s "$old_release" "$next_link"
    mv -Tf "$next_link" "$current_link"
    nginx -t && systemctl reload nginx
    echo "VDS rollback restored $old_release" >&2
}

trap 'result=$?; if [ "$result" -ne 0 ]; then rollback; fi' EXIT

cp -p "$candidate_config" "$active_config"
nginx -t
ln -s "$new_release" "$next_link"
mv -Tf "$next_link" "$current_link"
systemctl reload nginx

ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
        --resolve t3ch.pro:443:127.0.0.1 \
        https://t3ch.pro/api/v1/auth/mfa/login)
    if [ "$status" = 404 ]; then ready=1; break; fi
    sleep 1
done
test "$ready" -eq 1
curl -fsS --max-time 15 --resolve admin.t3ch.pro:443:127.0.0.1 \
    https://admin.t3ch.pro/ | grep -q 'SUNSET CONTROL'
curl -fsS --max-time 15 --resolve t3ch.pro:443:127.0.0.1 \
    https://t3ch.pro/api/v1/products/categories/tree >/dev/null

trap - EXIT
echo "Admin origin hardening activated; previous release: $old_release"
