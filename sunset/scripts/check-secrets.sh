#!/bin/sh
set -eu

# High-confidence signatures only. Report paths, never print credential values.
cd "$(dirname "$0")/../.."
pattern='sk-proj-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'

if matches=$(git grep -I -l -E "$pattern" -- .); then
  printf 'Potential credential in tracked files:\n%s\n' "$matches" >&2
  exit 1
else
  status=$?
  if [ "$status" -ne 1 ]; then
    echo 'Credential scan failed to read tracked files' >&2
    exit "$status"
  fi
fi

require_secret() {
  resource=$1
  placeholder=$2
  if ! grep -Fq "\${$placeholder}" "$resource"; then
    echo "Required production secret has a default or is missing: $resource ($placeholder)" >&2
    exit 1
  fi
}

require_secret sunset/backend/api-gateway/src/main/resources/application.yml JWT_SECRET
for service in auth-service product-service order-service; do
  resource="sunset/backend/$service/src/main/resources/application.properties"
  require_secret "$resource" SPRING_DATASOURCE_PASSWORD
  require_secret "$resource" SPRING_SECURITY_JWT_SECRET
done
require_secret sunset/backend/notification-service/src/main/resources/application.properties SPRING_DATASOURCE_PASSWORD

echo 'Tracked credential signatures and required-secret configuration: OK'
