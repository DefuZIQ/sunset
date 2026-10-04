#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

: "${E2E_JDBC_URL:=jdbc:postgresql://127.0.0.1:5432/sunset_e2e}"
: "${E2E_DB_USER:=sunset}"
: "${E2E_DB_PASSWORD:=sunset-e2e-only}"
: "${E2E_BASE_URL:=http://127.0.0.1:8080}"
: "${JWT_SECRET:=sunset-e2e-jwt-secret-at-least-32-bytes}"
export E2E_JDBC_URL E2E_DB_USER E2E_DB_PASSWORD E2E_BASE_URL JWT_SECRET
if [[ ! "$E2E_JDBC_URL" =~ ^jdbc:postgresql://[^/]+/sunset_e2e(\?.*)?$ ]]; then
  echo 'E2E_JDBC_URL must point to the isolated sunset_e2e database' >&2
  exit 1
fi
if [[ "$E2E_BASE_URL" != http://127.0.0.1:8080 && "$E2E_BASE_URL" != http://localhost:8080 ]]; then
  echo 'E2E_BASE_URL must point to the local isolated Gateway on port 8080' >&2
  exit 1
fi
for port in 8080 8081 8082 8083; do
  if (echo > "/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1; then
    echo "Port $port is already in use; refusing to test against existing services" >&2
    exit 1
  fi
done
export SPRING_DATASOURCE_URL="$E2E_JDBC_URL"
export SPRING_DATASOURCE_USERNAME="$E2E_DB_USER"
export SPRING_DATASOURCE_PASSWORD="$E2E_DB_PASSWORD"
export SPRING_SECURITY_JWT_SECRET="$JWT_SECRET"
export SERVER_ADDRESS=127.0.0.1

log_dir="$(mktemp -d)"
pids=()
cleanup() {
  local status=$?
  if (( status != 0 )); then
    for log in "$log_dir"/*.log; do
      [[ -f "$log" ]] || continue
      echo "--- $(basename "$log") ---" >&2
      tail -n 80 "$log" >&2 || true
    done
    echo "Commerce E2E failed; full service logs: $log_dir" >&2
  fi
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  for pid in "${pids[@]}"; do wait "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT

start_service() {
  local name=$1 jar=$2 port=$3
  [[ -f "$jar" ]] || { echo "Missing $jar; run Maven package first" >&2; return 1; }
  java -jar "$jar" > "$log_dir/$name.log" 2>&1 &
  local pid=$!
  pids+=("$pid")
  for _ in {1..90}; do
    if curl --silent --show-error --fail --max-time 2 \
      "http://127.0.0.1:$port/actuator/health" >/dev/null 2>&1; then
      echo "$name ready"
      return 0
    fi
    kill -0 "$pid" 2>/dev/null || { echo "$name exited before readiness" >&2; return 1; }
    sleep 2
  done
  echo "$name did not become ready" >&2
  return 1
}

start_service auth backend/auth-service/target/auth-service.jar 8081
start_service product backend/product-service/target/product-service.jar 8082
start_service order backend/order-service/target/order-service.jar 8083

export SPRING_CLOUD_GATEWAY_ROUTES_0_ID=auth-e2e
export SPRING_CLOUD_GATEWAY_ROUTES_0_URI=http://127.0.0.1:8081
export SPRING_CLOUD_GATEWAY_ROUTES_0_PREDICATES_0='Path=/auth/**'
export SPRING_CLOUD_GATEWAY_ROUTES_1_ID=product-e2e
export SPRING_CLOUD_GATEWAY_ROUTES_1_URI=http://127.0.0.1:8082
export SPRING_CLOUD_GATEWAY_ROUTES_1_PREDICATES_0='Path=/products/**'
export SPRING_CLOUD_GATEWAY_ROUTES_2_ID=order-e2e
export SPRING_CLOUD_GATEWAY_ROUTES_2_URI=http://127.0.0.1:8083
export SPRING_CLOUD_GATEWAY_ROUTES_2_PREDICATES_0='Path=/order/**'
start_service gateway backend/api-gateway/target/api-gateway.jar 8080

maven_args=(--batch-mode -q -pl backend/order-service -am
  -Dtest=CommerceHttpJourneyIT -Dsurefire.failIfNoSpecifiedTests=false)
if [[ -n "${E2E_MAVEN_REPO_LOCAL:-}" ]]; then
  maven_args+=("-Dmaven.repo.local=$E2E_MAVEN_REPO_LOCAL")
fi
mvn "${maven_args[@]}" test
