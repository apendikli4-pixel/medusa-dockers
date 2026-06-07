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

# ─── Tek seferlik production seed (idempotent) ───
# RUN_PRODUCTION_SEED=true iken yalnızca server/shared rolünde çalışır.
# Kurar: region(TRY) + sales channel + publishable key + tenant + kategoriler +
# kargo + demo ürünler. Script "zaten var mı" kontrolü yaptığı için tekrar
# çalıştırmak güvenlidir. Hata olursa container çökmesin (non-fatal).
if [ "${RUN_PRODUCTION_SEED}" = "true" ] && { [ "$MEDUSA_WORKER_MODE" = "server" ] || [ "$MEDUSA_WORKER_MODE" = "shared" ]; }; then
    echo "RUN_PRODUCTION_SEED=true → production seed çalıştırılıyor (idempotent, max 240s)..."
    # timeout ile sarmalandı: seed takılsa bile medusa start'ı bloke etmesin (server brick olmaz).
    timeout 240 ./node_modules/.bin/medusa exec ./src/scripts/seed-production.ts || echo "Seed başarısız/timeout (devam ediliyor; non-fatal)."
fi

if [ "$MEDUSA_WORKER_MODE" = "server" ] || [ "$MEDUSA_WORKER_MODE" = "shared" ]; then
    echo "Starting role: $MEDUSA_WORKER_MODE"
    if [ "$NODE_ENV" != "production" ]; then
        if [ ! -d "/server/node_modules" ]; then
            echo "node_modules not found. Installing..."
            npm install --legacy-peer-deps
        else
            echo "node_modules found. Skipping install."
        fi
        # Build sadece eksik veya boş ise gerçekleşir.
        # Bu sayede her container restart'ında ~3 dk build cezası ödenmez.
        # Kod değişikliği yapan kullanıcı manuel olarak:
        #   docker compose exec medusa-server sh -c "rm -rf .medusa && ./node_modules/.bin/medusa build"
        # çalıştırmalı ya da FORCE_BUILD=1 ile başlatmalı.
        if [ "${FORCE_BUILD:-0}" = "1" ] || [ ! -f "/server/.medusa/server/medusa-config.js" ] || [ ! -d "/server/.medusa/server/src/api" ]; then
            echo "Build artifacts missing or FORCE_BUILD=1; running medusa build..."
            ./node_modules/.bin/medusa build || { echo "Build failed"; exit 1; }
        else
            echo "Existing .medusa/server build found — skipping rebuild."
        fi
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
    # ── Admin Panel Serve Stratejisi ──
    # Resmi Medusa V2 kuralı: admin'i serve etmek için 'medusa start' MUTLAKA
    # .medusa/server dizininden çalıştırılmalı (aksi halde 'Could not find
    # index.html in admin build directory' → crash loop).
    #   - DISABLE_MEDUSA_ADMIN=true  → API-only (güvenli mod), /server'dan.
    #   - aksi halde + admin build varsa → .medusa/server'dan (admin AÇIK).
    #   - admin build yoksa → güvenli API-only'a düş (brick olmaz).
    if [ "${DISABLE_MEDUSA_ADMIN}" = "true" ]; then
        echo "Admin disabled (DISABLE_MEDUSA_ADMIN=true) — API-only mode (/server)."
        MEDUSA_ADMIN_DISABLED=true ./node_modules/.bin/medusa start &
    elif [ -f "/server/.medusa/server/public/admin/index.html" ]; then
        echo "Admin ENABLED — .medusa/server dizininden başlatılıyor (admin serve)."
        # .medusa/server'ın kendi node_modules'u yok; kök node_modules'u symlink'le.
        ln -sfn /server/node_modules /server/.medusa/server/node_modules
        cd /server/.medusa/server
        /server/node_modules/.bin/medusa start &
    else
        echo "Admin build bulunamadı — güvenli API-only moda düşülüyor."
        MEDUSA_ADMIN_DISABLED=true ./node_modules/.bin/medusa start &
    fi
    PID=$!
    echo "Medusa started with PID $PID. Waiting..."
    wait $PID
    EXIT_CODE=$?
    # RESILIENCE: Medusa çökerse konteyneri AYAKTA TUTMA — çık ki Docker'ın
    # 'restart: unless-stopped' politikası konteyneri otomatik yeniden başlatsın.
    # (Eskiden 'sleep 3600' vardı; medusa çökünce konteyner canlı kalıp hizmet
    #  vermiyordu → Traefik 502/504 → 1 saat sessiz kesinti. Artık self-healing.)
    echo "Medusa exited with code $EXIT_CODE — konteyner cikiyor, Docker otomatik restart edecek."
    exit ${EXIT_CODE:-1}
elif [ "$MEDUSA_WORKER_MODE" = "worker" ]; then
    echo "Starting role: WORKER"
    ./node_modules/.bin/medusa start
else
    echo "ERROR: Unknown MEDUSA_WORKER_MODE ($MEDUSA_WORKER_MODE)"
    exit 1
fi
