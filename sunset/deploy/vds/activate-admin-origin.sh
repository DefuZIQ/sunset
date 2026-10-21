#!/bin/sh
set -eu

new_release=/srv/sunset/releases/admin-origin-20261021
current_link=/srv/sunset/current
next_link=/srv/sunset/.current-admin-origin-20261021
active_config=/etc/nginx/sites-available/sunset
candidate_config=/etc/nginx/sites-available/sunset-admin-origin-candidate
backup_config=/etc/nginx/sites-available/sunset-rollback-20261021
bootstrap_link=/etc/nginx/sites-enabled/sunset-admin-bootstrap
bootstrap_config=/etc/nginx/sites-available/sunset-admin-bootstrap

test "$(id -u)" -eq 0
test -L "$current_link"
test -d "$new_release"
test -f "$new_release/index.html"
test -f "$new_release/admin/index.html"
test -f "$candidate_config"
test -f "$backup_config"
cmp -s "$active_config" "$backup_config"
test -L "$bootstrap_link"
test "$(readlink "$bootstrap_link")" = "$bootstrap_config"
test -f /etc/letsencrypt/live/sunset-admin-t3ch-pro/fullchain.pem
test ! -e "$next_link"

old_release=$(readlink -f "$current_link")
test -d "$old_release"

rollback() {
    cp -p "$backup_config" "$active_config"
    if [ ! -L "$bootstrap_link" ]; then
        ln -s "$bootstrap_config" "$bootstrap_link"
    fi
    if [ -L "$next_link" ]; then
        rm "$next_link"
    fi
    ln -s "$old_release" "$next_link"
    mv -Tf "$next_link" "$current_link"
    nginx -t && systemctl reload nginx
    echo "VDS rollback restored $old_release" >&2
}

trap 'result=$?; if [ "$result" -ne 0 ]; then rollback; fi' EXIT

cp -p "$candidate_config" "$active_config"
rm "$bootstrap_link"
nginx -t
ln -s "$new_release" "$next_link"
mv -Tf "$next_link" "$current_link"
systemctl reload nginx

admin_ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fs --max-time 5 --resolve admin.t3ch.pro:443:127.0.0.1 \
        https://admin.t3ch.pro/ | grep -q 'SUNSET CONTROL'; then
        admin_ready=1
        break
    fi
    sleep 1
done
test "$admin_ready" -eq 1
curl -fsS --max-time 15 --resolve t3ch.pro:443:127.0.0.1 \
    https://t3ch.pro/ >/dev/null
curl -fsS --max-time 15 --resolve t3ch.pro:443:127.0.0.1 \
    https://t3ch.pro/api/v1/products/categories/tree >/dev/null

trap - EXIT
echo "Admin origin activated; previous release: $old_release"
