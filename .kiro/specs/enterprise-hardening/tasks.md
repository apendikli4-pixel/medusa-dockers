# Implementation Plan

<!-- ============================================================
     A — KRİTİK (Production Blocker)
     ============================================================ -->

- [x] 1. Webhook imza doğrulaması — hata koşulu keşif testi
  - **Property 1: Bug Condition** - PayTR & İyzico İmzasız Webhook
  - **KRİTİK**: Bu test DÜZELTİLMEMİŞ kodda BAŞARISIZ olmalı — başarısızlık hatanın varlığını kanıtlar
  - **HEDEF**: `getWebhookActionAndData` metodunun imzasız payload için `action: "authorized"` döndürdüğünü counterexample ile belgele
  - **Kapsam (Scoped PBT)**: `{ merchant_oid: "paytr_test_001", status: "success", hash: "" }` ve `{ hash: "SAHTE_HASH" }` ile somut başarısız durumları kapsa
  - PayTR: `getWebhookActionAndData({ data: { merchant_oid: "paytr_test_001", status: "success", hash: "" } })` → `action: "authorized"` döner (HATA KANITI)
  - İyzico: `getWebhookActionAndData({ data: { paymentId: "iyzi_test_001", status: "SUCCESS" } })` → `action: "authorized"` döner (HATA KANITI)
  - Rastgele geçersiz hash string'leri için property: `∀ invalidHash → action MUST NOT be "authorized"`
  - Düzeltilmemiş kodda çalıştır — **BEKLENEN SONUÇ: BAŞARISIZ** (bu doğru — hatayı kanıtlar)
  - Bulunan counterexample'ları belgele (örn. `getWebhookActionAndData({hash: ""})` → `{action: "authorized"}`)
  - Görev tamamlandı sayılır: test yazıldı, çalıştırıldı, başarısızlık belgelendi
  - _Requirements: 1.1, 1.2, 1.3_


- [x] 2. Webhook imza doğrulaması — koruma testi (düzeltme öncesi)
  - **Property 2: Preservation** - Geçerli İmzalı Webhook İşleme
  - **ÖNEMLİ**: Gözlem-önce metodolojisi — düzeltilmemiş kodda geçerli imzalı payload davranışını gözlemle
  - Gözlem: Doğru HMAC-SHA256 ile imzalanmış PayTR payload → `action: "authorized"` döner (korunmalı)
  - Gözlem: Doğru imzalı İyzico payload → `action: "authorized"` döner (korunmalı)
  - Property: `∀ validSignedPayload → action = "authorized"` (düzeltme sonrasında da geçerli olmalı)
  - Düzeltilmemiş kodda çalıştır — **BEKLENEN SONUÇ: BAŞARILI** (baseline davranışı doğrular)
  - Görev tamamlandı sayılır: testler yazıldı, çalıştırıldı, düzeltilmemiş kodda geçiyor
  - _Requirements: 3.1, 3.2_


- [x] 3. PayTR webhook HMAC-SHA256 imza doğrulaması uygula

  - [x] 3.1 `getWebhookActionAndData` metodunu düzelt — `src/providers/paytr/provider.ts`
    - `payload.data` üzerinden `merchant_oid`, `status`, `total_amount`, `hash` alanlarını oku
    - `hash_str = merchant_key + merchant_salt + merchant_oid + status` string'ini oluştur
    - `crypto.createHmac('sha256', merchant_salt).update(hash_str).digest('base64')` ile `expected_hash` hesapla
    - `crypto.timingSafeEqual(Buffer.from(body.hash), Buffer.from(expected_hash))` ile karşılaştır (timing attack önlemi)
    - Eşleşmezse `this.logger_.warn("PayTR: Invalid webhook signature — possible attack")` yaz ve `{ action: "not_supported" }` döndür
    - Eşleşirse `{ action: "authorized", data: { session_id: body.merchant_oid, amount: body.total_amount } }` döndür
    - _Bug_Condition: `isBugCondition_webhook(payload)` — `payload.hash` boş, null veya geçersiz HMAC_
    - _Expected_Behavior: geçersiz imza → `action: "not_supported"`; geçerli imza → `action: "authorized"`_
    - _Preservation: Geçerli imzalı PayTR callback'leri `authorized` döndürmeye devam etmeli (3.1)_
    - _Requirements: 2.1, 2.3_

  - [x] 3.2 Keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - PayTR İmzasız Webhook Reddediliyor
    - **ÖNEMLİ**: Görev 1'deki AYNI testi yeniden çalıştır — yeni test yazma
    - Görev 1'deki test artık geçmeli: imzasız payload → `action: "not_supported"`
    - **BEKLENEN SONUÇ: BAŞARILI** (hatanın düzeltildiğini onaylar)
    - _Requirements: 2.1, 2.3_

  - [x] 3.3 Koruma testlerinin hâlâ geçtiğini doğrula
    - **Property 2: Preservation** - Geçerli PayTR Webhook Korunuyor
    - **ÖNEMLİ**: Görev 2'deki AYNI testleri yeniden çalıştır
    - Geçerli imzalı payload → `action: "authorized"` döndürmeye devam etmeli
    - **BEKLENEN SONUÇ: BAŞARILI** (regresyon yok)

  - [x] 3.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına PayTR HMAC-SHA256 düzeltmesini ekle
    - `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` içindeki PayTR provider satırını güncelle


- [x] 4. İyzico webhook SHA1 imza doğrulaması uygula

  - [x] 4.1 `getWebhookActionAndData` metodunu düzelt — `src/providers/iyzico/provider.ts`
    - `payload.data` üzerinden `paymentId`, `paymentStatus`, `iyziReferenceCode` alanlarını oku
    - İyzico imza algoritması: `secret_key + paymentId + paymentStatus` → SHA1 → base64
    - `crypto.createHash('sha1').update(secret_key + body.paymentId + body.paymentStatus).digest('base64')` ile `expected_signature` hesapla
    - Gelen `iyziReferenceCode` veya `signature` alanıyla `crypto.timingSafeEqual` ile karşılaştır
    - Eşleşmezse `this.logger_.warn("İyzico: Invalid webhook signature")` yaz ve `{ action: "not_supported" }` döndür
    - Eşleşirse `{ action: "authorized", data: { session_id: body.paymentId, amount: body.price } }` döndür
    - _Bug_Condition: `isBugCondition_webhook(payload)` — imza alanı yok veya geçersiz_
    - _Expected_Behavior: geçersiz imza → `action: "not_supported"`_
    - _Preservation: Geçerli imzalı İyzico callback'leri `authorized` döndürmeye devam etmeli (3.2)_
    - _Requirements: 2.2, 2.3_

  - [x] 4.2 Keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - İyzico İmzasız Webhook Reddediliyor
    - Görev 1'deki İyzico test senaryosunu yeniden çalıştır
    - **BEKLENEN SONUÇ: BAŞARILI**
    - _Requirements: 2.2, 2.3_

  - [x] 4.3 Koruma testlerinin hâlâ geçtiğini doğrula
    - **Property 2: Preservation** - Geçerli İyzico Webhook Korunuyor
    - Görev 2'deki İyzico test senaryosunu yeniden çalıştır
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 4.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına İyzico SHA1 düzeltmesini ekle
    - `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` içindeki İyzico provider satırını güncelle


- [x] 5. Cloudinary remotePatterns — hata koşulu keşif testi

  - **Property 1: Bug Condition** - Cloudinary Görsel Yüklenemiyor
  - **KRİTİK**: Bu test düzeltilmemiş kodda BAŞARISIZ olmalı
  - **Kapsam**: `isBugCondition_cloudinary("https://res.cloudinary.com/aqua/image/upload/v1/pool.jpg")` → `true`
  - `storefront/next.config.js` içindeki `remotePatterns` listesini oku ve `res.cloudinary.com` olmadığını doğrula
  - `next/image` ile Cloudinary URL'si kullanıldığında Next.js hata fırlattığını belgele
  - **BEKLENEN SONUÇ: BAŞARISIZ** (Cloudinary hostname eksik — hata kanıtlandı)
  - _Requirements: 1.4_

- [x] 6. Cloudinary remotePatterns düzeltmesi uygula

  - [x] 6.1 `storefront/next.config.js` dosyasını güncelle
    - `images.remotePatterns` dizisine `{ protocol: "https", hostname: "res.cloudinary.com" }` ekle
    - Mevcut S3 ve localhost pattern'larına dokunma
    - _Bug_Condition: `"res.cloudinary.com" NOT IN remotePatterns`_
    - _Expected_Behavior: Cloudinary URL'leri `next/image` tarafından optimize edilip sunulur_
    - _Preservation: Mevcut S3 ve localhost pattern'ları bozulmadan çalışmaya devam etmeli (3.3)_
    - _Requirements: 2.4, 3.3_

  - [x] 6.2 Keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - Cloudinary Görseli Yükleniyor
    - `remotePatterns` listesinde `res.cloudinary.com` varlığını doğrula
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 6.3 Koruma testi — mevcut S3 pattern'ları korunuyor
    - **Property 2: Preservation** - S3 ve Localhost Pattern'ları Bozulmadı
    - `medusa-public-images.s3.eu-west-1.amazonaws.com`, `localhost:9000` pattern'larının hâlâ listede olduğunu doğrula
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 6.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına Cloudinary remotePatterns düzeltmesini ekle


- [x] 7. ChatWidget customer prop — hata koşulu keşif testi

  - **Property 1: Bug Condition** - ChatWidget B2B Kimliği Alamıyor
  - **KRİTİK**: Bu test düzeltilmemiş kodda BAŞARISIZ olmalı
  - `storefront/src/app/layout.tsx` içinde `<ChatWidget />` prop'suz çağrıldığını doğrula
  - B2B müşteri senaryosu: `customer.id` ve `customerGroup` her zaman `undefined` olduğunu belgele
  - Backend'e giden istekte `customerId: undefined` ve `customerGroup: "B2C_Retail"` (hardcoded) gönderildiğini doğrula
  - **BEKLENEN SONUÇ: BAŞARISIZ** (prop drilling eksik — hata kanıtlandı)
  - _Requirements: 1.5, 1.6_


- [x] 8. ChatWidget customer prop düzeltmesi uygula

  - [x] 8.1 `storefront/src/app/layout.tsx` dosyasını güncelle
    - `export default function RootLayout` → `export default async function RootLayout` yap
    - Medusa SDK veya `@lib/data/customer` üzerinden `getCustomer()` server-side çağır (try/catch ile — anonim kullanıcıda null döner)
    - `customerGroup` değerini `customer?.groups?.[0]?.name ?? "B2C_Retail"` ile türet
    - `<ChatWidget customer={customer} customerGroup={customerGroup} />` şeklinde prop geç
    - _Bug_Condition: `renderContext.customer IS undefined AND ChatWidget receives customer=undefined`_
    - _Expected_Behavior: B2B müşteri → doğru `customerId` ve `customerGroup` backend'e iletilir_
    - _Preservation: Anonim kullanıcı → `customerGroup: "B2C_Retail"` fallback korunmalı (3.4)_
    - _Requirements: 2.5, 2.6, 3.4_

  - [x] 8.2 Keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - ChatWidget B2B Kimliği Alıyor
    - B2B müşteri senaryosunda `customer.id` ve `customerGroup` doğru iletildiğini doğrula
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 8.3 Koruma testi — anonim kullanıcı fallback korunuyor
    - **Property 2: Preservation** - B2C Fallback Çalışıyor
    - Anonim kullanıcı → `customerGroup: "B2C_Retail"` fallback hâlâ çalışıyor
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 8.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` içindeki "Storefront Mimarisi & Personalization" bölümünü güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına ChatWidget prop-drilling düzeltmesini ekle


- [x] 9. Sentry entegrasyonu uygula

  - [x] 9.1 Storefront Sentry kurulumu — `storefront/`
    - `storefront/package.json` dosyasına `@sentry/nextjs` ekle
    - `storefront/sentry.client.config.ts` oluştur: `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 1.0, replaysSessionSampleRate: 0.1 })`
    - `storefront/sentry.server.config.ts` oluştur: `Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0 })`
    - `storefront/sentry.edge.config.ts` oluştur: DSN ile minimal init
    - `storefront/next.config.js` dosyasını `withSentryConfig(nextConfig, sentryWebpackPluginOptions)` ile sar
    - _Bug_Condition: `sentrySDK IS NOT initialized AND error IS NOT reported`_
    - _Expected_Behavior: üretim hatası → Sentry'de stack trace ile görünür_
    - _Requirements: 2.7_

  - [x] 9.2 Backend Sentry kurulumu — `src/`
    - `package.json` dosyasına `@sentry/node` ekle
    - `src/lib/sentry.ts` oluştur: `Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0 })`
    - `medusa-config.ts` veya uygulama giriş noktasında `import "./lib/sentry"` ekle
    - _Requirements: 2.8_

  - [x] 9.3 Koruma testi — normal akışta performans degradasyonu yok
    - **Property 2: Preservation** - Sentry Aktifken Normal Akış Korunuyor
    - Sentry init sonrası mevcut API endpoint'lerinin yanıt sürelerini ölç
    - **BEKLENEN SONUÇ: BAŞARILI** (3.5)

  - [x] 9.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına Sentry entegrasyonunu ekle
    - `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` içine Sentry bölümü ekle


<!-- ============================================================
     B — KISA VADELİ
     ============================================================ -->

- [x] 10. Health check endpoint'leri — hata koşulu keşif testi

  - **Property 1: Bug Condition** - Health Check 404 Dönüyor
  - `GET /health/live` → 404 döndüğünü belgele (endpoint yok)
  - `GET /health/ready` → 404 döndüğünü belgele (endpoint yok)
  - **BEKLENEN SONUÇ: BAŞARISIZ** (endpoint eksik — hata kanıtlandı)
  - _Requirements: 1.9, 1.10_

- [x] 11. Health check endpoint'leri uygula

  - [x] 11.1 `src/api/health/route.ts` dosyasını oluştur
    - `GET /health/live`: süreç ayaktaysa `200 { status: "alive" }` döndür
    - `GET /health/ready`: DB ping + Redis ping yap; tümü başarılıysa `200 { status: "ready", checks: { db: "ok", redis: "ok" } }`, herhangi biri başarısızsa `503 { status: "unavailable", checks: {...} }` döndür
    - DB bağlantısı için Medusa container'dan `pgConnection` veya `dataSource` al
    - Redis bağlantısı için `ioredis` client ping yap
    - _Bug_Condition: `endpoint NOT EXISTS AND response.status = 404`_
    - _Expected_Behavior: `/health/live` → 200; `/health/ready` → 200 (bağımlılıklar sağlıklıysa)_
    - _Preservation: Mevcut API endpoint'leri aynı davranışı sergilemeye devam etmeli (3.6)_
    - _Requirements: 2.9, 2.10, 3.6_

  - [x] 11.2 Keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - Health Check 200 Dönüyor
    - `/health/live` → 200, `/health/ready` → 200 (DB/Redis up)
    - DB down senaryosunda `/health/ready` → 503 döndüğünü doğrula
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 11.3 Koruma testi — mevcut endpoint'ler etkilenmiyor
    - **Property 2: Preservation** - Mevcut API Endpoint'leri Korunuyor
    - Mevcut store/admin endpoint'lerinin yanıt formatı değişmedi
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 11.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına health check endpoint'lerini ekle
    - `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` içine Health Check bölümü ekle


- [x] 12. Correlation ID middleware — hata koşulu keşif testi

  - **Property 1: Bug Condition** - Correlation ID Header Yok
  - HTTP isteği gönder ve response header'larında `x-correlation-id` olmadığını doğrula
  - Log satırlarında `correlationId` alanı olmadığını belgele
  - **BEKLENEN SONUÇ: BAŞARISIZ** (middleware eksik — hata kanıtlandı)
  - _Requirements: 1.11_

- [x] 13. Correlation ID middleware uygula

  - [x] 13.1 `src/api/middlewares.ts` dosyasına correlation ID middleware ekle
    - Her istekte `req.headers["x-correlation-id"]` oku; yoksa `crypto.randomUUID()` üret
    - `res.setHeader("x-correlation-id", correlationId)` ile response'a ekle
    - `req.correlationId = correlationId` ile sonraki middleware'lere aktar
    - Logger context'e `{ correlationId }` enjekte et
    - Property: `∀ request → response MUST contain "x-correlation-id" header`
    - Property: `∀ request WITH existing x-correlation-id → same ID propagated (not replaced)`
    - _Bug_Condition: `"x-correlation-id" NOT IN request.headers AND NOT IN response.headers`_
    - _Expected_Behavior: her yanıtta `x-correlation-id` header mevcut_
    - _Preservation: Mevcut response header'ları ve API kontratları değişmemeli (3.7)_
    - _Requirements: 2.11, 3.7_

  - [x] 13.2 Keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - Correlation ID Header Mevcut
    - Header'sız istek → response'da yeni UUID v4 `x-correlation-id` var
    - Header'lı istek → aynı ID propagate ediliyor
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 13.3 Koruma testi — mevcut header'lar bozulmadı
    - **Property 2: Preservation** - Mevcut Response Header'ları Korunuyor
    - Mevcut `Content-Type`, `Authorization` vb. header'lar değişmedi
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 13.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına correlation ID middleware'ini ekle


- [x] 14. JSON-LD eksik alanları tamamla

  - [x] 14.1 Ürün sayfası JSON-LD'yi tamamla — `storefront/src/app/[countryCode]/(main)/products/[handle]/page.tsx`
    - Mevcut `schema.org/Product` markup'ına `brand` (Organization), `image` (array), `aggregateRating` (varsa) alanlarını ekle
    - `brand: { "@type": "Organization", "name": "Aqua Havuz" }` ekle
    - `image` alanını string yerine array yap: `[product.thumbnail, ...product.images?.map(i => i.url)]`
    - _Preservation: Mevcut sayfa yapısı, stil ve işlevsellik korunmalı (3.8)_
    - _Requirements: 2.12, 3.8_

  - [x] 14.2 Blog sayfası JSON-LD'yi tamamla — `storefront/src/app/[countryCode]/(main)/blog/[slug]/page.tsx`
    - Mevcut `schema.org/Article` markup'ına `image` ve `publisher` (Organization schema) alanlarını ekle
    - `publisher: { "@type": "Organization", "name": "Aqua Havuz", "logo": { "@type": "ImageObject", "url": "..." } }` ekle
    - _Requirements: 2.13, 3.8_

  - [x] 14.3 Koruma testi — sayfa yapısı bozulmadı
    - **Property 2: Preservation** - Sayfa Yapısı ve Stil Korunuyor
    - JSON-LD eklendikten sonra sayfaların render edildiğini ve mevcut bileşenlerin çalıştığını doğrula
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 14.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına JSON-LD tamamlama notunu ekle


- [x] 15. Chat history localStorage persistence — hata koşulu keşif testi

  - **Property 1: Bug Condition** - Sayfa Yenilenince Mesajlar Kayboluyor
  - ChatWidget'a mesaj gönder, sayfayı yenile, `messages` state'inin `[]` olduğunu doğrula
  - `localStorage.getItem("chat_history_anon")` → `null` döndüğünü belgele
  - **BEKLENEN SONUÇ: BAŞARISIZ** (localStorage entegrasyonu yok — hata kanıtlandı)
  - _Requirements: 1.14_

- [x] 16. Chat history localStorage persistence uygula

  - [x] 16.1 `storefront/src/modules/chat/components/chat-widget.tsx` dosyasını güncelle
    - Session-scoped key: `const storageKey = \`chat_history_\${customer?.id ?? "anon"}\``
    - Mount'ta localStorage'dan yükle: `useEffect(() => { const saved = localStorage.getItem(storageKey); if (saved) setMessages(JSON.parse(saved)) }, [storageKey])`
    - `messages` değiştiğinde kaydet: `useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50))) }, [messages, storageKey])`
    - Maksimum 50 mesaj sınırı (localStorage boyut kontrolü)
    - Property: `∀ (userId1 ≠ userId2) → storageKey1 ≠ storageKey2` (izolasyon garantisi)
    - _Bug_Condition: `messages IN localStorage IS NULL AFTER page reload`_
    - _Expected_Behavior: sayfa yenilenince mesajlar localStorage'dan yüklenir_
    - _Preservation: Farklı kullanıcılar arasında veri izolasyonu sağlanmalı (3.9)_
    - _Requirements: 2.14, 3.9_

  - [x] 16.2 Keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - Mesajlar Sayfa Yenilenince Korunuyor
    - Mesaj gönder → localStorage'a kaydedildi → sayfa yenile → mesajlar geri yüklendi
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 16.3 Koruma testi — kullanıcı izolasyonu
    - **Property 2: Preservation** - Chat History İzolasyonu
    - `customer.id = "user_A"` → key: `chat_history_user_A`
    - `customer.id = "user_B"` → key: `chat_history_user_B`
    - İki key asla çakışmıyor
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 16.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına chat history persistence düzeltmesini ekle


<!-- ============================================================
     C — UZUN VADELİ
     ============================================================ -->

- [x] 17. Circuit breaker — hata koşulu keşif testi

  - **Property 1: Bug Condition** - Yurtiçi SOAP Timeout Checkout'u Blokluyor
  - `src/providers/yurtici/service.ts` içinde SOAP API çağrısı için circuit breaker olmadığını doğrula
  - 5 ardışık SOAP timeout simüle et → checkout akışının bloklandığını belgele
  - **BEKLENEN SONUÇ: BAŞARISIZ** (circuit breaker yok — hata kanıtlandı)
  - _Requirements: 1.15_

- [x] 18. Circuit breaker uygula — Yurtiçi SOAP API

  - [x] 18.1 `opossum` paketini ekle ve circuit breaker konfigürasyonu yap — `src/providers/yurtici/service.ts`
    - `package.json` dosyasına `opossum` ve `@types/opossum` ekle
    - `createFulfillment` içindeki SOAP API çağrısını `CircuitBreaker` ile sar
    - Konfigürasyon: `{ timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 30000 }`
    - Fallback: `{ tracking_number: null, status: "unavailable", message: "Kargo servisi geçici olarak kullanılamıyor" }`
    - Property: `∀ consecutiveFailures >= threshold → circuit IS open AND checkout NOT blocked`
    - _Bug_Condition: `consecutiveFailures >= threshold AND circuit IS NOT open AND checkout IS blocked`_
    - _Expected_Behavior: circuit açıkken graceful fallback döner, checkout devam eder_
    - _Preservation: Circuit kapalıyken normal SOAP akışı değişmemeli (3.10)_
    - _Requirements: 2.15, 3.10_

  - [x] 18.2 Keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - Circuit Breaker Devreye Giriyor
    - 5 ardışık timeout → circuit açılıyor → fallback dönüyor → checkout devam ediyor
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 18.3 Koruma testi — circuit kapalıyken normal akış
    - **Property 2: Preservation** - Normal SOAP Akışı Korunuyor
    - API responsive → circuit kapalı → normal fulfillment sonucu dönüyor
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 18.4 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına circuit breaker implementasyonunu ekle
    - `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` içine Yurtiçi Circuit Breaker bölümü ekle


- [x] 19. RBAC sistemi — hata koşulu keşif testi

  - **Property 1: Bug Condition** - Admin API Rol Kontrolü Yok
  - Admin API'ye düşük yetkili kullanıcı ile istek gönder → erişim verildiğini belgele
  - `src/api/middlewares.ts` içinde rol kontrolü yapan middleware olmadığını doğrula
  - **BEKLENEN SONUÇ: BAŞARISIZ** (RBAC yok — hata kanıtlandı)
  - _Requirements: 1.16_

- [x] 20. RBAC sistemi uygula

  - [x] 20.1 `src/middlewares/rbac.ts` dosyasını oluştur
    - `checkPermission(role: string, resource: string): boolean` fonksiyonu tanımla
    - `SUPER_ADMIN` rolü tüm kaynaklara erişebilir
    - Diğer roller için `permissions` map tanımla: `{ "ADMIN": ["products", "orders"], "VIEWER": ["products"] }`
    - Yetkisiz erişimde `403 Forbidden` döndür
    - _Bug_Condition: `request.user.role IS NOT checked AND access IS granted`_
    - _Expected_Behavior: yetkisiz erişim → 403; SUPER_ADMIN → tüm kaynaklara erişim_
    - _Preservation: Mevcut SUPER_ADMIN kullanıcıları tüm kaynaklara erişmeye devam etmeli (3.11)_
    - _Requirements: 2.16, 3.11_

  - [x] 20.2 `src/api/middlewares.ts` dosyasına RBAC middleware'ini entegre et
    - Admin route'larına `checkPermission` middleware'ini ekle
    - Mevcut authentication middleware'inin ardından çalışacak şekilde sırala

  - [x] 20.3 Keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - RBAC Rol Kontrolü Çalışıyor
    - Düşük yetkili kullanıcı → 403; SUPER_ADMIN → 200
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 20.4 Koruma testi — SUPER_ADMIN erişimi korunuyor
    - **Property 2: Preservation** - SUPER_ADMIN Tüm Kaynaklara Erişiyor
    - SUPER_ADMIN rolüyle tüm admin endpoint'lerine erişim başarılı
    - **BEKLENEN SONUÇ: BAŞARILI**

  - [x] 20.5 Dokümantasyonu güncelle
    - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasına RBAC implementasyonunu ekle
    - `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` içine RBAC bölümü ekle


<!-- ============================================================
     CHECKPOINT
     ============================================================ -->

- [x] 21. Checkpoint — Tüm testler geçiyor
  - Tüm keşif testlerinin (Property 1) artık geçtiğini doğrula (hatalar düzeltildi)
  - Tüm koruma testlerinin (Property 2) hâlâ geçtiğini doğrula (regresyon yok)
  - `docs/GENESIS_PROTOCOL/CHANGELOG_2026-03-15.md` dosyasının tüm değişiklikleri içerdiğini doğrula
  - `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` dosyasının güncel olduğunu doğrula
  - Soru veya belirsizlik varsa kullanıcıya danış
