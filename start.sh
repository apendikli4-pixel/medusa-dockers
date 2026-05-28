#!/bin/sh

set -ex

# ==============================================================================
# MEDUSA V2 - DEBUG STARTUP GUARDIAN
# ==============================================================================

echo "Backend Deployment Initializing..."
echo "Waiting for postgres:5432 to be ready..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "Postgres is up and running!"

# Ensure database exists
# psql -d postgres → bootstrap'a sabit erişimimiz olan default DB üzerinden bağlan
# (aksi halde -U $POSTGRES_USER ile aynı isimde bir DB aranır ve FATAL döner).
# DB adını DATABASE_URL'den çıkar (öncelik) ya da POSTGRES_DB'ye düş.
DB_NAME=$(echo "${DATABASE_URL:-}" | sed -nE 's#.*/([^/?]+)(\?.*)?$#\1#p')
DB_NAME="${DB_NAME:-${POSTGRES_DB:-medusa-genesis}}"
if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "Creating database $DB_NAME..."
  PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d postgres -c "CREATE DATABASE \"$DB_NAME\""
fi

export PATH=$PATH:/server/node_modules/.bin
export HOST=0.0.0.0
export MEDUSA_HOST=0.0.0.0

echo "Running database migrations..."
medusa db:migrate || { echo "Migrations failed"; exit 1; }

if [ "$MEDUSA_WORKER_MODE" = "server" ] || [ "$MEDUSA_WORKER_MODE" = "shared" ]; then
    echo "Starting role: $MEDUSA_WORKER_MODE"
    if [ "$NODE_ENV" != "production" ]; then
        echo "Development environment detected. Cleaning build artifacts..."
        if [ ! -d "/server/node_modules" ]; then
            echo "node_modules not found. Installing..."
            npm install --legacy-peer-deps
        else
            echo "node_modules found. Skipping install."
        fi
        ./node_modules/.bin/medusa build || { echo "Build failed"; exit 1; }
        if [ -f "/server/dist/public/admin/index.html" ]; then
            echo "Syncing admin build into runtime public directory..."
            rm -rf /server/public/admin
            mkdir -p /server/public
            cp -R /server/dist/public/admin /server/public/admin
        fi
    else
        echo "Production environment detected. Skipping redundant build..."
    fi
    echo "Starting Medusa..."
    ./node_modules/.bin/medusa start &
    PID=$!
    echo "Medusa started with PID $PID. Waiting..."
    wait $PID
    EXIT_CODE=$?
    echo "Medusa exited with code $EXIT_CODE"
    sleep 3600
elif [ "$MEDUSA_WORKER_MODE" = "worker" ]; then
    echo "Starting role: WORKER"
    ./node_modules/.bin/medusa start
else
    echo "ERROR: Unknown MEDUSA_WORKER_MODE ($MEDUSA_WORKER_MODE)"
    exit 1
fi
