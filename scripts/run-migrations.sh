#!/bin/sh
set -eu

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"
CONNECT_RETRIES="${MIGRATION_DB_CONNECT_RETRIES:-30}"
CONNECT_SLEEP_SECONDS="${MIGRATION_DB_CONNECT_SLEEP_SECONDS:-2}"
ADVISORY_LOCK_ID="${MIGRATION_ADVISORY_LOCK_ID:-733552826}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to run database migrations."
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required for database migrations."
  echo "Set it in .env using the Supabase Postgres connection string."
  exit 1
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migration directory not found: $MIGRATIONS_DIR"
  exit 1
fi

set -- "$MIGRATIONS_DIR"/*.sql
if [ ! -e "$1" ]; then
  echo "No migration files found in $MIGRATIONS_DIR"
  exit 1
fi

echo "Waiting for Supabase Postgres..."
attempt=1
while ! psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c "select 1" >/dev/null 2>&1; do
  if [ "$attempt" -ge "$CONNECT_RETRIES" ]; then
    echo "Unable to connect to Supabase Postgres after $CONNECT_RETRIES attempts."
    echo "If DATABASE_URL uses db.<project-ref>.supabase.co, switch it to the Supabase Session Pooler connection string and add sslmode=require."
    exit 1
  fi

  echo "Postgres is not reachable yet; retrying ($attempt/$CONNECT_RETRIES)..."
  attempt=$((attempt + 1))
  sleep "$CONNECT_SLEEP_SECONDS"
done

echo "Preparing migration history table..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public._aeon_migrations (
  migration TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public._aeon_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._aeon_migrations FROM PUBLIC, anon, authenticated;
SQL

for file do
  migration="$(basename "$file")"

  psql "$DATABASE_URL" \
    -v ON_ERROR_STOP=1 \
    -v migration="$migration" \
    -v file="$file" \
    -v lock_id="$ADVISORY_LOCK_ID" <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(:lock_id);
SELECT CASE
  WHEN EXISTS (
    SELECT 1
    FROM public._aeon_migrations
    WHERE migration = :'migration'
  )
  THEN 'true'
  ELSE 'false'
END AS migration_already_applied \gset

\if :migration_already_applied
\echo Skipping already applied migration :migration
ROLLBACK;
\else
\echo Applying migration :migration
\i :file
INSERT INTO public._aeon_migrations (migration)
VALUES (:'migration');
COMMIT;
\endif
SQL
done

echo "Database migrations finished."
