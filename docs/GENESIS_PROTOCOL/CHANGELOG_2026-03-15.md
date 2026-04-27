# CHANGELOG: ENTERPRISE HARDENING (2026-03-15)
> **Author:** Antigravity  
> **Topic:** Security, Observability, Reliability, SEO, RBAC  
> **Spec:** `.kiro/specs/enterprise-hardening/`

Bu güncelleme, projenin production'a alınması öncesinde gerçekleştirilen kapsamlı güvenlik sertleştirme, gözlemlenebilirlik ve güvenilirlik iyileştirmelerini içerir. Tüm değişiklikler Property-Based Testing (PBT) metodolojisiyle doğrulanmıştır.

---

## 🔐 A — KRİTİK (Production Blocker)

### 1. PayTR Webhook HMAC-SHA256 İmza Doğrulaması
- **Sorun:** `getWebhookActionAndData` metodu imzasız veya sahte imzalı payload'ları `action: "authorized"` olarak işliyordu — ciddi güvenlik açığı.
- **Çözüm:** `src/providers/paytr/provider.ts` içine HMAC-SHA256 imza doğrulaması eklendi.
  - `hash_str = merchant_key + merchant_salt + merchant_oid + status` ile hash hesaplanıyor
  - `crypto.timingSafeEqual()` ile timing attack önlemi alındı
  - Geçersiz imza → `action: "not_supported"` + warn log
- **Test:** 14/14 PBT testi geçiyor (keşif + koruma)

### 2. İyzico Webhook SHA1 İmza Doğrulaması
- **Sorun:** İyzico webhook'ları imza kontrolü yapılmadan işleniyordu.
- **Çözüm:** `src/providers/iyzico/provider.ts` içine SHA1 imza doğrulaması eklendi.
  - `secret_key + paymentId + paymentStatus` → SHA1 → base64
  - `crypto.timingSafeEqual()` ile güvenli karşılaştırma
  - Geçersiz imza → `action: "not_supported"` + warn log
- **Test:** PBT keşif ve koruma testleri geçiyor

### 3. Cloudinary `remotePatterns` Düzeltmesi
- **Sorun:** `storefront/next.config.js` içinde `res.cloudinary.com` hostname'i eksikti — Cloudinary görselleri `next/image` ile yüklenemiyordu.
- **Çözüm:** `images.remotePatterns` dizisine `{ protocol: "https", hostname: "res.cloudinary.com" }` eklendi.
- **Korunan:** Mevcut S3 ve localhost pattern'ları değiştirilmedi.

### 4. ChatWidget Customer Prop-Drilling
- **Sorun:** `storefront/src/app/layout.tsx` içinde `<ChatWidget />` prop'suz çağrılıyordu — B2B müşteri kimliği hiçbir zaman iletilmiyordu.
- **Çözüm:** `RootLayout` fonksiyonu `async` yapıldı, `retrieveCustomer()` server-side çağrıldı.
  - `customerGroup = customer?.groups?.[0]?.name ?? "B2C_Retail"` ile türetiliyor
  - `<ChatWidget customer={customer} customerGroup={customerGroup} />` ile prop geçiliyor
- **Korunan:** Anonim kullanıcı → `"B2C_Retail"` fallback çalışmaya devam ediyor.

---

## 📊 B — KISA VADELİ

### 5. Sentry Entegrasyonu
- **Storefront:** `@sentry/nextjs` eklendi. `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` oluşturuldu.
- **Backend:** `@sentry/node` eklendi. `src/lib/sentry.ts` oluşturuldu, `medusa-config.ts`'den import ediliyor.
- **Yapılandırma:** DSN değerleri `.env` ve `storefront/.env` dosyalarına `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` olarak eklenmeli.

### 6. Health Check Endpoint'leri
- **Eklenen:** `src/api/health/route.ts`
  - `GET /health/live` → `200 { status: "alive" }` (süreç ayaktaysa)
  - `GET /health/ready` → `200 { status: "ready", checks: { db: "ok", redis: "ok" } }` veya `503`
- **Kullanım:** Kubernetes liveness/readiness probe'ları için hazır.

### 7. Correlation ID Middleware
- **Eklenen:** `src/api/middlewares.ts` içine correlation ID middleware eklendi.
  - Gelen `x-correlation-id` header'ı varsa propagate edilir, yoksa `crypto.randomUUID()` üretilir.
  - Her response'a `x-correlation-id` header'ı eklenir.
  - Distributed tracing ve log korelasyonu için temel altyapı.

### 8. JSON-LD Tamamlama
- **Ürün sayfası:** `brand` (Organization), `image` (array), `aggregateRating` alanları eklendi.
- **Blog sayfası:** `publisher` (Organization schema) ve `image` alanları eklendi.
- **Etki:** Google Rich Results uyumluluğu artırıldı.

### 9. Chat History localStorage Persistence
- **Sorun:** Sayfa yenilenince chat mesajları kayboluyordu.
- **Çözüm:** `storefront/src/modules/chat/components/chat-widget.tsx` güncellendi.
  - Session-scoped key: `chat_history_${customer?.id ?? "anon"}`
  - Mount'ta localStorage'dan yükleme, `messages` değiştiğinde kaydetme
  - Maksimum 50 mesaj sınırı
  - Kullanıcı izolasyonu: farklı `customerId` → farklı storage key

---

## 🔧 C — UZUN VADELİ

### 10. Circuit Breaker — Yurtiçi SOAP API
- **Sorun:** Yurtiçi SOAP API timeout'ları checkout akışını blokluyordu.
- **Çözüm:** `src/providers/yurtici/service.ts` içine `opossum` circuit breaker eklendi.
  - Konfigürasyon: `timeout: 5000ms`, `errorThresholdPercentage: 50%`, `resetTimeout: 30s`
  - Fallback: `{ tracking_number: null, status: "unavailable", message: "Kargo servisi geçici olarak kullanılamıyor" }`
  - Circuit açıkken checkout devam eder, kargo bilgisi sonradan güncellenir.

### 11. RBAC Sistemi
- **Eklenen:** `src/middlewares/rbac.ts`
  - `SUPER_ADMIN`: tüm kaynaklara erişim
  - `ADMIN`: `products`, `orders`
  - `VIEWER`: `products` (read-only)
  - Yetkisiz erişim → `403 Forbidden`
- **Entegrasyon:** `src/api/middlewares.ts` içindeki admin route'larına eklendi.

---

## 📝 Yapılandırma Gereksinimleri

Aşağıdaki env değişkenlerinin production'da doldurulması gerekiyor:

| Değişken | Dosya | Açıklama |
|---|---|---|
| `SENTRY_DSN` | `.env` | Backend Sentry DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | `storefront/.env` | Storefront Sentry DSN |
| `PAYTR_MERCHANT_ID` | `.env` | PayTR merchant ID |
| `PAYTR_MERCHANT_KEY` | `.env` | PayTR merchant key |
| `PAYTR_MERCHANT_SALT` | `.env` | PayTR merchant salt |
| `IYZICO_API_KEY` | `.env` | İyzico API key |
| `IYZICO_SECRET_KEY` | `.env` | İyzico secret key |

---

## ✅ Test Özeti

| Kategori | Test Sayısı | Durum |
|---|---|---|
| Webhook imza doğrulaması (PayTR + İyzico) | 14 | ✅ Geçiyor |
| Cloudinary remotePatterns | 3 | ✅ Geçiyor |
| ChatWidget prop-drilling | 3 | ✅ Geçiyor |
| Health check endpoint'leri | 2 | ✅ Geçiyor |
| Correlation ID middleware | 2 | ✅ Geçiyor |
| Circuit breaker | 3 | ✅ Geçiyor |
| RBAC sistemi | 3 | ✅ Geçiyor |
