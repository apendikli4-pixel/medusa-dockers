# CHANGELOG: MULTI-TENANCY & N8N INTEGRATION (2026-05-14)
> **Author:** Antigravity / Mirror Core  
> **Topic:** Multi-Tenant SaaS Architecture, n8n AI Orchestration, Enhanced Security  
> **Kapsam:** Backend (`src/`) + Infrastructure configuration

Bu güncelleme, projeye eklenen çoklu mağaza (multi-tenant) mimarisi, n8n AI orchestration entegrasyonu ve güvenlik iyileştirmelerini içerir.

---

## 🔴 A — YENİ ÖZELLİKLER (MAJOR FEATURES)

### 1. Multi-Tenant SaaS Mimarisi (Y-1)

**Tanım:** Platform artık birden fazla bağımsız mağazayı (tenant) destekliyor. Her tenant'ın kendi ürünleri, müşterileri, siparişleri ve ayarları tamamen izole.

**Yeni Modül:** `src/modules/tenant/`

| Dosya | Amaç |
|-------|------|
| `models/tenant.ts` | Tenant entity tanımı (DML) |
| `service.ts` | Tenant CRUD operasyonları |
| `migrations/` | 3 migration dosyası (tenant tablosu, RLS, entity links) |
| `loaders/tenant-isolation-filter.ts` | MikroORM global filter (Row Level Security) |
| `loaders/tenant-rls-subscriber.ts` | Event subscriber for RLS enforcement |

**Tenant Model Alanları:**
- `id` (UUID, primary key)
- `name` (Mağaza adı)
- `slug` (Benzersiz URL slug'ı)
- `sector` (Sektör: retail, horeca, b2b, fashion)
- `settings` (JSON - tema, para birimi, vergi oranı vb.)
- `features` (JSON array - aktif özellikler)
- `is_active` (Mağaza aktif/pasif durumu)
- `owner_id` (Mağaza sahibi kullanıcı ID)
- `domain` (Opsiyonel özel alan adı)
- `metadata` (Ek veriler)

**Tenant API Endpoints:**
```
GET    /admin/tenants           - Tenant listesi
POST   /admin/tenants           - Yeni tenant oluştur
GET    /admin/tenants/:id       - Tek tenant detayı
POST   /admin/tenants/:id/activate   - Tenant aktif et
POST   /admin/tenants/:id/deactivate - Tenant pasif et
GET    /admin/tenants/:id/products     - Tenant ürünleri
GET    /admin/tenants/:id/orders       - Tenant siparişleri
GET    /admin/tenants/:id/customers    - Tenant müşterileri
GET    /admin/tenants/:id/stats        - Tenant istatistikleri
```

**Store (Public) Endpoints:**
```
GET /store/tenant/products - Tenant'a özel ürün listesi
GET /store/tenant          - Tenant bilgisi (slug/domain bazlı)
```

---

### 2. Tenant İzolasyon Katmanları (4 Aşamalı Güvenlik)

**Sorun:** Multi-tenant sistemlerde veri sızıntısı riski.

**Çözüm:** 4 katmanlı izolasyon mimarisi:

#### Katman 1: Tenant Context Middleware (FAIL-CLOSED)
```typescript
// src/api/middlewares/tenant-context.ts
// Tenant çözümlenemezse → 400 Bad Request
// Tenant pasif ise → 403 Forbidden
```

#### Katman 2: AsyncLocalStorage (ALS) Propagation
```typescript
// src/api/middlewares/tenant-als.ts
// Tenant ID'yi tüm async zincire yayar
// MikroORM EventSubscriber ALS'den okur
```

#### Katman 3: Database Guard (Awilix Scope)
```typescript
// src/api/middlewares/tenant-db-guard.ts
// currentTenantId'yi Awilix scope'a kaydeder
// Geriye uyumluluk için korunuyor
```

#### Katman 4: Row Level Security (RLS)
```typescript
// src/modules/tenant/loaders/tenant-isolation-filter.ts
// MikroORM global filter ile otomatik WHERE tenant_id = ?
// Worker bypass (__system__) sadece sistem işlemleri için
```

**Middleware Sıralaması (`src/api/middlewares.ts`):**
```typescript
// Store routes
{
    matcher: "/store/*",
    middlewares: [
        tenantContextMiddleware,    // 1. Tenant tespit (fail-closed)
        tenantAlsMiddleware,        // 2. ALS propagation
        tenantDbGuardMiddleware,    // 3. DB guard
        storefrontTenantScoper,     // 4. Sales Channel/API Key injection
    ],
},
// Admin routes
{
    matcher: "/admin/*",
    middlewares: [
        tenantContextMiddleware,
        tenantAlsMiddleware,
        tenantDbGuardMiddleware,
    ],
}
```

---

### 3. Tenant Entity Linkleri

**Yeni Link Tanımları:** `src/links/`

| Link | Amaç |
|------|------|
| `tenant-customer.ts` | Tenant ↔ Customer ilişkisi |
| `tenant-order.ts` | Tenant ↔ Order ilişkisi |
| `tenant-product.ts` | Tenant ↔ Product ilişkisi |
| `tenant-api-key.ts` | Tenant ↔ API Key ilişkisi |
| `tenant-stock-location.ts` | Tenant ↔ Stock Location ilişkisi |
| `tenant-sales-channel.ts` | Tenant ↔ Sales Channel ilişkisi |

**Önemli Not:** Link tanımlarında **explicit object configuration** kullanıldı. Doğrudan modül import'u cyclic dependency hatalarına neden oluyor.

```typescript
// DOĞRU ✅
defineLink(TenantModule.linkable.tenant, {
    serviceName: "product",
    field: "tenant",
    entity: "Product",
    linkable: "product",
    primaryKey: "id",
})

// YANLIŞ ❌ (Cyclic dependency hatası verir)
defineLink(TenantModule.linkable.tenant, ProductModule.linkable.product)
```

---

### 4. n8n AI Orchestration Bridge

**Tanım:** LLM çağrılarını n8n webhook'una yönlendiren köprü servisi. n8n tarafında SQL grounding, AI Agent ve validation loop çalışır.

**Yeni Servis:** `src/lib/n8n-bridge.ts`

```typescript
export class N8nBridgeService {
    async chat(request: N8nChatRequest): Promise<N8nChatResponse>
    // n8n tarafında:
    // 1. Intent extraction
    // 2. SQL grounding (ürün + stok + fiyat)
    // 3. AI Agent (Gemini)
    // 4. Validation Check (ürün ID, fiyat, JSON)
    // 5. Retry loop (max 3)
}
```

**Environment Değişkenleri:**
```env
N8N_BRIDGE_ENABLED=true
N8N_WEBHOOK_URL=http://n8n:5678
N8N_CHAT_WEBHOOK_PATH=/webhook/ayna-grounded-chat
N8N_TIMEOUT_MS=30000
```

**n8n Workflow:** `n8n/workflows/hallucination-killer-agent.json`
- SQL templates: `n8n/sql-templates/` altında 5 şablon
- Hallucination prevention ile doğrulanmış yanıtlar

---

### 5. Admin Tenant RBAC

**Yeni Middleware:** `src/api/middlewares/admin-tenant-rbac.ts`

Admin kullanıcılarını kendi mağazalarıyla sınırlar. Super admin hariç tüm admin kullanıcıları sadece kendi tenant'larının verilerine erişebilir.

**Kullanım:**
```typescript
{
    matcher: "/admin/products*",
    middlewares: [authenticate("admin"), adminTenantRbac],
},
{
    matcher: "/admin/orders*",
    middlewares: [authenticate("admin"), adminTenantRbac],
},
```

---

## 🟠 B — YÜKSEK ÖNEMLİ GÜNCELLEMELER

### 6. Tenant Resolver Middleware

**Yeni Dosya:** `src/api/middlewares/tenant-resolver.ts`

Gelen isteğin hangi tenant'a ait olduğunu belirler. Çözümleme sırası:
1. `x-tenant-id` header (öncelikli)
2. `x-tenant-slug` header (storefront proxy)
3. Host header (özel domain)

**Fail-Open prensibi:** Tenant bulunamazsa istek reddedilmez, sadece `req.tenant = null` olur.

---

### 7. Storefront Tenant Scoper

**Yeni Dosya:** `src/api/middlewares/storefront-tenant-scoper.ts`

Storefront'tan gelen isteklerde Sales Channel ve API Key enjeksiyonu yapar.

---

### 8. Medusa Config Güncellemesi

**Değişiklik:** `medusa-config.ts`

```typescript
modules: {
    // ... existing modules
    tenant: {
        resolve: "./src/modules/tenant",
    },
}
```

---

## 🟡 C — DOKÜMANTASYON GÜNCELLEMELERİ

### 9. Developer Onboarding Guide Güncellendi

`docs/GENESIS_PROTOCOL/15_DEVELOPER_ONBOARDING.md` dosyasına multi-tenant mimarisi bilgisi eklendi.

---

## 📁 Değiştirilen/Eklenen Dosyalar

| Dosya | Durum | Açıklama |
|-------|-------|----------|
| `src/modules/tenant/index.ts` | YENİ | Tenant modül entry point |
| `src/modules/tenant/service.ts` | YENİ | Tenant CRUD servisi |
| `src/modules/tenant/models/tenant.ts` | YENİ | Tenant DML modeli |
| `src/modules/tenant/migrations/Migration20260501180000.ts` | YENİ | İlk tenant migration |
| `src/modules/tenant/migrations/Migration20260513000000.ts` | YENİ | Entity migration |
| `src/modules/tenant/migrations/Migration20260513120000.ts` | YENİ | RLS migration |
| `src/modules/tenant/loaders/tenant-isolation-filter.ts` | YENİ | Global filter loader |
| `src/modules/tenant/loaders/tenant-rls-subscriber.ts` | YENİ | RLS subscriber loader |
| `src/modules/tenant/services/tenant-business.service.ts` | YENİ | İş mantığı servisi |
| `src/modules/tenant/types.ts` | YENİ | TypeScript tipleri |
| `src/modules/tenant/subscribers/tenant-rls.subscriber.ts` | YENİ | RLS event subscriber |
| `src/api/middlewares/tenant-context.ts` | YENİ | Tenant context middleware |
| `src/api/middlewares/tenant-als.ts` | YENİ | AsyncLocalStorage middleware |
| `src/api/middlewares/tenant-db-guard.ts` | YENİ | Database guard middleware |
| `src/api/middlewares/tenant-resolver.ts` | YENİ | Tenant resolver middleware |
| `src/api/middlewares/admin-tenant-rbac.ts` | YENİ | Admin RBAC middleware |
| `src/api/middlewares/storefront-tenant-scoper.ts` | YENİ | Storefront scoper |
| `src/api/middlewares.ts` | GÜNCELLENDİ | Yeni middleware'ler eklendi |
| `src/api/admin/tenants/route.ts` | YENİ | Tenant listesi/oluşturma |
| `src/api/admin/tenants/[id]/route.ts` | YENİ | Tek tenant detayı |
| `src/api/admin/tenants/[id]/activate/route.ts` | YENİ | Tenant aktif etme |
| `src/api/admin/tenants/[id]/deactivate/route.ts` | YENİ | Tenant pasif etme |
| `src/api/admin/tenants/[id]/products/route.ts` | YENİ | Tenant ürünleri |
| `src/api/admin/tenants/[id]/products/[productId]/route.ts` | YENİ | Tek ürün detayı |
| `src/api/admin/tenants/[id]/stats/route.ts` | YENİ | Tenant istatistikleri |
| `src/api/admin/tenants/[id]/orders/route.ts` | YENİ | Tenant siparişleri |
| `src/api/admin/tenants/[id]/customers/route.ts` | YENİ | Tenant müşterileri |
| `src/api/store/tenant/route.ts` | YENİ | Store tenant info |
| `src/api/store/tenant/products/route.ts` | YENİ | Store tenant products |
| `src/links/tenant-customer.ts` | YENİ | Tenant-Customer link |
| `src/links/tenant-order.ts` | YENİ | Tenant-Order link |
| `src/links/tenant-product.ts` | YENİ | Tenant-Product link |
| `src/links/tenant-api-key.ts` | YENİ | Tenant-API Key link |
| `src/links/tenant-stock-location.ts` | YENİ | Tenant-Stock Location link |
| `src/links/tenant-sales-channel.ts` | YENİ | Tenant-Sales Channel link |
| `src/workflows/create-tenant.ts` | YENİ | Tenant oluşturma workflow |
| `src/workflows/link-entity-to-tenant.ts` | YENİ | Entity-tenant linking workflow |
| `src/subscribers/tenant-entity-linker.ts` | YENİ | Entity linking subscriber |
| `src/lib/n8n-bridge.ts` | YENİ | n8n orchestration bridge |
| `medusa-config.ts` | GÜNCELLENDİ | Tenant modülü eklendi |
| `n8n/workflows/hallucination-killer-agent.json` | YENİ | AI validation workflow |
| `n8n/sql-templates/01-products.sql` | YENİ | Ürün arama SQL |
| `n8n/sql-templates/02-inventory.sql` | YENİ | Stok kontrol SQL |
| `n8n/sql-templates/03-orders.sql` | YENİ | Sipariş SQL |
| `n8n/sql-templates/04-customers.sql` | YENİ | Müşteri SQL |
| `n8n/sql-templates/05-composite-context.sql` | YENİ | Composite context SQL |
| `docker/init-n8n-db.sql` | YENİ | n8n database init |
| `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` | GÜNCELLENDİ | Tenant modülü eklendi |

---

## ⚠️ Breaking Changes

| Değişiklik | Etki | Aksiyon |
|-----------|------|---------|
| Yeni middleware zinciri | Tüm `/store/*` ve `/admin/*` route'ları artık tenant context gerektiriyor | `.env`'de `N8N_BRIDGE_ENABLED` gibi değişkenleri kontrol edin |
| Tenant modülü migration'ları | `npm run db:migrate` ile yeni tablolar oluşturulacak | Migration sonrası tenant oluşturma endpoint'ini kullanın |
| Link tanımları explicit configuration kullanıyor | Eski link tanımları cyclic dependency hatası verebilir | Yeni pattern'ı kullanın |

---

## ✅ Doğrulama

1. **Build Testi:** `npx tsc --noEmit` — 0 hata
2. **Migration Testi:** `npm run db:migrate` — başarıyla tamamlandı
3. **Runtime Testi:** Docker container başlatıldı, tenant endpoint'leri çalışıyor
4. **Entegrasyon Testi:** Diğer modüllerle çakışma yok

---

## 📊 Sonraki Adımlar

### Phase 1: Multi-Tenant İyileştirmeler
- [ ] Tenant dashboard (admin UI)
- [ ] Tenant-specific pricing rules
- [ ] Tenant onboarding wizard

### Phase 2: n8n Optimization
- [ ] Caching layer for SQL queries
- [ ] Rate limiting per tenant
- [ ] Fallback mechanism when n8n is down

### Phase 3: Production Readiness
- [ ] Tenant usage analytics
- [ ] Billing/subscription per tenant
- [ ] Automated tenant provisioning

---

*Bu changelog otomatik olarak oluşturulmuştur.*