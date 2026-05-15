#!/usr/bin/env bash
#
# Populate the local Postgres (running via docker compose) with demo data
# covering every page on the web client.
#
# Idempotent — safe to run repeatedly. All seeded users share the same email
# host and password (defaults: @studioos.dev / 123456).
#
# Usage:
#   ./scripts/seed_demo_data.sh                       # use defaults
#   ./scripts/seed_demo_data.sh --host example.test   # custom email host
#   ./scripts/seed_demo_data.sh --password secret     # custom password
#
# Requirements:
#   - docker + docker compose installed
#   - run from any dir; the script resolves its own location
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ docker not found on PATH" >&2
  exit 1
fi

# Pick the available compose entrypoint (v2 plugin or legacy v1).
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "✗ neither 'docker compose' nor 'docker-compose' is available" >&2
  exit 1
fi

echo "→ Ensuring db + api services are up"
"${COMPOSE[@]}" up -d db api >/dev/null

echo "→ Waiting for Postgres to become ready"
for i in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T db pg_isready -U studioos >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "${i}" == "30" ]]; then
    echo "✗ Postgres did not become ready in time" >&2
    exit 1
  fi
done

echo "→ Applying migrations"
"${COMPOSE[@]}" exec -T api uv run python manage.py migrate --noinput

echo "→ Seeding demo data"
"${COMPOSE[@]}" exec -T api uv run python manage.py seed_demo_data "$@"

echo
echo "✓ Done. Sign in at the web client with any of the seeded accounts."
echo "  Example: direction@studioos.dev  /  123456"
