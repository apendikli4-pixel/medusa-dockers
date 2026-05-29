import { defineMiddlewares, authenticate } from "@medusajs/framework/http"
import { startRateLimitCleanup } from "../lib/rate-limiter"
import { promptSecurityMiddleware } from "./middlewares/prompt-security"

// ─── TENANT İZOLASYON KATMANLARI (4 Aşamalı) ───
// 1. tenantContextMiddleware: Fail-Closed çekirdek kapı (tenant çözümlenemezse → 400)
// 2. tenantAlsMiddleware: AsyncLocalStorage ile tenant context'i tüm async zincire yayar
// 3. tenantDbGuardMiddleware: currentTenantId'yi Awilix scope'a kaydeder (geriye uyumluluk)
// 4. storefrontTenantScoper: Sales Channel / API Key enjeksiyonu
// 5. adminTenantRbac: Admin kullanıcılarını kendi mağazalarıyla sınırlandırma
import { tenantContextMiddleware } from "./middlewares/tenant-context"
import { tenantAlsMiddleware } from "./middlewares/tenant-als"
import { tenantDbGuardMiddleware } from "./middlewares/tenant-db-guard"
import { storefrontTenantScoper } from "./middlewares/storefront-tenant-scoper"
import { adminTenantRbac } from "./middlewares/admin-tenant-rbac"

// Rate Limiter temizleyiciyi başlat (Memory Leak önlemi)
startRateLimitCleanup(60000)

/**
 * API Middleware Tanımları — SaaS Veri İzolasyonu
 *
 * Sıralama önemlidir — üstteki middleware'ler önce çalışır:
 *   1. Tenant Context (FAIL-CLOSED — hangi mağaza?) → auth'dan önce
 *      - tenant_id tespit edilemezse → 400 Bad Request
 *      - tenant pasif ise → 403 Forbidden
 *      - Awilix scope'a immutable "tenantContext" kaydedilir
 *   2. Tenant ALS — AsyncLocalStorage ile tüm async zincire tenant_id yayar
 *      - MikroORM EventSubscriber getTenantId() ile ALS'den okur
 *      - Transaction başlangıcında SET LOCAL uygular
 *   3. Tenant DB Guard — currentTenantId'yi Awilix scope'a kaydeder
 *      - Geriye uyumluluk için korunuyor (eski kodlar scope'tan okuyabilir)
 *   4. Auth (kim bu kullanıcı?)
 *   5. Route-specific middleware'ler (prompt security, RBAC vb.)
 *
 * Tüm /admin/* route'ları Medusa admin auth ile korunur.
 * /store/* route'ları opsiyonel müşteri auth ile çalışır.
 *
 * MİMARİ NOT: tenantContextMiddleware kendi içinde muaf path listesi tutar.
 * /health, /admin/auth, /admin/tenants gibi endpoint'ler otomatik atlanır.
 */
export default defineMiddlewares({
    routes: [
        // ─── TENANT İZOLASYON ZİNCİRİ ───
        // Sıra: Context → ALS → DB Guard → Scoper
        // Auth'dan ÖNCE çalışır. Tenant çözümlenemezse istek bloke edilir.
        {
            matcher: "/store/*",
            middlewares: [tenantContextMiddleware, tenantAlsMiddleware, tenantDbGuardMiddleware, storefrontTenantScoper],
        },
        {
            matcher: "/admin/*",
            middlewares: [tenantContextMiddleware, tenantAlsMiddleware, tenantDbGuardMiddleware],
        },
        // ─── ADMIN RBAC KORUMASI ───
        // NOT: Medusa V2 /admin/* için built-in authenticate guard zaten
        // uyguluyor (defineMiddlewares ile registered authenticate ÜSTÜNE
        // bindirildiğinde 401 sebep oluyor). Kendi authenticate'imizi
        // tekrar eklemeyip sadece RBAC ek katmanı koyuyoruz.
        {
            matcher: "/admin/products*",
            middlewares: [adminTenantRbac],
        },
        {
            matcher: "/admin/orders*",
            middlewares: [adminTenantRbac],
        },
        // Store route'ları — müşteri auth zorunlu
        {
            matcher: "/store/wishlist*",
            middlewares: [authenticate("customer", ["bearer", "session"])],
        },
        {
            matcher: "/store/subscriptions*",
            middlewares: [authenticate("customer", ["bearer", "session"])],
        },
        {
            matcher: "/store/loyalty*",
            middlewares: [authenticate("customer", ["bearer", "session"])],
        },
        {
            matcher: "/store/conscience*",
            middlewares: [authenticate("customer", ["bearer", "session"])],
        },
        // Store route'ları — müşteri auth opsiyonel (customerId için)
        {
            matcher: "/store/ayna*",
            middlewares: [
                authenticate("customer", ["bearer", "session"], { allowUnauthenticated: true }),
                promptSecurityMiddleware
            ],
        },
        {
            matcher: "/store/expert-agent*",
            middlewares: [authenticate("customer", ["bearer", "session"], { allowUnauthenticated: true })],
        },
    ],
})
