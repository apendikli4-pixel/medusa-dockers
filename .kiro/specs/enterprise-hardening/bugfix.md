# Bugfix Requirements Document

## Introduction

Bu belge, aqua-havuz-genesis projesinde tespit edilen kritik güvenlik açıklarını, işlevsel eksiklikleri ve uzun vadeli iyileştirme gereksinimlerini kapsamaktadır. Sorunlar kritikten az kritike doğru sıralanmış olup her biri üretim ortamında farklı düzeylerde risk oluşturmaktadır.

En kritik sorun, PayTR ve İyzico webhook callback'lerinde imza doğrulamasının bulunmamasıdır; bu durum sahte ödeme bildirimi saldırılarına kapı aralamaktadır. Diğer kritik sorunlar arasında Cloudinary görsel optimizasyonunun çalışmaması, ChatWidget'ın B2B müşteri kimliğini alamaması ve üretimde hata takibinin yapılamaması yer almaktadır.

---

## Bug Analysis

### Current Behavior (Defect)

**KRİTİK — Webhook İmza Doğrulaması Eksik**

1.1 WHEN PayTR `/webhook` endpoint'ine bir POST isteği geldiğinde THEN sistem `getWebhookActionAndData` içinde `hash` veya `paytr_token` alanını doğrulamadan `action: "authorized"` döner

1.2 WHEN İyzico `/webhook` endpoint'ine bir POST isteği geldiğinde THEN sistem `getWebhookActionAndData` içinde `iyziReferenceCode` veya HMAC imzasını doğrulamadan `action: "authorized"` döner

1.3 WHEN herhangi bir saldırgan geçerli bir `merchant_oid` ile sahte bir webhook POST isteği gönderdiğinde THEN sistem ödemeyi onaylanmış olarak işaretler ve siparişi tamamlar

**KRİTİK — Cloudinary Görselleri Optimize Edilemiyor**

1.4 WHEN `next/image` bileşeni `res.cloudinary.com` veya `*.cloudinary.com` kaynaklı bir görsel URL'si aldığında THEN Next.js `remotePatterns` listesinde bu domain bulunmadığı için görsel yüklenemez ve hata fırlatır

**KRİTİK — ChatWidget B2B Kimliği Alamıyor**

1.5 WHEN `storefront/src/app/layout.tsx` render edildiğinde THEN `<ChatWidget />` bileşeni `customer` ve `customerGroup` prop'ları olmadan çağrılır

1.6 WHEN ChatWidget `customer` prop'u `undefined` olarak aldığında THEN backend'e gönderilen istekte `customerId: undefined` ve `customerGroup: "B2C_Retail"` (hardcoded fallback) gider; B2B müşteriler için özel fiyatlandırma ve içerik çalışmaz

**KRİTİK — Sentry Entegrasyonu Yok**

1.7 WHEN üretim ortamında bir JavaScript hatası veya unhandled exception oluştuğunda THEN hata hiçbir izleme sistemine iletilmez; ekip hatadan haberdar olamaz

1.8 WHEN Medusa backend'de bir servis hatası oluştuğunda THEN hata yalnızca konsol loglarına düşer, merkezi bir hata takip platformuna gönderilmez

**KISA VADELİ — Health Check Endpoint'leri Eksik**

1.9 WHEN Kubernetes veya Docker orchestrator `/health/ready` endpoint'ini sorguladığında THEN 404 döner; pod hazır olmadan trafik alabilir

1.10 WHEN load balancer `/health/live` endpoint'ini sorguladığında THEN 404 döner; ölü pod'lar trafikten çıkarılamaz

**KISA VADELİ — Correlation ID / Structured Logging Eksik**

1.11 WHEN birden fazla servis arasında geçen bir istek hata ürettiğinde THEN log kayıtlarında ortak bir `correlationId` olmadığı için isteğin tüm yaşam döngüsü takip edilemez

**KISA VADELİ — JSON-LD Structured Data Yok**

1.12 WHEN arama motorları ürün sayfalarını taradığında THEN `<script type="application/ld+json">` içinde `schema.org/Product` markup'ı bulunmadığı için rich snippet'lar gösterilmez

1.13 WHEN arama motorları blog sayfalarını taradığında THEN `schema.org/Article` markup'ı bulunmadığı için içerik zengin sonuçlarda yer alamaz

**KISA VADELİ — Chat History Persistence Yok**

1.14 WHEN kullanıcı ChatWidget açıkken sayfayı yenilediğinde THEN `messages` state'i sıfırlanır ve tüm konuşma geçmişi kaybolur

**UZUN VADELİ — Circuit Breaker Yok**

1.15 WHEN Yurtiçi Kargo SOAP API'si yanıt vermediğinde THEN checkout akışı timeout süresince bloklanır; kullanıcı sipariş tamamlayamaz

**UZUN VADELİ — RBAC Sistemi Yok**

1.16 WHEN herhangi bir admin kullanıcısı Medusa admin API'lerine istek gönderdiğinde THEN rol bazlı erişim kontrolü olmadığı için tüm admin kullanıcıları tüm kaynaklara erişebilir

---

### Expected Behavior (Correct)

**KRİTİK — Webhook İmza Doğrulaması**

2.1 WHEN PayTR webhook callback'i geldiğinde THEN sistem `merchant_key + merchant_salt` kullanarak HMAC-SHA256 hash'i hesaplamalı ve gelen `hash` alanıyla karşılaştırmalı; eşleşmezse `400 Bad Request` dönerek işlemi reddetmeli

2.2 WHEN İyzico webhook callback'i geldiğinde THEN sistem `secret_key` kullanarak HMAC-SHA256 imzasını doğrulamalı; geçersiz imzalı istekler `401 Unauthorized` ile reddedilmeli

2.3 WHEN imza doğrulaması başarısız olduğunda THEN sistem güvenlik loguna uyarı yazmalı ve ödeme durumunu değiştirmemeli

**KRİTİK — Cloudinary Görselleri**

2.4 WHEN `next/image` bileşeni Cloudinary kaynaklı bir URL aldığında THEN `next.config.js` içindeki `remotePatterns` listesinde `res.cloudinary.com` hostname'i tanımlı olduğu için görsel başarıyla optimize edilmeli ve sunulmalı

**KRİTİK — ChatWidget B2B Kimliği**

2.5 WHEN `layout.tsx` render edildiğinde THEN aktif müşteri session'ı sunucu tarafında alınmalı ve `<ChatWidget customer={customer} customerGroup={customerGroup} />` şeklinde prop olarak geçilmeli

2.6 WHEN B2B müşteri ChatWidget'ı kullandığında THEN backend'e gönderilen istekte doğru `customerId` ve `customerGroup` değerleri iletilmeli; B2B fiyatlandırma ve içerik doğru çalışmalı

**KRİTİK — Sentry Entegrasyonu**

2.7 WHEN üretim ortamında bir hata oluştuğunda THEN Sentry SDK hatayı yakalamalı, stack trace ve bağlam bilgisiyle birlikte Sentry projesine iletmeli

2.8 WHEN Medusa backend'de bir servis hatası oluştuğunda THEN `@sentry/node` entegrasyonu hatayı otomatik olarak raporlamalı

**KISA VADELİ — Health Check Endpoint'leri**

2.9 WHEN `/health/ready` endpoint'i sorgulandığında THEN sistem veritabanı ve Redis bağlantılarını kontrol etmeli; tüm bağımlılıklar hazırsa `200 OK` ve `{"status": "ready"}` döndürmeli

2.10 WHEN `/health/live` endpoint'i sorgulandığında THEN süreç ayaktaysa `200 OK` ve `{"status": "alive"}` döndürmeli

**KISA VADELİ — Correlation ID / Structured Logging**

2.11 WHEN bir HTTP isteği sisteme girdiğinde THEN middleware `x-correlation-id` header'ı oluşturmalı veya mevcut olanı almalı; tüm log satırlarına bu ID eklenmeli

**KISA VADELİ — JSON-LD Structured Data**

2.12 WHEN ürün sayfası render edildiğinde THEN `<script type="application/ld+json">` içinde geçerli `schema.org/Product` markup'ı bulunmalı

2.13 WHEN blog sayfası render edildiğinde THEN `<script type="application/ld+json">` içinde geçerli `schema.org/Article` markup'ı bulunmalı

**KISA VADELİ — Chat History Persistence**

2.14 WHEN kullanıcı sayfayı yenilediğinde THEN konuşma geçmişi `localStorage`'dan yüklenmeli ve ChatWidget önceki mesajları göstermeli

**UZUN VADELİ — Circuit Breaker**

2.15 WHEN Yurtiçi Kargo SOAP API'si art arda başarısız olduğunda THEN circuit breaker devreye girmeli; checkout akışı bloklanmadan kargo seçeneği "geçici olarak kullanılamıyor" olarak işaretlenmeli

**UZUN VADELİ — RBAC Sistemi**

2.16 WHEN admin kullanıcısı bir API endpoint'ine istek gönderdiğinde THEN kullanıcının rolü kontrol edilmeli; yetkisiz erişim `403 Forbidden` ile reddedilmeli

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN geçerli imzalı bir PayTR webhook callback'i geldiğinde THEN sistem SHALL CONTINUE TO ödemeyi başarıyla işlemeli ve siparişi tamamlamalı

3.2 WHEN geçerli imzalı bir İyzico webhook callback'i geldiğinde THEN sistem SHALL CONTINUE TO ödemeyi başarıyla işlemeli ve siparişi tamamlamalı

3.3 WHEN `next/image` bileşeni mevcut S3 veya localhost kaynaklı görsel URL'leri aldığında THEN sistem SHALL CONTINUE TO bu görselleri optimize ederek sunmalı (mevcut `remotePatterns` bozulmamalı)

3.4 WHEN B2C (anonim veya giriş yapmamış) kullanıcı ChatWidget'ı kullandığında THEN sistem SHALL CONTINUE TO `customerGroup: "B2C_Retail"` fallback değeriyle çalışmalı

3.5 WHEN Sentry entegrasyonu aktif olduğunda THEN sistem SHALL CONTINUE TO normal istek akışında herhangi bir performans degradasyonu yaşamamalı

3.6 WHEN health check endpoint'leri eklendikten sonra mevcut API endpoint'leri sorgulandığında THEN sistem SHALL CONTINUE TO aynı response formatı ve davranışı sergilemelidir

3.7 WHEN correlation ID middleware aktif olduğunda THEN sistem SHALL CONTINUE TO mevcut response header'larını ve API kontratlarını değiştirmemeli

3.8 WHEN JSON-LD markup eklendikten sonra ürün sayfaları render edildiğinde THEN sistem SHALL CONTINUE TO mevcut sayfa yapısını, stil ve işlevselliği koruyarak çalışmalı

3.9 WHEN chat history localStorage'a kaydedildiğinde THEN sistem SHALL CONTINUE TO farklı kullanıcılar arasında veri izolasyonunu sağlamalı (oturum bazlı key kullanımı)

3.10 WHEN circuit breaker açık konumdayken THEN sistem SHALL CONTINUE TO diğer kargo seçeneklerini ve checkout akışının geri kalanını normal şekilde sunmalı

3.11 WHEN RBAC sistemi aktif olduğunda THEN sistem SHALL CONTINUE TO mevcut süper admin kullanıcılarının tüm kaynaklara erişimini sağlamalı
