# Public frontend, private backend

The static frontend is hosted on the VDS at `82.22.187.25`. Both `t3ch.pro` and
`api.t3ch.pro` resolve to the VDS; the PostgreSQL database and backend services
remain on the private VM at `192.168.1.186`.

`nginx-sunset.conf` serves the frontend from `/srv/sunset/current` and forwards
`/api/` (plus the legacy assistant route) to `127.0.0.1:18080`. That loopback
port is supplied by a reverse SSH tunnel initiated by the private VM. The VDS
must never expose port `18080` publicly.
Both public `/api/` locations allow a 6 MiB request body so a review photo of
up to 5 MiB plus multipart framing reaches the product service. The service
still validates the file type and 5 MiB file limit.

TLS is provided by the Certbot certificate named `sunset-t3ch-pro`; `certbot.timer`
renews it and `nginx-reload-after-renewal.sh` reloads nginx after renewal. The deployed static release is
`/srv/sunset/releases/filter-design-20261011`, with `current` as a symlink. The
previous releases remain under `/srv/sunset/releases/`. Test any
replacement nginx configuration with `nginx -t` before reloading.

The VM-side systemd unit is `sunset-api-tunnel.service`, installed and enabled
on the VM. It uses a dedicated key and the unprivileged `sunset-tunnel` user on
the VDS; its authorized key permits listening only on `127.0.0.1:18080`. The
VDS SSH host key was verified out of band. Its ED25519 fingerprint on
2026-10-09 is `SHA256:BuL7TxyFQNHg2IDozlAq9+KSzT5FzI+nKADxw9fcI7Y`.

Smoke tests after tunnel activation:

```sh
curl -fsS https://t3ch.pro/ >/dev/null
curl -fsS https://t3ch.pro/api/v1/products/categories/tree >/dev/null
curl -fsS https://api.t3ch.pro/api/v1/products/categories/tree >/dev/null
```
