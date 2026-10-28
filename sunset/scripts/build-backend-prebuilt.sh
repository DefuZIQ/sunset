#!/bin/sh
set -eu

service=${1:?Usage: build-backend-prebuilt.sh SERVICE RELEASE [PROJECT_DIR]}
release=${2:?Usage: build-backend-prebuilt.sh SERVICE RELEASE [PROJECT_DIR]}
project_dir=${3:-/home/defuziq/sunset}

case "$service" in
  auth-service|product-service|order-service|notification-service|api-gateway) ;;
  *) echo 'Unknown backend service' >&2; exit 2 ;;
esac
case "$release" in
  ''|*[!a-zA-Z0-9._-]*) echo 'Invalid release tag' >&2; exit 2 ;;
esac

jar="$project_dir/backend/$service/target/$service.jar"
dockerfile="$project_dir/Dockerfile.backend.prebuilt"
test -s "$jar"
test -f "$dockerfile"
docker info >/dev/null 2>&1
image="sunset-$service:candidate-$release"
if docker image inspect "$image" >/dev/null 2>&1; then
  echo "Candidate image already exists: $image" >&2
  exit 1
fi

# Older Docker versions ignore Dockerfile-specific .dockerignore files.
# A dedicated context also ensures that no source, .env or test artifacts enter the image build.
stage=$(mktemp -d /tmp/sunset-prebuilt.XXXXXXXX)
cleanup() {
  case "$stage" in
    /tmp/sunset-prebuilt.*) test ! -d "$stage" || rm -r -- "$stage" ;;
    *) echo "Refusing to remove unexpected stage path: $stage" >&2 ;;
  esac
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$stage/backend/$service/target"
cp "$dockerfile" "$stage/Dockerfile.backend.prebuilt"
cp "$jar" "$stage/backend/$service/target/$service.jar"
docker build -f "$stage/Dockerfile.backend.prebuilt" \
  --build-arg "MODULE=$service" \
  --build-arg "JAR_NAME=$service" \
  -t "$image" "$stage"
docker image inspect "$image" --format '{{.Id}}'
echo "Candidate ready: $image"
