#!/bin/sh
set -eu

project_dir=$(CDPATH= cd "$(dirname "$0")/.." && pwd)

run_case() {
  scenario=$1
  mode=$2
  expected_status=$3
  expected_text=$4

  if output=$(
    exec 2>&1
    curl_calls=0
    docker() {
      case "$*" in
        info|"compose -f docker-compose.prod.yml config --quiet"|"image tag "*|"compose -f docker-compose.prod.yml build web"|"compose -f docker-compose.prod.yml up -d --no-deps --wait --force-recreate web") return 0 ;;
        "compose -f docker-compose.prod.yml ps -q web") printf 'web-container\n' ;;
        "inspect --format {{.Image}} web-container") printf 'sha256:current\n' ;;
        "compose -f docker-compose.prod.yml up -d --no-deps --wait web") [ "$scenario" != rollout-fails ] ;;
        *) printf 'Unexpected Docker call: %s\n' "$*" >&2; return 1 ;;
      esac
    }
    df() {
      printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\n'
      if [ "$scenario" = low-disk ]; then
        printf '/dev/test 10000000 9999000 1000 99%% /\n'
      else
        printf '/dev/test 20000000 10000000 10000000 50%% /\n'
      fi
    }
    curl() {
      curl_calls=$((curl_calls + 1))
      [ "$scenario" != smoke-fails ] || [ "$curl_calls" -ne 2 ]
    }
    set -- "$mode" "$project_dir"
    . "$project_dir/scripts/deploy-web.sh"
  ); then
    actual_status=0
  else
    actual_status=$?
  fi

  if [ "$actual_status" -ne "$expected_status" ]; then
    printf 'Unexpected exit status for %s: %s\n%s\n' "$scenario" "$actual_status" "$output" >&2
    exit 1
  fi
  case "$output" in
    *"$expected_text"*) ;;
    *) printf 'Missing expected text for %s: %s\n%s\n' "$scenario" "$expected_text" "$output" >&2; exit 1 ;;
  esac
  printf 'PASS %s\n' "$scenario"
}

run_case preflight --check 0 'No files, images or containers changed'
run_case low-disk --apply 1 'At least 4 GiB is required'
run_case successful-rollout --apply 0 'Web rollout succeeded'
run_case rollout-fails --apply 1 'Rollback completed'
run_case smoke-fails --apply 1 'Rollback completed'
