# 🔒 ARCHITECTURE SEAL - Mühürlü Alanlar ve Test Durumları

> **"Test edilmemiş kod, çalışmayan koddur. Mühürlenmemiş modül, güvenilmez modüldür."**

Bu belge, PROJECT-AYNA-GENESIS mimarisinde test edilmiş, doğrulanmış ve mühürlenmiş tüm modülleri, dosyaları ve sistem bileşenlerini listeler.

---

## 📋 Okuma Rehberi

### Durum Anlamları
| Durum | Açıklama |
|-------|----------|
| **STABLE** | Test edildi, production'da çalışıyor, değişikliklerden önce dikkatli olun |
| **BETA** | Test ediliyor, breaking changes olabilir |
| **EXPERIMENTAL** | Deneysel, production'da kullanılmamalı |
| **DEPRECATED** | Kullanımdan kaldırıldı, yakında silinecek |

### Uyarı Seviyeleri
| Seviye | Açıklama |
|--------|----------|
| **CRITICAL** | Değişiklik sistem bütünlüğünü tehlikeye atar, kesinlikle dokunulmamalı |
| **HIGH** | Değişiklik dikkatli test gerektirir, rollback planı zorunlu |
| **MEDIUM** | Değişiklik mümkün, entegrasyon testleri gerekli |
| **LOW** | Güvenli değişiklik alanı |

---

## 🏗️ Mühürlü Modüller

### 1. Ayna AI Module (`src/modules/ayna/`)

| Dosya | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `service.ts` | STABLE | 2026-02-08 | Core Team | HIGH | Çekirdek AI servisi, değişikliklerde Gemini API test edilmeli |
| `models/memory.ts` | STABLE | 2026-02-08 | Core Team | CRITICAL | 3 katmanlı hafıza sistemi, şema değişiklikleri migration gerektirir |
| `services/tool-service.ts` | STABLE | 2026-02-15 | Core Team | HIGH | AI tool orchestration, yeni tool eklemelerinde izin kontrolü yapılmalı |
| `services/hybrid-ai.provider.ts` | STABLE | 2026-02-20 | Core Team | HIGH | Gemini + Ollama fallback, API değişikliklerinde test edilmeli |
| `services/injection-detector.service.ts` | STABLE | 2026-02-20 | Core Team | CRITICAL | Güvenlik bileşeni, değişikliklerde security audit gerekli |

**Modül Genel Notları:**
- Ayna modülü, projenin AI çekirdeğidir
- Memory sistemi immutable event log (MemoryTruth) içerir, asla doğrudan silme yapılmaz
- Fallback AI (Ollama) .env'de tanımlı olmalıdır
- Tüm AI endpoint'leri rate limiting ile korunmalıdır

---

### 2. Tenant Module (`src/modules/tenant/`)

| Dosya | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `service.ts` | STABLE | 2026-05-13 | Core Team | HIGH | Multi-tenant yönetim servisi |
| `models/tenant.ts` | STABLE | 2026-05-13 | Core Team | CRITICAL | Tenant şeması, değişiklikler migration gerektirir |
| `loaders/tenant-isolation-filter.ts` | STABLE | 2026-05-13 | Core Team | CRITICAL | Row Level Security (RLS) global filter, devre dışı bırakılmamalı |
| `loaders/tenant-rls-subscriber.ts` | STABLE | 2026-05-13 | Core Team | CRITICAL | RLS subscriber, veri izolasyonu için kritik |
| `migrations/Migration20260501180000.ts` | STABLE | 2026-05-13 | Core Team | CRITICAL | İlk tenant migration'ı, değiştirilmemeli |
| `migrations/Migration20260513000000.ts` | STABLE | 2026-05-13 | Core Team | CRITICAL | Tenant entity migration'ı |
| `migrations/Migration20260513120000.ts` | STABLE | 2026-05-13 | Core Team | CRITICAL | Tenant RLS migration'ı |

**Modül Genel Notları:**
- Tenant modülü, multi-store/multi-tenant mimarisinin temelidir
- RLS (Row Level Security) ASLA devre dışı bırakılmamalıdır
- Worker bypass (`__system__`) sadece sistem işlemleri için kullanılmalıdır
- Her tenant'ın kendi verisi tamamen izole edilmelidir

---

### 3. Conscience Module (`src/modules/conscience/`)

| Dosya | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `service.ts` | STABLE | 2026-02-10 | Core Team | HIGH | Vicdan/etik filtre servisi |
| `models/conscience.ts` | STABLE | 2026-02-10 | Core Team | HIGH | Etik karar kayıt şeması |

**Modül Genel Notları:**
- AI kararlarının etik denetimini sağlar
- Prompt injection detection özelliği vardır
- Bütçe kontrolü ve harcama limitleri içerir

---

### 4. Content Engine Module (`src/modules/content_engine/`)

| Dosya | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `service.ts` | STABLE | 2026-02-12 | Core Team | MEDIUM | Blog/CMS içerik yönetimi |
| `models/content.ts` | STABLE | 2026-02-12 | Core Team | MEDIUM | İçerik şeması |

**Modül Genel Notları:**
- AI destekli içerik üretimi yapar
- Blog yazıları ve statik sayfalar için kullanılır
- Workflow SDK ile entegre çalışır

---

### 5. Wishlist Module (`src/modules/wishlist/`)

| Dosya | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `service.ts` | STABLE | 2026-02-18 | Core Team | MEDIUM | Müşteri istek listesi |
| `models/wishlist.ts` | STABLE | 2026-02-18 | Core Team | MEDIUM | Wishlist şeması |

**Modül Genel Notları:**
- Müşteriler ürünleri favorilere ekleyebilir
- Stok bildirimleri (restock notifications) destekler
- Customer entity ile link'lenmiştir

---

### 6. Subscription Module (`src/modules/subscription/`)

| Dosya | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `service.ts` | BETA | 2026-03-01 | Core Team | HIGH | Abonelik yönetimi |
| `models/subscription.ts` | BETA | 2026-03-01 | Core Team | HIGH | Abonelik şeması |

**Modül Genel Notları:**
- Tekrarlayan ödemeler ve abonelik yönetimi
- Hala geliştirme aşamasında, breaking changes olabilir

---

### 7. Loyalty Module (`src/modules/loyalty/`)

| Dosya | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `service.ts` | BETA | 2026-03-05 | Core Team | MEDIUM | Sadakat programı |
| `models/loyalty.ts` | BETA | 2026-03-05 | Core Team | MEDIUM | Loyalty puan şeması |

**Modül Genel Notları:**
- Müşteri sadakat puanları ve ödüller
- Geliştirme aşamasında

---

## 🔌 Mühürlü Provider'lar

### Payment Providers

| Provider | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|----------|-------|-------------|-----------|----------------|--------|
| `src/providers/manual/` | STABLE | 2026-02-05 | Core Team | MEDIUM | Manuel ödeme (nakit/havale) |
| `src/providers/paytr/` | STABLE | 2026-02-25 | Core Team | HIGH | PayTR entegrasyonu, API anahtarları gerekli |
| `src/providers/iyzico/` | STABLE | 2026-02-28 | Core Team | HIGH | Iyzico entegrasyonu, `iyzipay` package gerekli |

**Provider Genel Notları:**
- Ödeme provider'ları gerçek müşteri IP'sini kullanmalıdır (`src/utils/get-client-ip.ts`)
- Production'da güçlü API anahtarları kullanılmalıdır
- Mock mode (`USE_MOCK_PROVIDERS=true`) test ortamı için kullanılabilir

---

### Notification Providers

| Provider | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|----------|-------|-------------|-----------|----------------|--------|
| `src/providers/brevo/` | STABLE | 2026-02-22 | Core Team | MEDIUM | Brevo email servisi |
| `@medusajs/notification-local` | STABLE | 2026-02-05 | Core Team | LOW | Lokal notification (test) |

---

### Fulfillment Providers

| Provider | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|----------|-------|-------------|-----------|----------------|--------|
| `@medusajs/fulfillment-manual` | STABLE | 2026-02-05 | Core Team | LOW | Manuel fulfillment |
| `src/providers/yurtici/` | BETA | 2026-03-10 | Core Team | HIGH | Yurtiçi Kargo entegrasyonu, mock mode'da |

---

### File Storage Providers

| Provider | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|----------|-------|-------------|-----------|----------------|--------|
| `src/providers/cloudinary/` | STABLE | 2026-02-15 | Core Team | MEDIUM | Cloudinary dosya depolama |

---

## 🛣️ Mühürlü Workflows

| Workflow | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|----------|-------|-------------|-----------|----------------|--------|
| `src/workflows/generate-content.ts` | STABLE | 2026-02-12 | Core Team | MEDIUM | AI içerik üretimi ve kaydetme |
| `src/workflows/create-tenant.ts` | STABLE | 2026-05-13 | Core Team | HIGH | Tenant oluşturma workflow'u |
| `src/workflows/link-entity-to-tenant.ts` | STABLE | 2026-05-13 | Core Team | HIGH | Entity-tenant linking |

**Workflow Genel Notları:**
- Tüm workflow'lar Saga pattern ile implement edilmiştir
- Her step'in compensation function'ı vardır
- Hata durumunda otomatik rollback yapılır

---

## 🔗 Mühürlü Link Definitions

| Link | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|------|-------|-------------|-----------|----------------|--------|
| `src/links/tenant-customer.ts` | STABLE | 2026-05-13 | Core Team | HIGH | Tenant-Customer link |
| `src/links/tenant-order.ts` | STABLE | 2026-05-13 | Core Team | HIGH | Tenant-Order link |
| `src/links/tenant-product.ts` | STABLE | 2026-05-13 | Core Team | HIGH | Tenant-Product link |
| `src/links/tenant-api-key.ts` | STABLE | 2026-05-13 | Core Team | HIGH | Tenant-API Key link |
| `src/links/tenant-stock-location.ts` | STABLE | 2026-05-13 | Core Team | HIGH | Tenant-Stock Location link |
| `src/links/tenant-sales-channel.ts` | STABLE | 2026-05-13 | Core Team | HIGH | Tenant-Sales Channel link |

**Link Genel Notları:**
- Cross-module entity linkleri `defineLink` ile tanımlanır
- Link tanımlarında explicit object configuration kullanılmalıdır
- Doğrudan modül import'u cyclic dependency hatalarına neden olur

---

## 🌐 Mühürlü API Routes

### Store Routes

| Route | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `POST /store/ayna/chat` | STABLE | 2026-02-08 | Core Team | HIGH | AI chat endpoint, rate limiting gerekli |
| `GET /store/wishlist` | STABLE | 2026-02-18 | Core Team | MEDIUM | Wishlist listesi, customer auth gerekli |
| `POST /store/wishlist` | STABLE | 2026-02-18 | Core Team | MEDIUM | Wishlist'e ekleme |
| `DELETE /store/wishlist/:itemId` | STABLE | 2026-02-18 | Core Team | MEDIUM | Wishlist'den çıkarma |

### Admin Routes

| Route | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `POST /admin/ayna/chat` | STABLE | 2026-02-08 | Core Team | HIGH | Admin AI chat, tüm tool'lar açık |
| `POST /admin/setup` | STABLE | 2026-03-24 | Core Team | CRITICAL | Sistem kurulum endpoint'i (POST'a çevrildi) |
| `GET /admin/tenants` | STABLE | 2026-05-13 | Core Team | HIGH | Tenant listesi |
| `POST /admin/tenants` | STABLE | 2026-05-13 | Core Team | HIGH | Yeni tenant oluşturma |

**API Genel Notları:**
- Tüm custom route'lar Zod validation kullanmalıdır
- `/admin/*` route'ları JWT authentication gerektirir
- `/store/*` route'ları optional customer auth destekler
- Rate limiting AI endpoint'lerinde zorunludur

---

## 📁 Mühürlü Konfigürasyon Dosyaları

| Dosya | Durum | Test Tarihi | Test Eden | Uyarı Seviyesi | Notlar |
|-------|-------|-------------|-----------|----------------|--------|
| `medusa-config.ts` | STABLE | 2026-05-13 | Core Team | CRITICAL | Ana Medusa konfigürasyonu |
| `docker-compose.yml` | STABLE | 2026-05-13 | Core Team | CRITICAL | Docker orchestration |
| `Dockerfile` | STABLE | 2026-05-13 | Core Team | HIGH | Backend container tanımı |
| `storefront/Dockerfile` | STABLE | 2026-05-13 | Core Team | HIGH | Frontend container tanımı |

---

## ⚠️ Mühürlü Dosyalara Müdahale Kuralları

### Değişiklik Yapmadan Önce

1. **Bu dosyayı okuyun** - Mühür bilgilerini ve uyarıları kontrol edin
2. **Rollback planı oluşturun** - Değişiklik geri alınabilir olmalı
3. **Test ortamında deneyin** - Production'da doğrudan değişiklik yapmayın
4. **Entegrasyon testleri yapın** - Diğer modüllerle çakışma olmadığını doğrulayın
5. **Onay alın** - Core team'den değişiklik onayı alın

### Değişiklik Sonrası

1. **Testleri çalıştırın** - `npm test` ve manuel testler
2. **Build doğrulaması** - `tsc --noEmit` hatasız tamamlanmalı
3. **Runtime testi** - Sunucuyu başlatın ve özelliği test edin
4. **Yeni mühür tarihi ekleyin** - Bu dosyayı güncelleyin

---

## 📝 Mühür Güncelleme Şablonu

Yeni bir modül/dosya mühürleneceğinde aşağıdaki bilgileri ekleyin:

```markdown
| [Dosya/Modül Adı] | [Durum] | [Test Tarihi] | [Test Eden] | [Uyarı Seviyesi] | [Notlar] |
```

---

## 🔄 Son Güncelleme

- **Tarih:** 2026-05-14
- **Güncelleyen:** Core Team
- **Değişiklikler:** 
  - Multi-Tenant modülü eklendi ve mühürlendi
  - n8n Bridge servisi eklendi
  - Tenant izolasyon middleware'leri eklendi
  - Tüm yeni dosyalar için mühür bilgileri güncellendi

---

## 📚 Referanslar

- [00_SUPREME_LAW.md](./00_SUPREME_LAW.md) - Madde 7: Test ve Mühürleme Protokolü
- [01_PROJECT_BIBLE.md](./01_PROJECT_BIBLE.md) - Teknik kurallar
- [10_MASTER_ARCHITECT_MANUAL.md](./10_MASTER_ARCHITECT_MANUAL.md) - Genel mimari rehber