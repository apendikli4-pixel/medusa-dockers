# Enterprise Hardening Bugfix Design

## Overview

Bu belge, aqua-havuz-genesis projesinde tespit edilen 10 güvenlik/işlevsellik sorununu kritikten az kritike doğru ele alan teknik tasarımı kapsamaktadır.

En kritik sorun, PayTR ve İyzico webhook handler'larında (`getWebhookActionAndData`) HMAC-SHA256 imza doğrulamasının tamamen eksik olmasıdır. Bu açık, geçerli bir `merchant_oid` bilen herhangi bir saldırganın sahte webhook göndererek siparişleri "ödendi" olarak işaretlemesine izin vermektedir. Diğer kritik sorunlar: Cloudinary görsellerinin `remotePatterns` eksikliği nedeniyle yüklenememesi, ChatWidget'ın B2B müşteri kimliğini alamaması ve üretimde hata izleme altyapısının bulunmamasıdır.

Düzeltme stratejisi minimal ve hedeflidir: her sorun için yalnızca ilgili dosya değiştirilecek, mevcut çalışan davranışlar korunacaktır.

---

## Glossary

- **Bug_Condition (C)**: Hatayı tetikleyen koşul — imzasız webhook payload'ı, eksik remotePattern, undefined customer prop, vb.
- **Property (P)**: Hata koşulu sağlandığında beklenen doğru davranış
- **Preservation**: Düzeltme sonrasında değişmemesi gereken mevcut davranışlar
- **getWebhookActionAndData**: `src/providers/paytr/provider.ts` ve `src/providers/iyzico/provider.ts` içindeki webhook payload işleme metodu
- **merchant_oid**: PayTR'ın sipariş tanımlayıcısı; sahte webhook saldırısında kullanılan hedef alan
- **HMAC-SHA256**: Hash-based Message Authentication Code — webhook imza doğrulamasında kullanılan algoritma
- **remotePatterns**: `storefront/next.config.js` içinde `next/image` bileşeninin kabul ettiği harici görsel domain listesi
- **ChatWidget**: `storefront/src/modules/chat/components/chat-widget.tsx` — B2B/B2C müşteri kimliğine göre farklı içerik sunan AI chat bileşeni
- **isBugCondition(input)**: Bir input'un hata koşulunu tetikleyip tetiklemediğini döndüren soyut fonksiyon
- **circuit breaker**: Ardışık hata eşiği aşıldığında dış servis çağrısını kesen koruma mekanizması (opossum)
- **correlation ID**: Dağıtık sistemlerde bir isteğin tüm log satırlarını birbirine bağlayan benzersiz tanımlayıcı

---

## Bug Details

### 1. Webhook İmza Doğrulaması (KRİTİK)

Hata, `getWebhookActionAndData` metoduna gelen her POST isteğinin imza kontrolü yapılmadan `action: "authorized"` döndürmesiyle ortaya çıkar.

**Formal Specification:**
```
FUNCTION isBugCondition_webhook(payload)
  INPUT: payload — HTTP POST body (any)
  OUTPUT: boolean

  RETURN payload.hash IS NULL OR EMPTY
         OR NOT hmacVerified(payload.hash, merchant_key, merchant_salt, payload.merchant_oid, payload.status)
         AND system returns action: "authorized"
END FUNCTION
```

**Örnekler:**
- PayTR: `{ merchant_oid: "paytr_abc123", status: "success", hash: "" }` → sistem `authorized` döner (HATALI)
- PayTR: `{ merchant_oid: "paytr_abc123", status: "success", hash: "SAHTE_HASH" }` → sistem `authorized` döner (HATALI)
- İyzico: `{ paymentId: "iyzi_xyz", status: "SUCCESS" }` (imza alanı yok) → sistem `authorized` döner (HATALI)
- Geçerli imzalı PayTR payload → sistem `authorized` döner (DOĞRU — korunmalı)

### 2. Cloudinary remotePatterns (KRİTİK)

`storefront/next.config.js` içindeki `images.remotePatterns` listesinde `res.cloudinary.com` tanımlı değil.

**Formal Specification:**
```
FUNCTION isBugCondition_cloudinary(imageUrl)
  INPUT: imageUrl — string
  OUTPUT: boolean

  RETURN imageUrl CONTAINS "res.cloudinary.com"
         AND "res.cloudinary.com" NOT IN next.config.remotePatterns
END FUNCTION
```

**Örnekler:**
- `https://res.cloudinary.com/aqua/image/upload/v1/pool.jpg` → Next.js hata fırlatır (HATALI)
- `https://medusa-public-images.s3.eu-west-1.amazonaws.com/pool.jpg` → çalışır (DOĞRU — korunmalı)

### 3. ChatWidget customer prop (KRİTİK)

`storefront/src/app/layout.tsx` içinde `<ChatWidget />` prop'suz çağrılıyor; `customer` ve `customerGroup` her zaman `undefined`.

**Formal Specification:**
```
FUNCTION isBugCondition_chatwidget(renderContext)
  INPUT: renderContext — layout render bağlamı
  OUTPUT: boolean

  RETURN renderContext.customer IS undefined
         AND renderContext.customerGroup IS undefined
         AND ChatWidget receives customer=undefined
END FUNCTION
```

**Örnekler:**
- B2B müşteri giriş yapmış → ChatWidget `customerId: undefined`, `customerGroup: "B2C_Retail"` gönderir (HATALI)
- Anonim kullanıcı → `customerGroup: "B2C_Retail"` fallback çalışır (DOĞRU — korunmalı)

### 4. Sentry Entegrasyonu Yok (KRİTİK)

`@sentry/nextjs` ve `@sentry/node` paketleri kurulu değil; üretim hataları izlenemiyor.

**Formal Specification:**
```
FUNCTION isBugCondition_sentry(error)
  INPUT: error — runtime exception
  OUTPUT: boolean

  RETURN sentrySDK IS NOT initialized
         AND error IS NOT reported to Sentry
END FUNCTION
```

### 5. Health Check Endpoint'leri Eksik (KISA VADELİ)

`/health/ready` ve `/health/live` endpoint'leri mevcut değil; Kubernetes/Docker orchestrator 404 alıyor.

**Formal Specification:**
```
FUNCTION isBugCondition_health(request)
  INPUT: request — HTTP GET /health/ready veya /health/live
  OUTPUT: boolean

  RETURN endpoint NOT EXISTS
         AND response.status = 404
END FUNCTION
```

### 6. Correlation ID Middleware Eksik (KISA VADELİ)

HTTP isteklerinde `x-correlation-id` header'ı oluşturulmuyor; log satırları birbirine bağlanamıyor.

**Formal Specification:**
```
FUNCTION isBugCondition_correlationId(request)
  INPUT: request — HTTP request
  OUTPUT: boolean

  RETURN "x-correlation-id" NOT IN request.headers
         AND "x-correlation-id" NOT IN response.headers
         AND log entries DO NOT contain correlationId
END FUNCTION
```

### 7. JSON-LD Structured Data (KISA VADELİ)

Kod incelemesinde ürün ve blog sayfalarında JSON-LD markup'ının **zaten mevcut olduğu** görüldü (`products/[handle]/page.tsx` ve `blog/[slug]/page.tsx`). Bu sorun büyük ölçüde çözülmüş durumda; eksik alanlar (örn. `brand`, `image` array) tamamlanacak.

### 8. Chat History Persistence Yok (KISA VADELİ)

ChatWidget `messages` state'i yalnızca bellekte tutuluyor; sayfa yenilendiğinde sıfırlanıyor.

**Formal Specification:**
```
FUNCTION isBugCondition_chatHistory(event)
  INPUT: event — page reload
  OUTPUT: boolean

  RETURN messages IN localStorage IS NULL OR EMPTY
         AND ChatWidget.messages = []
         AFTER page reload
END FUNCTION
```

### 9. Circuit Breaker Yok — Yurtiçi (UZUN VADELİ)

`src/providers/yurtici/service.ts` içinde SOAP API çağrısı için circuit breaker mekanizması yok; API timeout'u checkout akışını blokluyor.

**Formal Specification:**
```
FUNCTION isBugCondition_circuitBreaker(apiCall)
  INPUT: apiCall — Yurtiçi SOAP API isteği
  OUTPUT: boolean

  RETURN consecutiveFailures >= threshold
         AND circuit IS NOT open
         AND checkout IS blocked
END FUNCTION
```

### 10. RBAC Sistemi Yok (UZUN VADELİ)

Medusa admin API'lerinde rol bazlı erişim kontrolü yok; tüm admin kullanıcıları tüm kaynaklara erişebiliyor.

**Formal Specification:**
```
FUNCTION isBugCondition_rbac(request)
  INPUT: request — admin API isteği
  OUTPUT: boolean

  RETURN request.user.role IS NOT checked
         AND request.user IS NOT superAdmin
         AND access IS granted
END FUNCTION
```

---

## Expected Behavior

### Preservation Requirements

**Değişmemesi Gereken Davranışlar:**
- Geçerli imzalı PayTR webhook callback'leri başarıyla işlenmeli ve sipariş tamamlanmalı (3.1)
- Geçerli imzalı İyzico webhook callback'leri başarıyla işlenmeli (3.2)
- Mevcut S3 ve localhost kaynaklı görseller optimize edilmeye devam etmeli (3.3)
- Anonim/B2C kullanıcılar için `customerGroup: "B2C_Retail"` fallback çalışmaya devam etmeli (3.4)
- Sentry aktifken normal istek akışında performans degradasyonu olmamalı (3.5)
- Health check eklendikten sonra mevcut API endpoint'leri aynı davranışı sergilemeli (3.6)
- Correlation ID middleware mevcut response header'larını ve API kontratlarını değiştirmemeli (3.7)
- JSON-LD eklendikten sonra sayfa yapısı, stil ve işlevsellik korunmalı (3.8)
- Chat history localStorage'a kaydedilirken farklı kullanıcılar arasında veri izolasyonu sağlanmalı (3.9)
- Circuit breaker açıkken diğer kargo seçenekleri ve checkout akışı normal çalışmalı (3.10)
- RBAC aktifken süper admin kullanıcıları tüm kaynaklara erişmeye devam etmeli (3.11)

**Kapsam:**
Hata koşulunu tetiklemeyen tüm input'lar (geçerli imzalı webhook'lar, S3 görselleri, anonim kullanıcılar, non-number keyboard input'lar) bu düzeltmelerden etkilenmemelidir.

---

## Hypothesized Root Cause

### 1. Webhook İmza Doğrulaması
1. **Eksik implementasyon**: `getWebhookActionAndData` metodu başlangıçta placeholder olarak yazılmış, imza doğrulama kodu hiç eklenmemiş
2. **Payload erişim sorunu**: `payload` parametresinin tipi `ProviderWebhookPayload["payload"]` — raw body'ye erişim için `rawBody` veya `data` alanı kullanılmalı
3. **Credentials erişimi**: `this.options_.merchant_key` ve `this.options_.merchant_salt` metod içinde erişilebilir durumda, kullanılmıyor

### 2. Cloudinary remotePatterns
1. **Gözden kaçırma**: `next.config.js` ilk kurulumda S3 ve localhost için yapılandırılmış, Cloudinary sonradan eklenen bir servis
2. **Tek satır eksiklik**: `{ protocol: "https", hostname: "res.cloudinary.com" }` eklenmesi yeterli

### 3. ChatWidget customer prop
1. **Server/Client boundary**: `layout.tsx` bir Server Component; `getCustomer()` veya benzeri bir server-side session fonksiyonu çağrılmamış
2. **Prop drilling eksikliği**: ChatWidget prop'ları kabul ediyor (`customer?: any, customerGroup?: string`) ama layout'tan geçirilmiyor

### 4. Sentry Entegrasyonu
1. **Paket kurulmamış**: `@sentry/nextjs` ve `@sentry/node` `package.json`'da yok
2. **Konfigürasyon dosyaları yok**: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` oluşturulmamış

### 5. Health Check
1. **Route tanımlı değil**: Medusa backend'de `/health/ready` ve `/health/live` route'ları oluşturulmamış
2. **DB/Redis check yok**: Bağımlılık sağlık kontrolü implementasyonu eksik

### 6. Correlation ID
1. **Middleware yok**: Medusa backend'de `x-correlation-id` header'ı oluşturan/okuyan middleware tanımlı değil
2. **Logger entegrasyonu yok**: Mevcut `this.logger_` çağrıları correlationId içermiyor

### 7. Chat History
1. **localStorage entegrasyonu yok**: `useEffect` ile localStorage okuma/yazma kodu ChatWidget'a eklenmemiş
2. **Session key izolasyonu**: Farklı kullanıcılar için aynı localStorage key kullanılırsa veri sızıntısı riski var

### 8. Circuit Breaker
1. **opossum kurulmamış**: `package.json`'da `opossum` paketi yok
2. **Timeout yönetimi yok**: SOAP API çağrısı için timeout ve retry mekanizması implementasyonu eksik

### 9. RBAC
1. **Medusa permission middleware yok**: Admin route'larında rol kontrolü yapan middleware tanımlı değil
2. **Role schema yok**: Kullanıcı rollerini tanımlayan veri modeli oluşturulmamış

---

## Correctness Properties

Property 1: Bug Condition — Webhook İmza Doğrulaması

_For any_ webhook payload where the bug condition holds (isBugCondition_webhook returns true — payload has missing, empty, or invalid HMAC-SHA256 signature), the fixed `getWebhookActionAndData` function SHALL reject the request with `action: "not_supported"` or throw an error, and SHALL NOT return `action: "authorized"`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Geçerli Webhook İşleme

_For any_ webhook payload where the bug condition does NOT hold (isBugCondition_webhook returns false — payload has a valid, correctly computed HMAC-SHA256 signature), the fixed `getWebhookActionAndData` function SHALL produce the same `action: "authorized"` result as the original function, preserving all valid payment processing behavior.

**Validates: Requirements 3.1, 3.2**

Property 3: Bug Condition — Correlation ID Varlığı

_For any_ HTTP request entering the system where the bug condition holds (isBugCondition_correlationId returns true — no x-correlation-id header present), the fixed middleware SHALL generate a new UUID v4 correlation ID and attach it to all log entries and the response header.

**Validates: Requirements 2.11**

Property 4: Preservation — Correlation ID Geçişi

_For any_ HTTP request where the bug condition does NOT hold (request already contains x-correlation-id header), the fixed middleware SHALL use the existing correlation ID without modification, preserving the distributed tracing chain.

**Validates: Requirements 3.7**

Property 5: Bug Condition — Chat History Kaybolması

_For any_ page reload event where the bug condition holds (isBugCondition_chatHistory returns true — messages exist in session but localStorage is empty), the fixed ChatWidget SHALL load messages from localStorage using the session-scoped key and restore the conversation history.

**Validates: Requirements 2.14**

Property 6: Preservation — Chat History İzolasyonu

_For any_ two different user sessions, the fixed ChatWidget SHALL use distinct localStorage keys (session-scoped), ensuring that one user's chat history is never visible to another user.

**Validates: Requirements 3.9**

Property 7: Bug Condition — Circuit Breaker Devreye Girme

_For any_ sequence of Yurtiçi SOAP API calls where the bug condition holds (consecutiveFailures >= threshold), the fixed circuit breaker SHALL open the circuit and return a graceful fallback response without blocking the checkout flow.

**Validates: Requirements 2.15**

Property 8: Preservation — Circuit Breaker Kapalıyken Normal Akış

_For any_ Yurtiçi SOAP API call where the bug condition does NOT hold (circuit is closed, API is responsive), the fixed code SHALL produce the same fulfillment result as the original code, preserving all existing shipping behavior.

**Validates: Requirements 3.10**

---

## Fix Implementation

### 1. Webhook İmza Doğrulaması

**Dosya:** `src/providers/paytr/provider.ts`
**Fonksiyon:** `getWebhookActionAndData`

**Değişiklikler:**
1. **Hash hesaplama**: `merchant_key + merchant_salt + merchant_oid + status` string'ini HMAC-SHA256 ile imzala, base64 encode et
2. **Karşılaştırma**: Gelen `hash` alanıyla `crypto.timingSafeEqual` kullanarak karşılaştır (timing attack önlemi)
3. **Reddetme**: Eşleşmezse `action: "not_supported"` döndür ve güvenlik logu yaz
4. **Payload erişimi**: `payload.data` veya `payload.rawBody` üzerinden body alanlarına eriş

```
FUNCTION getWebhookActionAndData_fixed(payload)
  body = payload.data
  hash_str = merchant_key + merchant_salt + body.merchant_oid + body.status
  expected_hash = HMAC-SHA256(hash_str, merchant_salt) → base64
  
  IF NOT timingSafeEqual(body.hash, expected_hash) THEN
    logger.warn("PayTR: Invalid webhook signature")
    RETURN { action: "not_supported" }
  END IF
  
  RETURN { action: "authorized", data: { session_id: body.merchant_oid, amount: body.total_amount } }
END FUNCTION
```

**Dosya:** `src/providers/iyzico/provider.ts`
**Fonksiyon:** `getWebhookActionAndData`

**Değişiklikler:**
1. **İyzico imza algoritması**: `secret_key + paymentId + paymentStatus` → SHA1 → base64 (İyzico'nun standart webhook imza formatı)
2. **Karşılaştırma ve reddetme**: Aynı pattern

### 2. Cloudinary remotePatterns

**Dosya:** `storefront/next.config.js`

**Değişiklik:** `images.remotePatterns` dizisine ekle:
```javascript
{
  protocol: "https",
  hostname: "res.cloudinary.com",
}
```

### 3. ChatWidget customer prop

**Dosya:** `storefront/src/app/layout.tsx`

**Değişiklikler:**
1. `async` function yap
2. `getCustomer()` (veya Medusa'nın `retrieveCustomer`) server-side çağır
3. `<ChatWidget customer={customer} customerGroup={customerGroup} />` şeklinde prop geç
4. `customerGroup` müşterinin `groups` alanından türet; yoksa `"B2C_Retail"` fallback

### 4. Sentry Entegrasyonu

**Storefront:**
- `storefront/package.json`: `@sentry/nextjs` ekle
- `storefront/sentry.client.config.ts`: DSN, tracesSampleRate, replaysSessionSampleRate
- `storefront/sentry.server.config.ts`: DSN, tracesSampleRate
- `storefront/sentry.edge.config.ts`: DSN
- `storefront/next.config.js`: `withSentryConfig` wrapper

**Backend:**
- `package.json`: `@sentry/node` ekle
- `src/lib/sentry.ts`: Sentry.init() ile DSN ve tracesSampleRate
- `medusa-config.ts` veya `src/main.ts`: Sentry.init() çağrısı

### 5. Health Check Endpoint'leri

**Dosya:** `src/api/store/health/route.ts` (veya `src/api/health/route.ts`)

**Değişiklikler:**
1. `GET /health/live`: Süreç ayaktaysa `200 { status: "alive" }` döndür
2. `GET /health/ready`: DB ve Redis ping kontrolü yap; tümü başarılıysa `200 { status: "ready" }`, değilse `503`

### 6. Correlation ID Middleware

**Dosya:** `src/api/middlewares.ts` (veya yeni `src/middlewares/correlation-id.ts`)

**Değişiklikler:**
1. Her istekte `req.headers["x-correlation-id"]` oku; yoksa `crypto.randomUUID()` üret
2. `res.setHeader("x-correlation-id", correlationId)` ile response'a ekle
3. Logger context'e `correlationId` enjekte et

### 7. JSON-LD (Tamamlama)

Ürün ve blog sayfalarında JSON-LD zaten mevcut. Eksik alanlar tamamlanacak:
- Ürün: `brand`, `image` (array), `aggregateRating` (varsa)
- Blog: `image`, `publisher` (Organization schema)

### 8. Chat History Persistence

**Dosya:** `storefront/src/modules/chat/components/chat-widget.tsx`

**Değişiklikler:**
1. Session-scoped localStorage key: `chat_history_${customer?.id || "anon"}`
2. `useEffect` ile mount'ta localStorage'dan yükle
3. `messages` state değiştiğinde localStorage'a kaydet
4. Maksimum 50 mesaj sınırı (localStorage boyut kontrolü)

### 9. Circuit Breaker — Yurtiçi

**Dosya:** `src/providers/yurtici/service.ts`

**Değişiklikler:**
1. `opossum` paketi ekle (`package.json`)
2. `createFulfillment` içindeki SOAP API çağrısını `CircuitBreaker` ile sar
3. `options`: `timeout: 5000`, `errorThresholdPercentage: 50`, `resetTimeout: 30000`
4. Fallback: `{ tracking_number: null, status: "unavailable", message: "Kargo servisi geçici olarak kullanılamıyor" }`

### 10. RBAC Sistemi

**Dosya:** `src/api/middlewares.ts` (veya yeni `src/middlewares/rbac.ts`)

**Değişiklikler:**
1. Admin route'larına `checkPermission(role, resource)` middleware ekle
2. `SUPER_ADMIN` rolü tüm kaynaklara erişebilir
3. Diğer roller için `permissions` map tanımla
4. Yetkisiz erişimde `403 Forbidden` döndür

---

## Testing Strategy

### Validation Approach

İki aşamalı yaklaşım: önce düzeltilmemiş kodda hata koşulunu gösteren counterexample'lar üret, ardından düzeltmenin doğruluğunu ve mevcut davranışların korunduğunu doğrula.

### Exploratory Bug Condition Checking

**Hedef**: Düzeltme uygulanmadan önce hataları kanıtla. Kök neden analizini doğrula veya çürüt.

**Test Planı**: Webhook handler'larına imzasız payload gönder ve `action: "authorized"` döndüğünü gözlemle. Bu testler düzeltilmemiş kodda BAŞARISIZ olmalı (yani `authorized` dönmemeli — ama şu an dönüyor, bu hatayı kanıtlar).

**Test Senaryoları:**
1. **PayTR İmzasız Payload**: `{ merchant_oid: "test_123", status: "success", hash: "" }` gönder → `authorized` döner (HATA KANITI)
2. **PayTR Sahte Hash**: `{ merchant_oid: "test_123", status: "success", hash: "INVALID" }` gönder → `authorized` döner (HATA KANITI)
3. **İyzico İmzasız Payload**: `{ paymentId: "iyzi_123", status: "SUCCESS" }` gönder → `authorized` döner (HATA KANITI)
4. **Cloudinary URL**: `next/image` ile `res.cloudinary.com` URL'si kullan → hata fırlatır (HATA KANITI)
5. **ChatWidget prop**: `layout.tsx`'den render et → `customer` undefined (HATA KANITI)

**Beklenen Counterexample'lar:**
- `getWebhookActionAndData` imzasız payload için `{ action: "authorized" }` döndürüyor
- Kök neden: imza doğrulama kodu hiç yazılmamış

### Fix Checking

**Hedef**: Hata koşulunu tetikleyen tüm input'lar için düzeltilmiş fonksiyonun beklenen davranışı ürettiğini doğrula.

**Pseudocode:**
```
FOR ALL payload WHERE isBugCondition_webhook(payload) DO
  result := getWebhookActionAndData_fixed(payload)
  ASSERT result.action != "authorized"
  ASSERT result.action = "not_supported" OR error thrown
END FOR
```

### Preservation Checking

**Hedef**: Hata koşulunu tetiklemeyen input'lar için düzeltilmiş fonksiyonun orijinal fonksiyonla aynı sonucu ürettiğini doğrula.

**Pseudocode:**
```
FOR ALL payload WHERE NOT isBugCondition_webhook(payload) DO
  ASSERT getWebhookActionAndData_original(payload) = getWebhookActionAndData_fixed(payload)
END FOR
```

**Test Yaklaşımı**: Property-based testing önerilir çünkü:
- Geçerli imza formatlarının geniş uzayını otomatik olarak kapsar
- Manuel testlerin kaçırabileceği edge case'leri yakalar
- Tüm geçerli payload'lar için davranışın değişmediğini güçlü biçimde garanti eder

**Test Senaryoları:**
1. **Geçerli PayTR İmzası Koruması**: Doğru HMAC ile imzalanmış payload → `authorized` dönmeye devam etmeli
2. **Geçerli İyzico İmzası Koruması**: Doğru imzalı payload → `authorized` dönmeye devam etmeli
3. **S3 Görsel Koruması**: Mevcut S3 URL'leri `remotePatterns` eklendikten sonra çalışmaya devam etmeli
4. **B2C Fallback Koruması**: Anonim kullanıcı → `customerGroup: "B2C_Retail"` fallback korunmalı

### Unit Tests

- PayTR HMAC-SHA256 hesaplama doğruluğu (bilinen input/output çifti ile)
- İyzico imza doğrulama algoritması
- Cloudinary hostname'inin `remotePatterns`'e eklendiğini doğrulama
- ChatWidget localStorage okuma/yazma (localStorage mock ile)
- Health check endpoint'lerinin DB/Redis bağlantısı başarısızken `503` döndürmesi
- Correlation ID middleware'inin header yokken UUID üretmesi, varken mevcut ID'yi kullanması
- Circuit breaker'ın eşik aşıldığında açılması

### Property-Based Tests

- **Webhook imza**: Rastgele `merchant_oid` ve `status` değerleri için HMAC hesaplama deterministik olmalı (aynı input → aynı hash)
- **Webhook reddetme**: Rastgele geçersiz hash string'leri için `getWebhookActionAndData_fixed` asla `authorized` döndürmemeli
- **Correlation ID**: Rastgele HTTP istekleri için her yanıtta `x-correlation-id` header'ı mevcut olmalı
- **Chat history izolasyonu**: Rastgele `customerId` çiftleri için localStorage key'leri asla çakışmamalı
- **Circuit breaker**: N ardışık hata sonrası (N >= threshold) circuit her zaman açık olmalı

### Integration Tests

- PayTR webhook tam akışı: imzalı POST → sipariş tamamlanıyor
- İyzico webhook tam akışı: imzalı POST → sipariş tamamlanıyor
- Cloudinary görsel tam akışı: storefront'ta Cloudinary URL'li ürün sayfası yükleniyor
- B2B müşteri ChatWidget akışı: giriş yapmış B2B kullanıcı → doğru `customerId` ve `customerGroup` backend'e gidiyor
- Sentry hata yakalama: üretim ortamında unhandled exception → Sentry'de görünüyor
- Health check Kubernetes probe simülasyonu: DB down → `/health/ready` 503 döndürüyor
- Yurtiçi circuit breaker: 5 ardışık SOAP timeout → checkout bloklanmıyor, fallback mesajı gösteriliyor
