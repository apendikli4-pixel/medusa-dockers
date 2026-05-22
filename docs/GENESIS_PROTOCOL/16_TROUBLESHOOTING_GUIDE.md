# 🐛 TROUBLESHOOTING GUIDE - Sorun Giderme Rehberi

> **"Her hata, öğrenme fırsatıdır. Sistemli yaklaşım, hızlı çözümün anahtarıdır."**

Bu rehber, PROJECT-AYNA-GENESIS projesinde karşılaşılan yaygın sorunları ve çözüm yollarını içerir.

---

## 📋 İçindekiler

1. [Hata Ayıklama Metodolojisi](#hata-ayıklama-metodolojisi)
2. [Docker ve Container Sorunları](#docker-ve-container-sorunları)
3. [Veritabanı Sorunları](#veritabanı-sorunları)
4. [AI/LLM Sorunları](#aillm-sorunları)
5. [API ve Endpoint Sorunları](#api-ve-endpoint-sorunları)
6. [Tenant ve Multi-Tenancy Sorunları](#tenant-ve-multi-tenancy-sorunları)
7. [Performance ve Optimizasyon](#performance-ve-optimizasyon)
8. [Build ve Derleme Hataları](#build-ve-derleme-hataları)
9. [Acil Durum Prosedürleri](#acil-durum-prosedürleri)

---

## 🔍 Hata Ayıklama Metodolojisi

### 1. Hata Mesajını Anlama

Her hata mesajı şu bilgileri içermelidir:
- **Hata türü** (TypeError, ConnectionError, etc.)
- **Hata kodu** (404, 500, ECONNREFUSED, etc.)
- **Stack trace** (hangi dosya ve satırda oluştu)
- **Bağlam** (hangi işlem sırasında oluştu)

### 2. Log Analizi

```bash
# Backend logları
docker logs -f medusa_server_core_v2
docker logs -f medusa_worker_v2

# Frontend logları
docker logs -f medusa_storefront

# PostgreSQL logları
docker logs -f postgres

# Redis logları
docker logs -f redis

# Tüm logları birleştir
docker-compose logs -f --tail=100
```

### 3. Sistem Durumu Kontrolü

```bash
# Container'ların durumu
docker-compose ps

# Disk kullanımı
docker system df

# Bellek kullanımı
docker stats

# Ağ bağlantıları
docker network ls
```

---

## 🐳 Docker ve Container Sorunları

### 1. Container Başlamıyor

**Belirtiler:**
- `docker-compose up -d` sonrası container'lar çalışmıyor
- Container'lar sürekli restart oluyor
- Port conflict hataları

**Çözüm Adımları:**

```bash
# 1. Container loglarını kontrol et
docker logs medusa_server_core_v2

# 2. Port conflict kontrolü
netstat -ano | findstr :9000
netstat -ano | findstr :8000

# 3. Container'ı temizle ve yeniden başlat
docker-compose down -v
docker-compose up -d --build

# 4. Cache temizle
docker system prune -a
docker-compose build --no-cache
```

### 2. Volume Mount Hataları

**Belirtiler:**
- `node_modules` host'tan mount ediliyor hatası
- Dosya izin sorunları
- Anonymous volume hataları

**Çözüm:**

```yaml
# docker-compose.yml'de volume tanımlarını kontrol et
# node_modules, .medusa, dist ASLA host'tan mount edilmemeli

services:
  medusa_server_core_v2:
    volumes:
      - ./src:/app/src  # ✅ Doğru
      # - ./node_modules:/app/node_modules  # ❌ YANLIŞ!
```

### 3. Ağ Bağlantı Sorunları

**Belirtiler:**
- Container'lar birbirini göremiyor
- `ECONNREFUSED` hataları
- DNS çözümleme hataları

**Çözüm:**

```bash
# 1. Docker network'ü kontrol et
docker network ls
docker network inspect project-ayna-genesis_default

# 2. Container içinden bağlantı testi
docker exec -it medusa_server_core_v2 ping postgres
docker exec -it medusa_server_core_v2 curl http://redis:6379

# 3. Network'ü yeniden oluştur
docker-compose down
docker network rm project-ayna-genesis_default
docker-compose up -d
```

---

## 🗄️ Veritabanı Sorunları

### 1. Migration Hataları

**Belirtiler:**
- `npm run db:migrate` hata veriyor
- Migration'lar takılıyor
- Duplicate migration hataları

**Çözüm:**

```bash
# 1. Migration durumunu kontrol et
docker exec -it postgres psql -U postgres -d medusa-genesis -c "SELECT * FROM migrations;"

# 2. Başarısız migration'ı bul
docker logs postgres | grep "migration"

# 3. Migration'ı geri al (DİKKATLİ!)
npm run db:migrate -- --rollback

# 4. Tam sıfırlama (SON ÇARE - Tüm veriler silinir!)
docker-compose down -v
npm run db:create
npm run db:migrate
```

### 2. Bağlantı Havuzu Sorunları

**Belirtiler:**
- `too many clients` hataları
- Connection timeout
- Pool exhaustion

**Çözüm:**

```typescript
// medusa-config.ts'de connection pool ayarlarını kontrol et
module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      // Connection pool ayarları
      max: 20,           // Max bağlantı sayısı
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  },
});
```

### 3. pgvector Kurulum Sorunları

**Belirtiler:**
- `extension "vector" does not exist` hatası
- Embedding sorguları çalışmıyor

**Çözüm:**

```sql
-- PostgreSQL container'ına bağlan
docker exec -it postgres psql -U postgres -d medusa-genesis

-- pgvector extension'ını kur
CREATE EXTENSION IF NOT EXISTS vector;

-- Kontrol et
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## 🤖 AI/LLM Sorunları

### 1. Gemini API Hataları (429/500)

**Belirtiler:**
- `429 Too Many Requests`
- `500 Internal Server Error`
- AI yanıtları gelmiyor

**Çözüm:**

```bash
# 1. Fallback AI devrede mi kontrol et
grep OLLAMA_API_URL .env

# 2. Rate limiting ayarlarını kontrol et
# src/lib/rate-limiter.ts dosyasını incele

# 3. API anahtarını doğrula
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY"

# 4. Ollama fallback'ini test et
curl http://localhost:11434/api/generate -d '{"model":"llama3","prompt":"test"}'
```

### 2. Memory Sistemi Sorunları

**Belirtiler:**
- AI müşteri geçmişini hatırlamıyor
- MemoryTruth/MemoryInsight kayıtları oluşmuyor
- Customer linking hataları

**Çözüm:**

```typescript
// 1. Memory model link'lerini kontrol et
// src/links/ dizinindeki customer link dosyalarını incele

// 2. Memory servislerini test et
const aynaModule = container.resolve("ayna");
const memories = await aynaModule.retrieveMemories({ customerId: "cust_123" });

// 3. Memory archiver job'ını kontrol et
// src/jobs/ayna-memory-archiver.ts
```

### 3. Prompt Injection Hataları

**Belirtiler:**
- Conscience module uyarıları
- Injection detection tetikleniyor
- AI yanıtları engelleniyor

**Çözüm:**

```typescript
// 1. Injection detection ayarlarını kontrol et
// medusa-config.ts
conscience: {
  options: {
    injectionDetection: {
      enabled: true,
      riskThreshold: 70,  // Düşük risk eşiği
    }
  }
}

// 2. Conscience loglarını incele
docker logs medusa_server_core_v2 | grep conscience

// 3. Allow list'e güvenli pattern'ler ekle
// .env dosyasında INJECTION_ALLOW_LIST
```

---

## 🌐 API ve Endpoint Sorunları

### 1. Authentication Hataları

**Belirtiler:**
- `401 Unauthorized`
- `403 Forbidden`
- JWT token geçersiz

**Çözüm:**

```bash
# 1. JWT secret'ları kontrol et
grep JWT_SECRET .env
grep COOKIE_SECRET .env

# 2. Token'ı decode et ve kontrol et
echo "YOUR_JWT_TOKEN" | cut -d '.' -f 2 | base64 -d

# 3. Admin kullanıcısını doğrula
docker exec -it postgres psql -U postgres -d medusa-genesis -c "SELECT * FROM auth_identity;"
```

### 2. Zod Validation Hataları

**Belirtiler:**
- `400 Bad Request`
- Validation error mesajları
- Request body parse hataları

**Çözüm:**

```typescript
// 1. Schema'yı kontrol et
// Örnek: src/api/store/ayna/chat/route.ts

import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1, "Message required"),
  // ... diğer alanlar
});

// 2. Request body'yi logla
console.log("Request body:", req.body);

// 3. Schema'yı manuel test et
const result = chatSchema.safeParse({ message: "test" });
console.log(result.error); // Hata detaylarını göster
```

### 3. CORS Hataları

**Belirtiler:**
- `Access to fetch at 'URL' from origin 'ORIGIN' has been blocked by CORS policy`
- Preflight request hataları

**Çözüm:**

```typescript
// medusa-config.ts'de CORS ayarlarını kontrol et
module.exports = defineConfig({
  projectConfig: {
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000",
    },
  },
});
```

---

## 🏢 Tenant ve Multi-Tenancy Sorunları

### 1. Tenant İzolasyon İhlalleri

**Belirtiler:**
- Farklı tenant'ların verileri karışıyor
- RLS kuralları çalışmıyor
- Cross-tenant veri sızıntısı

**Çözüm:**

```typescript
// 1. Tenant isolation filter'ı kontrol et
// src/modules/tenant/loaders/tenant-isolation-filter.ts

// 2. RLS kurallarını doğrula
docker exec -it postgres psql -U postgres -d medusa-genesis -c "
  SELECT schemaname, tablename, policyname 
  FROM pg_policies 
  WHERE schemaname = 'public';
"

// 3. Tenant context'i logla
console.log("Current tenant:", tenantContextStore.getStore());
```

### 2. Tenant Entity Link Hataları

**Belirtiler:**
- `Service undefined` hataları
- Link tanımları çalışmıyor
- Cyclic dependency hataları

**Çözüm:**

```typescript
// ❌ YANLIŞ - Direct module import
import { AynaModule } from "./ayna";
defineLink(AynaModule.linkable.memoryTruth, TenantModule.linkable.tenant);

// ✅ DOĞRU - Explicit object configuration
defineLink(
  {
    serviceName: "ayna",
    field: "memory_truth",
    entity: "MemoryTruth",
    linkable: "memoryTruth",
    primaryKey: "id",
  },
  TenantModule.linkable.tenant
);
```

---

## ⚡ Performance ve Optimizasyon

### 1. Yavaş Veritabanı Sorguları

**Belirtiler:**
- API yanıtları yavaş
- Timeout hataları
- High CPU usage

**Çözüm:**

```sql
-- 1. Yavaş sorguları bul
docker exec -it postgres psql -U postgres -d medusa-genesis -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"

-- 2. Index eksikliklerini kontrol et
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

-- 3. Query planını analiz et
EXPLAIN ANALYZE SELECT * FROM products WHERE title ILIKE '%test%';
```

### 2. Memory Leaks

**Belirtiler:**
- Container bellek kullanımı artıyor
- Out of memory hataları
- Performance degradation

**Çözüm:**

```bash
# 1. Memory kullanımını izle
docker stats

# 2. Node.js heap dump al
# package.json'a ekle: "heapdump": "^0.x.x"
node --inspect=0.0.0.0:9229 dist/index.js

# 3. Chrome DevTools ile memory analizi yap
# chrome://inspect adresinden bağlan
```

### 3. AI Response Time Optimizasyonu

**Belirtiler:**
- AI yanıtları çok yavaş
- Timeout hataları
- Kullanıcı deneyimi kötü

**Çözüm:**

```typescript
// 1. Semantic cache kullan
// src/lib/cache/semantic-cache.service.ts

// 2. Streaming response etkinleştir
const stream = await geminiModel.generateContentStream(prompt);

// 3. Model parametrelerini optimize et
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    maxOutputTokens: 1000,  // Daha kısa yanıtlar
    temperature: 0.7,
  }
});
```

---

## 🔧 Build ve Derleme Hataları

### 1. TypeScript Derleme Hataları

**Belirtiler:**
- `npx tsc --noEmit` hataları
- Tip uyumsuzlukları
- Module resolution hataları

**Çözüm:**

```bash
# 1. Detaylı hata mesajları al
npx tsc --noEmit --pretty --diagnostics

# 2. tsconfig.json'u kontrol et
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
  }
}

# 3. Node modules'ı temizle
rm -rf node_modules package-lock.json
npm install
```

### 2. Medusa Build Hataları

**Belirtiler:**
- `npm run build` başarısız
- Admin UI build hataları
- Module resolution hataları

**Çözüm:**

```bash
# 1. .medusa cache'ini temizle
rm -rf .medusa

# 2. Dist klasörünü temizle
rm -rf dist

# 3. Temiz build
npm run build

# 4. Detaylı log al
npm run build -- --verbose
```

---

## 🚨 Acil Durum Prosedürleri

### 1. Sistem Çöküşü

**Belirtiler:**
- Tüm servisler yanıt vermiyor
- Database bağlantısı kopuk
- Container'lar çalışmıyor

**Acil Müdahale:**

```bash
# 1. Hızlı durum değerlendirmesi
docker-compose ps
docker-compose logs --tail=100

# 2. Kritik servisleri yeniden başlat
docker-compose restart postgres redis meilisearch

# 3. Backend ve frontend'i yeniden başlat
docker-compose restart medusa_server_core_v2 medusa_storefront

# 4. Veritabanı yedeğini kontrol et
docker exec postgres pg_dump -U postgres medusa-genesis > emergency_backup.sql
```

### 2. Veri Kaybı/Kirlenmesi

**Belirtiler:**
- Veriler kayıp
- Yanlış veriler oluşmuş
- Migration sonrası tutarsızlıklar

**Acil Müdahale:**

```bash
# 1. Hemen database'i read-only yap
docker exec -it postgres psql -U postgres -d medusa-genesis -c "
  ALTER DATABASE medusa-genesis SET default_transaction_read_only = on;
"

# 2. Son yedeği bul
ls -la backups/

# 3. Yedekten geri yükle
docker exec -i postgres psql -U postgres -d medusa-genesis < backups/latest_backup.sql

# 4. Read-only modunu kapat
docker exec -it postgres psql -U postgres -d medusa-genesis -c "
  ALTER DATABASE medusa-genesis SET default_transaction_read_only = off;
"
```

### 3. Güvenlik İhlali

**Belirtiler:**
- Şüpheli aktivite
- API anahtarları sızmış
- Yetkisiz erişim

**Acil Müdahale:**

```bash
# 1. Tüm API anahtarlarını iptal et
# .env dosyasındaki tüm secret'ları değiştir

# 2. Tüm aktif session'ları sonlandır
docker exec -it postgres psql -U postgres -d medusa-genesis -c "
  DELETE FROM session WHERE expires_at > NOW();
"

# 3. Admin şifrelerini sıfırla
npm run db:seed -- --reset-admin-password

# 4. Güvenlik audit loglarını incele
docker logs medusa_server_core_v2 | grep "security\|auth\|unauthorized"
```

---

## 📊 Debug Araçları ve Yardımcılar

### 1. Health Check Endpoint'leri

```bash
# Backend health check
curl http://localhost:9000/health

# Database connection check
docker exec -it postgres psql -U postgres -c "SELECT 1;"

# Redis connection check
docker exec -it redis redis-cli ping

# Meilisearch health check
curl http://localhost:7700/health
```

### 2. Monitoring Scripts

```bash
# Sistem durumu raporu
./scripts/system-health.sh

# Database boyut raporu
docker exec -it postgres psql -U postgres -d medusa-genesis -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Active connections raporu
docker exec -it postgres psql -U postgres -c "
  SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query
  FROM pg_stat_activity
  WHERE state = 'active';
"
```

---

## 📞 Yardım ve Destek

### İç Kaynaklar

- **GitHub Issues:** [github.com/aynagenesis/platform/issues](https://github.com/aynagenesis/platform/issues)
- **Dokümantasyon:** `docs/GENESIS_PROTOCOL/` dizini
- **Team Slack/Discord:** #tech-support kanalı

### Dış Kaynaklar

- **Medusa Dokümantasyonu:** [docs.medusajs.com](https://docs.medusajs.com)
- **Medusa GitHub:** [github.com/medusajs](https://github.com/medusajs)
- **Medusa Discord:** [discord.gg/medusajs](https://discord.gg/medusajs)
- **Stack Overflow:** [stackoverflow.com/questions/tagged/medusa](https://stackoverflow.com/questions/tagged/medusa)

---

## 🔄 Son Güncelleme

- **Tarih:** 2026-05-14
- **Güncelleyen:** Core Team
- **Değişiklikler:** İlk oluşturma

---

**Unutmayın:** Her sorun bir öğrenme fırsatıdır. Çözdüğünüz her problem, sistemi daha da güçlendirir! 💪