#!/usr/bin/env sh
set -eu

bundle=${1:?Usage: test-split-auth-runtime.sh /absolute/sunset-cluster-directory}
bundle=$(realpath "$bundle")
test -d "$bundle"
(cd "$bundle" && sha256sum -c SHA256SUMS > /dev/null)
gateway_image=${GATEWAY_IMAGE:-sunset-api-gateway:latest}
docker image inspect "$gateway_image" > /dev/null

suffix=$$
network="sunset-split-auth-$suffix"
db="sunset-split-auth-db-$suffix"
customer_auth="sunset-split-customer-auth-$suffix"
staff_auth="sunset-split-staff-auth-$suffix"
product="sunset-split-product-$suffix"
order="sunset-split-order-$suffix"
gateway="sunset-split-gateway-$suffix"
cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    for service in "$customer_auth" "$staff_auth" "$product" "$order" "$gateway"; do
      docker logs --since 2m "$service" 2>&1 | grep '"level":"ERROR"' | tail -n 3 | cut -c 1-700 >&2 || true
    done
  fi
  docker rm -f "$gateway" "$order" "$product" "$staff_auth" "$customer_auth" "$db" > /dev/null 2>&1 || true
  docker network rm "$network" > /dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

docker network create --internal "$network" > /dev/null
docker run -d --network "$network" --network-alias postgres --name "$db" \
  -e POSTGRES_PASSWORD=split-drill-db-only \
  -v "$bundle:/tmp/bundle:ro" postgres:16-alpine > /dev/null
ready=0
for _ in $(seq 1 60); do
  if docker exec "$db" pg_isready -U postgres > /dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
test "$ready" -eq 1 || { echo 'Isolated PostgreSQL did not start' >&2; exit 1; }
for database in sunset sunset_staff sunset_commerce; do
  docker exec "$db" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
    -c "CREATE DATABASE $database"
  docker exec "$db" pg_restore -U postgres -d "$database" \
    --no-owner --no-acl --exit-on-error "/tmp/bundle/$database.dump" > /dev/null
done

jwt_secret=split-drill-jwt-secret-at-least-32-characters
internal_secret=split-drill-internal-secret-at-least-32-characters
mfa_key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
start_service() {
  name=$1 port=$2
  shift 2
  docker run -d --network "$network" --name "$name" "$@" > /dev/null
  healthy=0
  for _ in $(seq 1 90); do
    if docker exec "$name" wget -qO /dev/null "http://localhost:$port/actuator/health" > /dev/null 2>&1; then
      healthy=1
      break
    fi
    sleep 1
  done
  if [ "$healthy" -ne 1 ]; then
    docker logs --tail 30 "$name" >&2
    echo "Service did not become healthy: $name" >&2
    exit 1
  fi
}

start_service "$customer_auth" 8081 --network-alias auth-service \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/sunset \
  -e SPRING_DATASOURCE_USERNAME=postgres -e SPRING_DATASOURCE_PASSWORD=split-drill-db-only \
  -e SPRING_SECURITY_JWT_SECRET="$jwt_secret" -e MFA_ENCRYPTION_KEY="$mfa_key" \
  -e INTERNAL_IAM_SECRET="$internal_secret" -e AUTH_REALM=CUSTOMER \
  sunset-auth-service:db-split
start_service "$staff_auth" 8081 --network-alias staff-auth-service \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/sunset_staff \
  -e SPRING_DATASOURCE_USERNAME=postgres -e SPRING_DATASOURCE_PASSWORD=split-drill-db-only \
  -e SPRING_SECURITY_JWT_SECRET="$jwt_secret" -e MFA_ENCRYPTION_KEY="$mfa_key" \
  -e INTERNAL_IAM_SECRET="$internal_secret" -e AUTH_REALM=STAFF \
  -e SPRING_LIQUIBASE_CHANGE_LOG=classpath:/db/staff/runtime-changelog.xml \
  sunset-auth-service:db-split
start_service "$product" 8082 --network-alias product-service \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/sunset_commerce \
  -e SPRING_DATASOURCE_USERNAME=postgres -e SPRING_DATASOURCE_PASSWORD=split-drill-db-only \
  -e SPRING_SECURITY_JWT_SECRET="$jwt_secret" -e INTERNAL_IAM_SECRET="$internal_secret" \
  -e IAM_MODE=remote -e IAM_AUTH_URL=http://staff-auth-service:8081 \
  -e CUSTOMER_PROFILE_MODE=remote -e CUSTOMER_PROFILE_AUTH_URL=http://auth-service:8081 \
  sunset-product-service:latest
start_service "$order" 8083 --network-alias order-service \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/sunset_commerce \
  -e SPRING_DATASOURCE_USERNAME=postgres -e SPRING_DATASOURCE_PASSWORD=split-drill-db-only \
  -e SPRING_SECURITY_JWT_SECRET="$jwt_secret" -e INTERNAL_IAM_SECRET="$internal_secret" \
  -e IAM_MODE=remote -e IAM_AUTH_URL=http://staff-auth-service:8081 \
  -e CUSTOMER_PROFILE_MODE=remote -e CUSTOMER_PROFILE_AUTH_URL=http://auth-service:8081 \
  sunset-order-service:latest
start_service "$gateway" 8080 --network-alias api-gateway \
  -e JWT_SECRET="$jwt_secret" "$gateway_image"

email="split-drill-$suffix@sunset.test"
registration=$(printf '{"email":"%s","password":"TestPass123!","firstName":"Test","lastName":"Customer"}' "$email")
printf 'Checking customer registration\n'
docker exec "$gateway" wget -qO /dev/null \
  --header 'Content-Type: application/json' --post-data "$registration" \
  http://localhost:8080/auth/register
printf 'Checking customer login\n'
login=$(docker exec "$gateway" wget -qO - \
  --header 'Content-Type: application/json' \
  --post-data "$(printf '{"email":"%s","password":"TestPass123!"}' "$email")" \
  http://localhost:8080/auth/login)
token=$(printf '%s' "$login" | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')
test -n "$token"
printf 'Checking protected profile\n'
profile=$(docker exec "$gateway" wget -qO - \
  --header "Authorization: Bearer $token" http://localhost:8080/auth/profile)
printf '%s' "$profile" | python3 -c 'import json,sys; assert json.load(sys.stdin)["email"].endswith("@sunset.test")'

# Reuse the test customer's password hash for the cloned staff identity. This
# changes the isolated database only; no production staff password is touched.
password_hash=$(docker exec "$db" psql -U postgres -d sunset -Atqc \
  "SELECT password FROM users WHERE email='$email'")
staff_id=$(docker exec "$db" psql -U postgres -d sunset_staff -Atqc \
  "SELECT id FROM users WHERE role='ADMIN' LIMIT 1")
test -n "$password_hash" && test -n "$staff_id"
staff_email="staff-drill-$suffix@sunset.test"
docker exec "$db" psql -U postgres -d sunset_staff -v ON_ERROR_STOP=1 -q -c \
  "DELETE FROM mfa_recovery_codes WHERE user_id='$staff_id';
   DELETE FROM mfa_totp WHERE user_id='$staff_id';
   DELETE FROM mfa_setup_challenges WHERE user_id='$staff_id';
   DELETE FROM mfa_login_challenges WHERE user_id='$staff_id';
   UPDATE users SET email='$staff_email',password='$password_hash' WHERE id='$staff_id';"
staff_match=$(docker exec "$db" psql -U postgres -d sunset_staff -Atqc \
  "SELECT count(*) FROM users WHERE id='$staff_id' AND email='$staff_email' AND password='$password_hash' AND role='ADMIN'")
test "$staff_match" = 1 || { echo 'Cloned staff credentials were not updated' >&2; exit 1; }
printf 'Checking staff login and MFA enrollment\n'
staff_login=$(docker exec "$gateway" wget -qO - \
  --header 'Content-Type: application/json' \
  --post-data "$(printf '{"email":"%s","password":"TestPass123!"}' "$staff_email")" \
  http://localhost:8080/auth/staff/login) || {
    printf 'Gateway staff login response: %.500s\n' "$staff_login" >&2
    exit 1
  }
setup_token=$(printf '%s' "$staff_login" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["mfaEnrollmentRequired"]; print(d["setupToken"])')
test "${#setup_token}" -eq 43 || { echo 'Staff setup token has unexpected length' >&2; exit 1; }
printf 'Gateway staff login succeeded; checking MFA setup\n'
enrollment=$(docker exec "$gateway" wget -qO - \
  --header 'Content-Type: application/json' \
  --post-data "$(printf '{"setupToken":"%s"}' "$setup_token")" \
  http://localhost:8080/auth/mfa/setup/start)
totp_secret=$(printf '%s' "$enrollment" | python3 -c 'import json,sys; print(json.load(sys.stdin)["secret"])')
totp_code=$(python3 -c 'import base64,hashlib,hmac,struct,sys,time; s=sys.argv[1]; k=base64.b32decode(s+"="*((-len(s))%8)); d=hmac.new(k,struct.pack(">Q",int(time.time())//30),hashlib.sha1).digest(); o=d[-1]&15; print("%06d" % ((int.from_bytes(d[o:o+4],"big")&0x7fffffff)%1000000))' "$totp_secret")
confirm_body=$(printf '{"setupToken":"%s","code":"%s"}' "$setup_token" "$totp_code")
completion=$(docker exec "$gateway" sh -c \
  'wget -S -O /tmp/split-mfa-response --header "Content-Type: application/json" --post-data "$1" http://localhost:8080/auth/mfa/setup/confirm 2>/tmp/split-mfa-headers && cat /tmp/split-mfa-response' \
  sh "$confirm_body")
printf '%s' "$completion" | python3 -c 'import json,sys; d=json.load(sys.stdin)["auth"]; assert d["role"]=="ADMIN"; assert d["csrfToken"]'
staff_cookie=$(docker exec "$gateway" cat /tmp/split-mfa-headers |
  python3 -c 'import sys; lines=[line.strip().split(":",1)[1].strip().split(";",1)[0] for line in sys.stdin if line.strip().lower().startswith("set-cookie:") and "SUNSET_ADMIN_SESSION=" in line]; assert lines; print(lines[-1])')
printf 'MFA completed; checking admin orders\n'
docker exec "$gateway" wget -qO /dev/null \
  --header "Cookie: $staff_cookie" http://localhost:8080/order/admin/orders
printf 'Admin orders readable; checking customer directory\n'
docker exec "$gateway" wget -qO /dev/null \
  --header "Cookie: $staff_cookie" http://localhost:8080/order/admin/users
printf 'Checking loyalty and catalog\n'
docker exec "$gateway" wget -qO /dev/null \
  --header "Authorization: Bearer $token" http://localhost:8080/order/loyalty
docker exec "$gateway" wget -qO /dev/null http://localhost:8080/products/all
variant=$(docker exec "$db" psql -U postgres -d sunset_commerce -AtF '|' -c \
  "SELECT ps.product_id,ps.size_id,ps.color_id FROM product_stock ps
   WHERE ps.quantity>0 AND EXISTS (
     SELECT 1 FROM location_stock ls WHERE ls.product_id=ps.product_id
     AND ls.size_id=ps.size_id AND ls.color_id=ps.color_id AND ls.quantity>0)
   LIMIT 1")
test -n "$variant"
product_id=${variant%%|*}
remaining=${variant#*|}
size_id=${remaining%%|*}
color_id=${remaining#*|}
stock_before=$(docker exec "$db" psql -U postgres -d sunset_commerce -Atqc \
  "SELECT quantity FROM product_stock WHERE product_id='$product_id' AND size_id='$size_id' AND color_id='$color_id'")
balance_before=$(docker exec "$gateway" wget -qO - \
  --header "Authorization: Bearer $token" http://localhost:8080/order/loyalty |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["balance"])')
order_body=$(printf '{"customerName":"Test Customer","customerEmail":"%s","customerPhone":"+79990000001","address":"Test address","deliveryMethod":"courier","paymentMethod":"CARD","idempotencyKey":"split-%s","bonusesToUse":0,"items":[{"productId":"%s","sizeId":"%s","colorId":"%s","quantity":1}]}' \
  "$email" "$suffix" "$product_id" "$size_id" "$color_id")
printf 'Checking checkout and cancellation\n'
created=$(docker exec "$gateway" wget -qO - \
  --header 'Content-Type: application/json' --header "Authorization: Bearer $token" \
  --post-data "$order_body" http://localhost:8080/order)
order_id=$(printf '%s' "$created" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["status"]=="PENDING"; print(d["id"])')
docker exec "$gateway" wget -qO /dev/null \
  --header "Authorization: Bearer $token" "http://localhost:8080/order/my/$order_id"
cancelled=$(docker exec "$gateway" wget -qO - \
  --header "Authorization: Bearer $token" --post-data '{}' \
  "http://localhost:8080/order/my/$order_id/cancel")
printf '%s' "$cancelled" | python3 -c 'import json,sys; assert json.load(sys.stdin)["status"]=="CANCELLED"'
stock_after=$(docker exec "$db" psql -U postgres -d sunset_commerce -Atqc \
  "SELECT quantity FROM product_stock WHERE product_id='$product_id' AND size_id='$size_id' AND color_id='$color_id'")
test "$stock_before" = "$stock_after" || { echo 'Stock did not return after cancellation' >&2; exit 1; }
balance_after=$(docker exec "$gateway" wget -qO - \
  --header "Authorization: Bearer $token" http://localhost:8080/order/loyalty |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["balance"])')
test "$balance_before" = "$balance_after" || { echo 'Bonus balance changed after cancellation' >&2; exit 1; }
printf 'Split auth runtime passed: customer login, staff MFA, admin reads, checkout, cancellation, stock, loyalty\n'
