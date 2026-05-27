# Üretim Konuşlandırma Runbook'u

> Bu doküman PROJECT-AYNA-GENESIS'i sıfırdan canlıya almanın **adım-adım**
> rehberidir. Tek bir komutla otomatik kurulum yok — her adım denetlenebilir
> olmalı çünkü prod veritabanı tek noktadan başlatılır.

---

## 0. Önkoşullar

| Bileşen | Sürüm | Kontrol |
|---|---|---|
| Docker Engine | ≥ 24 | `docker --version` |
| Docker Compose v2 | ≥ 2.20 | `docker compose version` |
| Disk alanı | ≥ 20 GB | `df -h` |
| RAM | ≥ 4 GB | `free -h` |
| Açık portlar | 9000, 8000, 5432 (sadece bastion), 6379 (kapalı), 7700 (kapalı) | `ss -tlnp` |

---

## 1. Repo'yu çek ve env'i doldur

```bash
git clone <repo-url> aqua-havuz && cd aqua-havuz
cp .env.example .env
```

`.env` içinde **şu değişkenler ZORUNLU** (boşsa stack başlamaz):

```
POSTGRES_PASSWORD     # min 16 char random
JWT_SECRET            # openssl rand -hex 64
COOKIE_SECRET         # openssl rand -hex 64
MEILISEARCH_MASTER_KEY # openssl rand -hex 32
GEMINI_API_KEY        # https://ai.google.dev → Get API key
```

Domain'i biliyorsanız hemen doldurun (sonra rebuild gerekir):

```
STORE_CORS=https://aquahavuz.com,https://www.aquahavuz.com
ADMIN_CORS=https://admin.aquahavuz.com
AUTH_CORS=https://aquahavuz.com,https://admin.aquahavuz.com
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.aquahavuz.com
NEXT_PUBLIC_SEARCH_ENDPOINT=https://search.aquahavuz.com
```

---

## 2. İlk migration (one-shot)

```bash
docker compose -f docker-compose.prod.yml --profile migrate up migrate
```

Beklenen son satır: `Migrations completed successfully` (veya benzeri).
Container kendiliğinden duracak. Sorun varsa:

```bash
docker compose -f docker-compose.prod.yml logs migrate
docker compose -f docker-compose.prod.yml --profile migrate down
```

---

## 3. Stack'i ayağa kaldır

```bash
docker compose -f docker-compose.prod.yml up -d
```

`up -d` dönüş hızlı olur ama servisler `service_healthy` zinciri yüzünden
sırayla gelir. İzlemek için:

```bash
docker compose -f docker-compose.prod.yml ps
watch -n 2 'docker compose -f docker-compose.prod.yml ps --format "{{.Service}}\t{{.Status}}"'
```

`medusa-server` healthcheck'i `start_period: 60s` — ilk 60 sn'de "starting"
gözükmesi normal.

---

## 4. Sağlık denetimi

```bash
# Liveness — sadece süreç ayakta mı?
curl -fsS http://localhost:9000/health | jq
# {"status":"ok","timestamp":"…","uptime_seconds":42}

# Readiness — bağımlılıklar?
curl -fsS http://localhost:9000/ready | jq
# {"status":"ready","checks":[
#   {"name":"postgres","ok":true,"latency_ms":12},
#   {"name":"redis","ok":true,"latency_ms":3},
#   {"name":"meilisearch","ok":true,"latency_ms":21}
# ]}

# Storefront
curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:8000/
```

Herhangi biri 200 dışında dönerse:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 medusa-server
docker compose -f docker-compose.prod.yml logs --tail=200 storefront
```

---

## 5. Admin kullanıcı oluştur

```bash
docker compose -f docker-compose.prod.yml exec medusa-server \
    npx medusa user -e admin@aquahavuz.com -p 'STRONG-PASSWORD-HERE'
```

Sonra https://admin.aquahavuz.com/app → login.

---

## 6. Publishable API Key

Admin panelden: **Settings → Publishable API Keys → Create** →
key'i `PUBLISHABLE_API_KEY` olarak `.env`'e yaz → storefront'u restart et:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate storefront
```

---

## 7. (Opsiyonel) Seed data

```bash
docker compose -f docker-compose.prod.yml exec medusa-server \
    npx medusa exec ./src/scripts/seed.ts
```

Aqua Havuz başlangıç katalog + örnek tenant için.

---

## 8. Smoke test

```bash
# Admin login
curl -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aquahavuz.com","password":"…"}'

# Storefront ürün listesi
curl -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" \
     http://localhost:9000/store/products | jq '.products | length'

# AI chat (Gemini round-trip)
curl -X POST http://localhost:9000/store/ayna/chat \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" \
  -d '{"message":"Merhaba"}'
```

---

## 9. Log lokasyonları

| Servis | Log yolu / komut |
|---|---|
| medusa-server | `docker compose logs medusa-server` |
| medusa-worker | `docker compose logs medusa-worker` |
| Postgres | `docker compose logs postgres` |
| Winston dosya logları | `/app/logs/*.log` (container içi), volume mount yoksa restart'ta silinir |

Persistent log için `medusa-server` ve `medusa-worker` servislerine
`./logs:/app/logs` volume mount ekleyin (prod compose'a).

---

## 10. Güncelleme akışı (zero-downtime değil — kısa kesinti)

```bash
# 1. Yeni kod
git pull

# 2. Build
docker compose -f docker-compose.prod.yml build medusa-server medusa-worker storefront

# 3. Migration varsa
docker compose -f docker-compose.prod.yml --profile migrate up migrate

# 4. Rolling restart
docker compose -f docker-compose.prod.yml up -d --no-deps medusa-server medusa-worker storefront
```

---

## 11. Yedek (her gün cron)

```bash
# Postgres dump
docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > \
    "/backup/medusa-$(date +%F).sql.gz"

# Volume'lar
docker run --rm -v aqua-havuz_postgres_data:/data -v /backup:/b alpine \
    tar czf /b/postgres-vol-$(date +%F).tgz /data
```

Saklama politikası: 7 gün günlük + 4 hafta haftalık + 6 ay aylık (önerilen).

---

## 12. Sorun giderme tablosu

| Belirti | Olası neden | Çözüm |
|---|---|---|
| `/ready` 503, postgres fail | DB henüz hazır değil veya bağlantı yanlış | `docker compose logs postgres` — `pg_isready` çıktısını kontrol |
| `/ready` 503, redis fail | REDIS_URL set ama erişilemez | `docker compose exec medusa-server redis-cli -h redis ping` |
| Admin 500 "JWT secret" | `.env`'de JWT_SECRET boş | Set + `up -d --force-recreate medusa-server` |
| Storefront ürünleri görmüyor | PUBLISHABLE_API_KEY yanlış/boş | Admin'den yeni key al, `.env` güncelle, storefront restart |
| AI chat "GEMINI quota exceeded" | Gemini ücretsiz kota tükendi | OLLAMA_API_URL set ederek yerel fallback'e geç |
| Sentinel restart loop | docker/sentinel.conf erişilemiyor | `ls -la docker/sentinel.conf` — read-only mount path doğru mu? |

---

## 13. Geri alma (rollback)

```bash
# Git tag'e dön
git checkout v<önceki-sürüm>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --force-recreate

# DB schema değiştiyse + geri uyumsuzsa: pg_restore
gunzip -c /backup/medusa-2026-05-26.sql.gz | \
    docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

---

**Son güncelleme:** 2026-05-27 — Faz 9-16 tamamlandı, prod-ready baseline.
