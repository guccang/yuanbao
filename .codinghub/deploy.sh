#!/bin/sh

set -eu

: "${CODINGHUB_COMPOSE_PROJECT:?CODINGHUB_COMPOSE_PROJECT is required}"
: "${CODINGHUB_COMPOSE_FILE:?CODINGHUB_COMPOSE_FILE is required}"
: "${CODINGHUB_SERVICE:?CODINGHUB_SERVICE is required}"

case "${1:-}" in
  deploy)
    docker compose \
      -p "$CODINGHUB_COMPOSE_PROJECT" \
      -f "$CODINGHUB_COMPOSE_FILE" \
      up -d --build "$CODINGHUB_SERVICE"
    ;;
  stop)
    docker compose \
      -p "$CODINGHUB_COMPOSE_PROJECT" \
      -f "$CODINGHUB_COMPOSE_FILE" \
      down
    ;;
  *)
    echo "Usage: $0 {deploy|stop}" >&2
    exit 2
    ;;
esac
