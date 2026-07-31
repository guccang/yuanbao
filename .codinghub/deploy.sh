#!/bin/sh

set -eu

: "${CODINGHUB_COMPOSE_PROJECT:?CODINGHUB_COMPOSE_PROJECT is required}"
: "${CODINGHUB_COMPOSE_FILE:?CODINGHUB_COMPOSE_FILE is required}"
: "${CODINGHUB_SERVICE:?CODINGHUB_SERVICE is required}"

case "${1:-}" in
  deploy)
    : "${CODINGHUB_IMAGE:?CODINGHUB_IMAGE is required}"
    docker image inspect "$CODINGHUB_IMAGE" >/dev/null
    docker compose \
      --project-name "$CODINGHUB_COMPOSE_PROJECT" \
      --file "$CODINGHUB_COMPOSE_FILE" \
      up -d --no-build --pull never "$CODINGHUB_SERVICE"
    ;;
  stop)
    docker compose \
      --project-name "$CODINGHUB_COMPOSE_PROJECT" \
      --file "$CODINGHUB_COMPOSE_FILE" \
      down --remove-orphans
    ;;
  *)
    echo "Usage: $0 {deploy|stop}" >&2
    exit 2
    ;;
esac
