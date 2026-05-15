#!/usr/bin/env bash
#
# Drop and recreate the local Postgres database used by docker compose.
# After running this, you almost certainly want to apply migrations and seed:
#
#     ./scripts/reset_db.sh
#     ./scripts/seed_demo_data.sh
#
# Requires docker compose to be available; the db service must be up.
#
# DESTRUCTIVE — wipes every row in every table.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "✗ neither 'docker compose' nor 'docker-compose' is available" >&2
  exit 1
fi

DB_NAME="${POSTGRES_DB:-studioos}"
DB_USER="${POSTGRES_USER:-studioos}"

if [[ "${1:-}" != "--yes" ]]; then
  echo "This will DROP the database '${DB_NAME}' in the docker postgres container."
  read -r -p "Continue? [y/N] " answer
  case "${answer}" in
    [yY]|[yY][eE][sS]) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

echo "→ Stopping app containers that hold open connections"
"${COMPOSE[@]}" stop api worker beat flower >/dev/null

echo "→ Ensuring db is up"
"${COMPOSE[@]}" up -d db >/dev/null

echo "→ Waiting for Postgres"
for i in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T db pg_isready -U "${DB_USER}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "→ Dropping and recreating database '${DB_NAME}'"
"${COMPOSE[@]}" exec -T db psql -U "${DB_USER}" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${DB_NAME}";
CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}";
SQL

echo "→ Restarting app containers"
"${COMPOSE[@]}" up -d api worker beat >/dev/null

echo
echo "✓ Database '${DB_NAME}' is empty."
echo "  Next step: ./scripts/seed_demo_data.sh"
